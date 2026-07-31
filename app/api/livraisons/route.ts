import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { routeApi, corpsJSON, pagination, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";
import { journaliser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const schemaLigne = z.object({
  produitId: z.string().min(1),
  quantite: z.coerce.number().positive(),
  prixAchat: z.coerce.number().nonnegative(),
});

const schemaLivraison = z.object({
  fournisseurId: z.string().min(1, "Fournisseur requis"),
  numeroBon: z.string().min(1, "Numero de bon requis"),
  dateLivraison: z.coerce.date().optional(),
  lignes: z.array(schemaLigne).min(1, "Au moins un produit est requis"),
  commentaires: z.string().optional().nullable(),
  paiementImmediat: z
    .object({
      montant: z.coerce.number().positive(),
      mode: z.enum(["ESPECES", "VIREMENT", "CHEQUE", "TRAITE", "CARTE_BANCAIRE"]),
      reference: z.string().optional().nullable(),
    })
    .optional(),
});

export const GET = routeApi(async (request) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "livraisons.lire");

  const { searchParams } = new URL(request.url);
  const fournisseurId = searchParams.get("fournisseurId");
  const { skip, take, page, taille } = pagination(request);

  const filtre: Prisma.LivraisonWhereInput = fournisseurId ? { fournisseurId } : {};

  const [livraisons, total] = await Promise.all([
    db.livraison.findMany({
      where: filtre,
      include: { fournisseur: { select: { nom: true, societe: true } } },
      orderBy: { dateLivraison: "desc" },
      skip,
      take,
    }),
    db.livraison.count({ where: filtre }),
  ]);

  return NextResponse.json({
    donnees: livraisons,
    pagination: { page, taille, total, pages: Math.ceil(total / taille) },
  });
});

// POST /api/livraisons - la validation d'une livraison augmente automatiquement
// le stock de chaque produit recu (cf. cahier des charges "Livraisons fournisseurs").
export const POST = routeApi(async (request) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "livraisons.ecrire");

  const corps = schemaLivraison.parse(await corpsJSON(request));

  const resultat = await db.$transaction(async (tx) => {
    const produits = await tx.produit.findMany({
      where: { id: { in: corps.lignes.map((l) => l.produitId) } },
    });
    const produitParId = new Map(produits.map((p) => [p.id, p]));

    let totalHT = 0;
    const lignesPreparees = [];

    for (const ligne of corps.lignes) {
      const produit = produitParId.get(ligne.produitId);
      if (!produit) throw new Error(`Produit introuvable : ${ligne.produitId}`);

      const totalLigne = ligne.prixAchat * ligne.quantite;
      totalHT += totalLigne;
      lignesPreparees.push({
        produitId: produit.id,
        quantite: ligne.quantite,
        prixAchat: ligne.prixAchat,
        totalLigne,
      });

      const nouveauStock = Number(produit.quantiteStock) + ligne.quantite;
      await tx.produit.update({
        where: { id: produit.id },
        // On met aussi a jour le prix d'achat courant du produit, pour que
        // les prochaines marges se calculent sur le cout le plus recent.
        data: { quantiteStock: nouveauStock, prixAchat: ligne.prixAchat },
      });
      await tx.mouvementStock.create({
        data: {
          produitId: produit.id,
          type: "ENTREE_LIVRAISON",
          quantite: ligne.quantite,
          stockApres: nouveauStock,
          reference: corps.numeroBon,
          utilisateurId: userId,
        },
      });
    }

    // TVA non geree ligne a ligne pour les achats dans ce module (le taux de
    // TVA d'achat est en general contractuel avec le fournisseur) : totalTTC
    // = totalHT ici par simplicite. A affiner si les factures fournisseurs
    // distinguent HT/TVA/TTC dans votre comptabilite.
    const totalTTC = totalHT;
    const montantPaye = corps.paiementImmediat?.montant ?? 0;

    const livraison = await tx.livraison.create({
      data: {
        numeroBon: corps.numeroBon,
        fournisseurId: corps.fournisseurId,
        utilisateurId: userId,
        dateLivraison: corps.dateLivraison ?? new Date(),
        totalHT,
        totalTTC,
        montantPaye,
        statut: "VALIDEE",
        commentaires: corps.commentaires,
        lignes: { create: lignesPreparees },
      },
      include: { lignes: { include: { produit: true } }, fournisseur: true },
    });

    if (corps.paiementImmediat) {
      await tx.paiementFournisseur.create({
        data: {
          fournisseurId: corps.fournisseurId,
          livraisonId: livraison.id,
          utilisateurId: userId,
          montant: corps.paiementImmediat.montant,
          mode: corps.paiementImmediat.mode,
          reference: corps.paiementImmediat.reference,
        },
      });
    }

    return livraison;
  });

  await journaliser(userId, "LIVRAISON_CREEE", `Livraison#${resultat.id}`, {
    numeroBon: resultat.numeroBon,
  });

  return NextResponse.json({ donnees: resultat }, { status: 201 });
});
