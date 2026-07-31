import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { routeApi, corpsJSON, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";
import { journaliser } from "@/lib/auth";

const schemaMiseAJour = z.object({
  codeProduit: z.string().min(1).optional(),
  codeBarre: z.string().optional().nullable(),
  nom: z.string().min(1).optional(),
  categorieId: z.string().optional().nullable(),
  sousCategorieId: z.string().optional().nullable(),
  marqueId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  photoPrincipale: z.string().optional().nullable(),
  prixAchat: z.coerce.number().nonnegative().optional(),
  prixVente: z.coerce.number().nonnegative().optional(),
  prixPromo: z.coerce.number().nonnegative().optional().nullable(),
  tauxTVA: z.coerce.number().min(0).max(100).optional(),
  unite: z.string().optional(),
  stockMin: z.coerce.number().nonnegative().optional(),
  stockMax: z.coerce.number().nonnegative().optional().nullable(),
  emplacement: z.string().optional().nullable(),
  fournisseurPrincipalId: z.string().optional().nullable(),
  datePeremption: z.coerce.date().optional().nullable(),
  statut: z.enum(["ACTIF", "INACTIF", "ARCHIVE"]).optional(),
});
// Note : quantiteStock n'est volontairement pas modifiable ici. Le stock ne
// doit changer que via un mouvement trace (livraison, vente, ajustement) -
// voir /api/stock/ajustement - jamais par une simple edition de fiche produit,
// pour que l'historique reste la source de verite exacte du stock.

type Contexte = { params: { id: string } };

export const GET = routeApi(async (request: NextRequest, { params }: Contexte) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "produits.lire");

  const produit = await db.produit.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      categorie: true,
      sousCategorie: true,
      marque: true,
      fournisseurPrincipal: true,
      photos: { orderBy: { ordre: "asc" } },
      mouvements: { orderBy: { creeLe: "desc" }, take: 50 },
    },
  });

  return NextResponse.json({ donnees: produit });
});

export const PUT = routeApi(async (request: NextRequest, { params }: Contexte) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "produits.ecrire");

  const donnees = schemaMiseAJour.parse(await corpsJSON(request));

  const produit = await db.produit.update({
    where: { id: params.id },
    data: donnees,
  });

  await journaliser(userId, "PRODUIT_MODIFIE", `Produit#${produit.id}`);

  return NextResponse.json({ donnees: produit });
});

export const DELETE = routeApi(async (request: NextRequest, { params }: Contexte) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "produits.ecrire");

  // Suppression douce (statut ARCHIVE) plutot que suppression physique :
  // un produit peut etre reference par des annees de ventes/livraisons
  // historiques qui doivent rester consultables.
  const produit = await db.produit.update({
    where: { id: params.id },
    data: { statut: "ARCHIVE" },
  });

  await journaliser(userId, "PRODUIT_ARCHIVE", `Produit#${produit.id}`);

  return NextResponse.json({ donnees: produit });
});
