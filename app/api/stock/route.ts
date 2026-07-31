import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routeApi, pagination, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

// GET /api/stock?produitId=&type=&page=&taille= -> journal des mouvements
export const GET = routeApi(async (request) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "stock.lire");

  const { searchParams } = new URL(request.url);
  const produitId = searchParams.get("produitId");
  const type = searchParams.get("type");
  const { skip, take, page, taille } = pagination(request, 50);

  const filtre: Prisma.MouvementStockWhereInput = {
    AND: [produitId ? { produitId } : {}, type ? { type: type as any } : {}],
  };

  const [mouvements, total] = await Promise.all([
    db.mouvementStock.findMany({
      where: filtre,
      include: { produit: { select: { nom: true, codeProduit: true, unite: true } }, utilisateur: { select: { nom: true } } },
      orderBy: { creeLe: "desc" },
      skip,
      take,
    }),
    db.mouvementStock.count({ where: filtre }),
  ]);

  return NextResponse.json({
    donnees: mouvements,
    pagination: { page, taille, total, pages: Math.ceil(total / taille) },
  });
});
