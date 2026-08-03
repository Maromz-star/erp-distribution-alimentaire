import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routeApi, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";

type Contexte = { params: { id: string } };

export const GET = routeApi(async (request: NextRequest, { params }: Contexte) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "facturesFournisseurs.lire");

  const facture = await db.factureFournisseur.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      fournisseur: true,
      utilisateur: { select: { nom: true } },
      livraison: { select: { id: true, numeroBon: true } },
      lignes: { include: { produit: { select: { nom: true, codeProduit: true, unite: true } } } },
    },
  });

  const solde = Number(facture.totalTTC) - Number(facture.montantPaye);

  return NextResponse.json({ donnees: { ...facture, solde } });
});
