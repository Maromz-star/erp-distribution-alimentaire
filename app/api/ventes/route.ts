import { genererNumeroFacture } from "@/lib/numerotation";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { routeApi, corpsJSON, pagination, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";
import { journaliser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const schemaLigne = z.object({
  produitId: z.string().min(1),
  quantite: z.coerce.number().positive("La quantite doit etre superieure a 0"),
  remisePct: z.coerce.number().min(0).max(100).default(0),
  // Le prix unitaire est optionnel a la saisie : si absent, on reprend le
  // prix de vente actuel du produit (ou son prix promo si applicable).
  prixUnitaire: z.coerce.number().nonnegative().optional(),
});

const schemaVente = z.object({
  clientId: z.string().min(1, "Client requis"),
  lignes: z.array(schemaLigne).min(1, "Au moins un produit est requis"),
  commentaires: z.string().optional().nullable(),
  // Reglement immediat optionnel (ex: vente comptant payee sur place)
  reglementImmediat: z
    .object({
      montant: z.coerce.number().positive(),
      mode: z.enum(["ESPECES", "VIREMENT", "CHEQUE", "TRAITE", "CARTE_BANCAIRE"]),
      reference: z.string().optional().nullable(),
    })
    .optional(),
});

export async function GET(req: NextRequest) {
  const { role } = utilisateurCourant(req);
  exigerPermission(role, "ventes.lire");

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const statut = searchParams.get("statut");
  const du = searchParams.get("du");
  const au = searchParams.get("au");
  const { skip, take, page, taille } = pagination(req);

  const filtre: Prisma.VenteWhereInput = {
    AND: [
      clientId ? { clientId } : {},
      statut ? { statut: statut as any } : {},
      du || au
        ? {
            creeLe: {
              ...(du ? { gte: new Date(du) } : {}),
              ...(au ? { lte: new Date(au) } : {}),
            },
          }
        : {},
    ],
  };

  const [ventes, total] = await Promise.all([
    db.vente.findMany({
      where: filtre,
      include: { client: { select: { nom: true, societe: true } }, utilisateur: { select: { nom: true } } },
      orderBy: { creeLe: "desc" },
      skip,
      take,
    }),
    db.vente.count({ where: filtre }),
  ]);

  return NextResponse.json({
    donnees: ventes,
    pagination: { page, taille, total, pages: Math.ceil(total / taille) },
  });
}

// POST /api/ventes - créé la vente, décrémente le stock, génère la facture.
// Tout se passe dans UNE transaction Prisma : si une seule ligne echoue
// (ex: stock insuffisant), rien n'est enregistre - ni la vente, ni les
// mouvements de stock. C'est la garantie centrale de coherence du module.
export const POST = routeApi(async (request) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "ventes.ecrire");

  const donnees = schemaVente.parse(await corpsJSON(request));

  const resultat = await db.$transaction(async (tx) => {
    const numeroFacture = await genererNumeroFacture(tx);

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
        throw new Error(
          `Stock insuffisant pour "${produit.nom}" : disponible ${stockDisponible} ${produit.unite}, demande ${ligne.quantite}`
        );
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
          reference: numeroFacture,
          utilisateurId: userId,
        },
      });
    }

    const montantPaye = donnees.reglementImmediat?.montant ?? 0;

    const vente = await tx.vente.create({
      data: {
        numeroFacture,
        clientId: donnees.clientId,
        utilisateurId: userId,
        sousTotalHT,
        totalRemise,
        totalTVA,
        totalTTC,
        montantPaye,
        statut: "VALIDEE",
        commentaires: donnees.commentaires,
        lignes: { create: lignesPreparees },
      },
      include: { lignes: { include: { produit: true } }, client: true },
    });

    if (donnees.reglementImmediat) {
      await tx.reglement.create({
        data: {
          clientId: donnees.clientId,
          venteId: vente.id,
          utilisateurId: userId,
          montant: donnees.reglementImmediat.montant,
          mode: donnees.reglementImmediat.mode,
          reference: donnees.reglementImmediat.reference,
        },
      });
    }

    return vente;
  });

  await journaliser(userId, "VENTE_CREEE", `Vente#${resultat.id}`, {
    numeroFacture: resultat.numeroFacture,
    totalTTC: resultat.totalTTC,
  });

  return NextResponse.json({ donnees: resultat }, { status: 201 });
});