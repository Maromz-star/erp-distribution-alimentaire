import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routeApi, utilisateurCourant } from "@/lib/api-helpers";

// GET /api/recherche?q=texte -> resultats groupes par type, 5 max chacun.
// Une recherche "instantanee" cote frontend (debounce ~250ms) tape directement
// cet endpoint plutot que d'avoir un index de recherche dedie (Elasticsearch...),
// suffisant pour le volume de donnees d'une PME de distribution.
export const GET = routeApi(async (request) => {
  const { userId } = utilisateurCourant(request); // s'assure juste que l'utilisateur est authentifie
  void userId;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ donnees: { produits: [], clients: [], fournisseurs: [], ventes: [], livraisons: [] } });
  }

  const [produits, clients, fournisseurs, ventes, livraisons] = await Promise.all([
    db.produit.findMany({
      where: {
        OR: [
          { nom: { contains: q, mode: "insensitive" } },
          { codeProduit: { contains: q, mode: "insensitive" } },
          { codeBarre: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, nom: true, codeProduit: true },
    }),
    db.client.findMany({
      where: { OR: [{ nom: { contains: q, mode: "insensitive" } }, { societe: { contains: q, mode: "insensitive" } }] },
      take: 5,
      select: { id: true, nom: true, societe: true },
    }),
    db.fournisseur.findMany({
      where: { OR: [{ nom: { contains: q, mode: "insensitive" } }, { societe: { contains: q, mode: "insensitive" } }] },
      take: 5,
      select: { id: true, nom: true, societe: true },
    }),
    db.vente.findMany({
      where: { numeroFacture: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, numeroFacture: true, totalTTC: true, client: { select: { nom: true } } },
    }),
    db.livraison.findMany({
      where: { numeroBon: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, numeroBon: true, totalTTC: true, fournisseur: { select: { nom: true } } },
    }),
  ]);

  return NextResponse.json({ donnees: { produits, clients, fournisseurs, ventes, livraisons } });
});
