import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { routeApi, corpsJSON, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";
import { journaliser } from "@/lib/auth";

const schemaMiseAJour = z.object({
  nom: z.string().min(1).optional(),
  societe: z.string().optional().nullable(),
  telephone: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  adresse: z.string().optional().nullable(),
  ville: z.string().optional().nullable(),
  pays: z.string().optional().nullable(),
  ice: z.string().optional().nullable(),
  identifiantFiscal: z.string().optional().nullable(),
  registreCommerce: z.string().optional().nullable(),
  personneContact: z.string().optional().nullable(),
  plafondCredit: z.coerce.number().nonnegative().optional().nullable(),
  commentaires: z.string().optional().nullable(),
  actif: z.boolean().optional(),
});

type Contexte = { params: { id: string } };

// GET /api/clients/[id] -> fiche client complete : ventes, factures, reglements,
// solde, derniere commande, produits les plus achetes.
export const GET = routeApi(async (request: NextRequest, { params }: Contexte) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "clients.lire");

  const client = await db.client.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      ventes: {
        orderBy: { creeLe: "desc" },
        include: { lignes: { include: { produit: { select: { nom: true } } } } },
      },
      reglements: { orderBy: { dateReglement: "desc" } },
    },
  });

  const totalAchete = client.ventes.reduce((s, v) => s + Number(v.totalTTC), 0);
  const totalPaye = client.ventes.reduce((s, v) => s + Number(v.montantPaye), 0);
  const derniereCommande = client.ventes[0] ?? null;

  // Top produits achetes par ce client (quantite cumulee), calcule en memoire :
  // le volume par client reste petit (quelques centaines de lignes au plus),
  // ce qui rend un group-by SQL dedie inutile a ce stade.
  const quantitesParProduit = new Map<string, { nom: string; quantite: number }>();
  for (const vente of client.ventes) {
    for (const ligne of vente.lignes) {
      const cle = ligne.produitId;
      const entree = quantitesParProduit.get(cle) ?? { nom: ligne.produit.nom, quantite: 0 };
      entree.quantite += Number(ligne.quantite);
      quantitesParProduit.set(cle, entree);
    }
  }
  const produitsPlusAchetes = [...quantitesParProduit.values()]
    .sort((a, b) => b.quantite - a.quantite)
    .slice(0, 5);

  return NextResponse.json({
    donnees: {
      ...client,
      totalAchete,
      totalPaye,
      solde: totalAchete - totalPaye,
      derniereCommande,
      produitsPlusAchetes,
    },
  });
});

export const PUT = routeApi(async (request: NextRequest, { params }: Contexte) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "clients.ecrire");

  const donnees = schemaMiseAJour.parse(await corpsJSON(request));
  const client = await db.client.update({ where: { id: params.id }, data: donnees });

  await journaliser(userId, "CLIENT_MODIFIE", `Client#${client.id}`);

  return NextResponse.json({ donnees: client });
});

export const DELETE = routeApi(async (request: NextRequest, { params }: Contexte) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "clients.ecrire");

  // Desactivation douce : un client avec un historique de ventes ne doit
  // jamais etre supprime physiquement (integrite des factures passees).
  const client = await db.client.update({
    where: { id: params.id },
    data: { actif: false },
  });

  await journaliser(userId, "CLIENT_DESACTIVE", `Client#${client.id}`);

  return NextResponse.json({ donnees: client });
});
