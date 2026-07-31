import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routeApi, pagination, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

// GET /api/ventes - historique des factures (lecture seule).
//
// IMPORTANT : il n'y a PAS de POST sur cette route. Une facture ne peut plus
// etre creee directement depuis une simple liste de lignes : elle doit
// obligatoirement provenir d'un bon de livraison client deja emis. Voir
// POST /api/bons-livraison-client (creation du bon) puis
// POST /api/bons-livraison-client/[id]/facturer (emission de la facture).
export const GET = routeApi(async (request: NextRequest) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "ventes.lire");

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const statut = searchParams.get("statut");
  const du = searchParams.get("du");
  const au = searchParams.get("au");
  const { skip, take, page, taille } = pagination(request);

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
      include: {
        client: { select: { nom: true, societe: true } },
        utilisateur: { select: { nom: true } },
        bonLivraisonClient: { select: { numeroBon: true, numeroSerie: true } },
      },
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
});
