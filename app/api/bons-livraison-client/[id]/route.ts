import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routeApi, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";

type Contexte = { params: { id: string } };

export const GET = routeApi(async (request: NextRequest, { params }: Contexte) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "bonsLivraisonClient.lire");

  const bon = await db.bonLivraisonClient.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      client: true,
      utilisateur: { select: { nom: true } },
      lignes: { include: { produit: { select: { nom: true, codeProduit: true, unite: true } } } },
      vente: { select: { id: true, numeroFacture: true } },
    },
  });

  return NextResponse.json({ donnees: bon });
});
