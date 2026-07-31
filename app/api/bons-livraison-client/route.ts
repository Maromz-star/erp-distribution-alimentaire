import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { routeApi, corpsJSON, pagination, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";
import { journaliser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const schemaLigne = z.object({
  produitId: z.string().min(1, "Produit requis"),
  quantite: z.coerce.number().positive(),
  prixUnitaire: z.coerce.number().nonnegative(),
});

const schemaBon = z.object({
  clientId: z.string().min(1, "Client requis"),
  numeroBon: z.string().min(1, "Numero de bon requis"),
  dateLivraison: z.coerce.date().optional(),
  lignes: z.array(schemaLigne).min(1, "Au moins une ligne est requise"),
  commentaires: z.string().optional().nullable(),
});

export const GET = routeApi(async (request) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "bonsLivraisonClient.lire");

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const { skip, take, page, taille } = pagination(request);

  const filtre: Prisma.BonLivraisonClientWhereInput = clientId ? { clientId } : {};

  const [bons, total] = await Promise.all([
    db.bonLivraisonClient.findMany({
      where: filtre,
      include: {
        client: { select: { nom: true, societe: true } },
        lignes: { include: { produit: { select: { nom: true, codeProduit: true } } } },
      },
      orderBy: { dateLivraison: "desc" },
      skip,
      take,
    }),
    db.bonLivraisonClient.count({ where: filtre }),
  ]);

  return NextResponse.json({
    donnees: bons,
    pagination: { page, taille, total, pages: Math.ceil(total / taille) },
  });
});

export const POST = routeApi(async (request) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "bonsLivraisonClient.ecrire");

  const corps = schemaBon.parse(await corpsJSON(request));

  const resultat = await db.$transaction(async (tx) => {
    const produits = await tx.produit.findMany({
      where: { id: { in: corps.lignes.map((ligne) => ligne.produitId) } },
    });
    const produitParId = new Map(produits.map((p) => [p.id, p]));

    let totalHT = 0;
    const lignesPreparees = [];

    for (const ligne of corps.lignes) {
      const produit = produitParId.get(ligne.produitId);
      if (!produit) throw new Error(`Produit introuvable : ${ligne.produitId}`);

      const totalLigne = ligne.prixUnitaire * ligne.quantite;
      totalHT += totalLigne;

      lignesPreparees.push({
        produitId: produit.id,
        quantite: ligne.quantite,
        prixUnitaire: ligne.prixUnitaire,
        totalLigne,
      });
    }

    const totalTTC = totalHT;

    const bon = await tx.bonLivraisonClient.create({
      data: {
        numeroBon: corps.numeroBon,
        clientId: corps.clientId,
        utilisateurId: userId,
        dateLivraison: corps.dateLivraison ?? new Date(),
        totalHT,
        totalTTC,
        statut: "VALIDEE",
        commentaires: corps.commentaires,
        lignes: { create: lignesPreparees },
      },
      include: {
        client: { select: { nom: true, societe: true } },
        lignes: { include: { produit: { select: { nom: true, codeProduit: true } } } },
      },
    });

    return bon;
  });

  await journaliser(userId, "BON_LIVRAISON_CLIENT_CREE", `BonLivraisonClient#${resultat.id}`, {
    numeroBon: resultat.numeroBon,
  });

  return NextResponse.json({ donnees: resultat }, { status: 201 });
});
