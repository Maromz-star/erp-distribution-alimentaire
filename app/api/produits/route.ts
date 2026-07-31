import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { routeApi, corpsJSON, pagination, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";
import { journaliser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const schemaProduit = z.object({
  codeProduit: z.string().min(1, "Code produit requis"),
  codeBarre: z.string().optional().nullable(),
  nom: z.string().min(1, "Nom requis"),
  categorieId: z.string().optional().nullable(),
  sousCategorieId: z.string().optional().nullable(),
  marqueId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  photoPrincipale: z.string().optional().nullable(),
  photos: z.array(z.string()).optional().default([]),
  prixAchat: z.coerce.number().nonnegative(),
  prixVente: z.coerce.number().nonnegative(),
  prixPromo: z.coerce.number().nonnegative().optional().nullable(),
  tauxTVA: z.coerce.number().min(0).max(100).default(20),
  unite: z.string().default("unite"),
  quantiteStock: z.coerce.number().nonnegative().default(0),
  stockMin: z.coerce.number().nonnegative().default(0),
  stockMax: z.coerce.number().nonnegative().optional().nullable(),
  emplacement: z.string().optional().nullable(),
  fournisseurPrincipalId: z.string().optional().nullable(),
  datePeremption: z.coerce.date().optional().nullable(),
  statut: z.enum(["ACTIF", "INACTIF", "ARCHIVE"]).default("ACTIF"),
});

// GET /api/produits?recherche=&categorieId=&statut=&stockFaible=true&page=1&taille=20
export const GET = routeApi(async (request) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "produits.lire");

  const { searchParams } = new URL(request.url);
  const recherche = searchParams.get("recherche");
  const categorieId = searchParams.get("categorieId");
  const statut = searchParams.get("statut");
  const stockFaible = searchParams.get("stockFaible") === "true";
  const { skip, take, page, taille } = pagination(request);

  const filtre: Prisma.ProduitWhereInput = {
    AND: [
      recherche
        ? {
            OR: [
              { nom: { contains: recherche, mode: "insensitive" } },
              { codeProduit: { contains: recherche, mode: "insensitive" } },
              { codeBarre: { contains: recherche, mode: "insensitive" } },
            ],
          }
        : {},
      categorieId ? { categorieId } : {},
      statut ? { statut: statut as any } : {},
    ],
  };

  const [produits, total] = await Promise.all([
    db.produit.findMany({
      where: filtre,
      include: { categorie: true, sousCategorie: true, marque: true, fournisseurPrincipal: true },
      orderBy: { nom: "asc" },
      skip,
      take,
    }),
    db.produit.count({ where: filtre }),
  ]);

  // Le filtre "stock faible" compare deux colonnes (quantiteStock <= stockMin),
  // ce que Prisma ne sait pas exprimer directement en WHERE -> on filtre en memoire
  // sur la page courante. Pour un vrai volume de production, ceci deviendrait une
  // vue SQL ou un raw query ; documente comme limite connue dans le README.
  const resultats = stockFaible
    ? produits.filter((p) => Number(p.quantiteStock) <= Number(p.stockMin))
    : produits;

  return NextResponse.json({
    donnees: resultats,
    pagination: { page, taille, total, pages: Math.ceil(total / taille) },
  });
});

// POST /api/produits
export const POST = routeApi(async (request) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "produits.ecrire");

  const donnees = schemaProduit.parse(await corpsJSON(request));
  const { photos, ...champsProduit } = donnees;

  const produit = await db.produit.create({
    data: {
      ...champsProduit,
      photos: photos?.length
        ? { create: photos.map((url, ordre) => ({ url, ordre })) }
        : undefined,
    },
    include: { photos: true },
  });

  // Le stock initial saisi a la creation est trace comme un mouvement
  // d'inventaire, pour que l'historique du produit soit complet des le depart.
  if (Number(donnees.quantiteStock) > 0) {
    await db.mouvementStock.create({
      data: {
        produitId: produit.id,
        type: "INVENTAIRE",
        quantite: donnees.quantiteStock,
        stockApres: donnees.quantiteStock,
        utilisateurId: userId,
        motif: "Stock initial a la creation du produit",
      },
    });
  }

  await journaliser(userId, "PRODUIT_CREE", `Produit#${produit.id}`, { nom: produit.nom });

  return NextResponse.json({ donnees: produit }, { status: 201 });
});
