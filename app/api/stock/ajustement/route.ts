import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { routeApi, corpsJSON, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";
import { journaliser } from "@/lib/auth";

// Un ajustement corrige le stock suite a un inventaire physique (casse,
// erreur de comptage, peremption...). C'est le SEUL moyen autorise de
// modifier quantiteStock en dehors d'une vente ou d'une livraison.
const schemaAjustement = z.object({
  produitId: z.string().min(1),
  nouvelleQuantite: z.coerce.number().nonnegative(),
  motif: z.string().min(1, "Le motif de l'ajustement est requis"),
});

export const POST = routeApi(async (request) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "stock.ecrire");

  const { produitId, nouvelleQuantite, motif } = schemaAjustement.parse(
    await corpsJSON(request)
  );

  const resultat = await db.$transaction(async (tx) => {
    const produit = await tx.produit.findUniqueOrThrow({ where: { id: produitId } });
    const ecart = nouvelleQuantite - Number(produit.quantiteStock);

    if (ecart === 0) {
      return { produit, mouvement: null };
    }

    const produitMisAJour = await tx.produit.update({
      where: { id: produitId },
      data: { quantiteStock: nouvelleQuantite },
    });

    const mouvement = await tx.mouvementStock.create({
      data: {
        produitId,
        type: ecart > 0 ? "AJUSTEMENT_POSITIF" : "AJUSTEMENT_NEGATIF",
        quantite: Math.abs(ecart),
        stockApres: nouvelleQuantite,
        motif,
        utilisateurId: userId,
      },
    });

    return { produit: produitMisAJour, mouvement };
  });

  await journaliser(userId, "STOCK_AJUSTE", `Produit#${produitId}`, { motif, nouvelleQuantite });

  return NextResponse.json({ donnees: resultat });
});
