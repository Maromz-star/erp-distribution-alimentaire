import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { routeApi, corpsJSON, pagination, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";
import { journaliser } from "@/lib/auth";
import { genererNumeroBonLivraison } from "@/lib/numerotation";
import type { Prisma } from "@prisma/client";

const schemaLigne = z.object({
  produitId: z.string().min(1, "Produit requis"),
  quantite: z.coerce.number().positive("La quantite doit etre superieure a 0"),
  remisePct: z.coerce.number().min(0).max(100).default(0),
  prixUnitaire: z.coerce.number().nonnegative().optional(),
});

const schemaBon = z.object({
  clientId: z.string().min(1, "Client requis"),
  dateLivraison: z.coerce.date().optional(),
  lignes: z.array(schemaLigne).min(1, "Au moins un produit est requis"),
  commentaires: z.string().optional().nullable(),
});

// GET /api/bons-livraison-client - liste des bons de livraison client.
export const GET = routeApi(async (request: NextRequest) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "bonsLivraisonClient.lire");

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const statut = searchParams.get("statut");
  const { skip, take, page, taille } = pagination(request);

  const filtre: Prisma.BonLivraisonClientWhereInput = {
    AND: [clientId ? { clientId } : {}, statut ? { statut: statut as any } : {}],
  };

  const [bons, total] = await Promise.all([
    db.bonLivraisonClient.findMany({
      where: filtre,
      include: {
        client: { select: { nom: true, societe: true } },
        utilisateur: { select: { nom: true } },
        vente: { select: { id: true, numeroFacture: true } },
      },
      orderBy: { creeLe: "desc" },
      skip,
      take,
    }),
    db.bonLivraisonClient.count({ where: filtre }),
  ]);

  return NextResponse.json({
    donnees: bons,
    pagination: { page, taille, total, pages: Math.ceil(total / taille) },
  });
});

// POST /api/bons-livraison-client - cree le bon de livraison et decremente le
// stock, dans UNE transaction (comme pour une vente classique). Ce bon ne
// genere PAS de facture : la facture ne pourra etre emise que plus tard,
// explicitement, a partir de ce bon (voir POST .../[id]/facturer), une fois
// que le bon aura ete emis. C'est la garantie centrale du nouveau flux :
// vente -> bon de livraison (numero de serie + numero de bon) -> facture.
export const POST = routeApi(async (request: NextRequest) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "bonsLivraisonClient.ecrire");

  const donnees = schemaBon.parse(await corpsJSON(request));

  const resultat = await db.$transaction(async (tx) => {
    const { numeroSerie, numeroBon } = await genererNumeroBonLivraison(tx);

    const produits = await tx.produit.findMany({
      where: { id: { in: donnees.lignes.map((l) => l.produitId) } },
    });
    const produitParId = new Map(produits.map((p) => [p.id, p]));

    let sousTotalHT = 0;
    let totalRemise = 0;
    let totalTVA = 0;
    let totalTTC = 0;
    const lignesPreparees = [];

    for (const ligne of donnees.lignes) {
      const produit = produitParId.get(ligne.produitId);
      if (!produit) {
        throw new Error(`Produit introuvable : ${ligne.produitId}`);
      }

      const stockDisponible = Number(produit.quantiteStock) - Number(produit.quantiteReservee);
      if (ligne.quantite > stockDisponible) {
        throw new Error(`Stock insuffisant pour ${produit.nom} (disponible : ${stockDisponible})`);
      }

      const prixUnitaire = ligne.prixUnitaire ?? Number(produit.prixPromo ?? produit.prixVente);
      const totalAvantRemise = prixUnitaire * ligne.quantite;
      const remise = totalAvantRemise * (ligne.remisePct / 100);
      const totalLigneHT = totalAvantRemise - remise;
      const tva = totalLigneHT * (Number(produit.tauxTVA) / 100);
      const totalLigneTTC = totalLigneHT + tva;

      sousTotalHT += totalAvantRemise;
      totalRemise += remise;
      totalTVA += tva;
      totalTTC += totalLigneTTC;

      lignesPreparees.push({
        produitId: produit.id,
        quantite: ligne.quantite,
        prixUnitaire,
        remisePct: ligne.remisePct,
        tauxTVA: produit.tauxTVA,
        totalLigneHT,
        totalLigneTTC,
      });

      const nouveauStock = Number(produit.quantiteStock) - ligne.quantite;
      await tx.produit.update({
        where: { id: produit.id },
        data: { quantiteStock: nouveauStock },
      });
      await tx.mouvementStock.create({
        data: {
          produitId: produit.id,
          type: "SORTIE_VENTE",
          quantite: ligne.quantite,
          stockApres: nouveauStock,
          reference: numeroBon,
          utilisateurId: userId,
        },
      });
    }

    const bon = await tx.bonLivraisonClient.create({
      data: {
        numeroSerie,
        numeroBon,
        clientId: donnees.clientId,
        utilisateurId: userId,
        dateLivraison: donnees.dateLivraison ?? new Date(),
        statut: "VALIDEE",
        commentaires: donnees.commentaires,
        sousTotalHT,
        totalRemise,
        totalTVA,
        totalTTC,
        lignes: { create: lignesPreparees },
      },
      include: { lignes: { include: { produit: true } }, client: true },
    });

    return bon;
  });

  await journaliser(userId, "BON_LIVRAISON_CREE", `BonLivraisonClient#${resultat.id}`, {
    numeroBon: resultat.numeroBon,
    totalTTC: resultat.totalTTC,
  });

  return NextResponse.json({ donnees: resultat }, { status: 201 });
});
