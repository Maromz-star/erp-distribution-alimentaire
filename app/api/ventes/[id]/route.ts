import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routeApi, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";

type Contexte = { params: { id: string } };

export const GET = routeApi(async (request: NextRequest, { params }: Contexte) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "ventes.lire");

  const vente = await db.vente.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      client: true,
      utilisateur: { select: { nom: true } },
      lignes: { include: { produit: { select: { nom: true, codeProduit: true, unite: true } } } },
      reglements: { orderBy: { dateReglement: "desc" } },
      bonLivraisonClient: { select: { id: true, numeroBon: true, numeroSerie: true } },
    },
  });

  const solde = Number(vente.totalTTC) - Number(vente.montantPaye);

  return NextResponse.json({ donnees: { ...vente, solde } });
});
