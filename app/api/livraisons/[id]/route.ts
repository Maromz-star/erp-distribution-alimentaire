import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routeApi, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";

type Contexte = { params: { id: string } };

export const GET = routeApi(async (request: NextRequest, { params }: Contexte) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "livraisons.lire");

  const livraison = await db.livraison.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      fournisseur: true,
      lignes: { include: { produit: { select: { nom: true, unite: true } } } },
      paiements: { orderBy: { datePaiement: "desc" } },
    },
  });

  return NextResponse.json({ donnees: livraison });
});
