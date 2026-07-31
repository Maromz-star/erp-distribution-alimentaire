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

const schemaFacture = z.object({
  fournisseurId: z.string().min(1, "Fournisseur requis"),
  numeroFacture: z.string().min(1, "Numero de facture requis"),
  dateFacture: z.coerce.date().optional(),
  lignes: z.array(schemaLigne).min(1, "Au moins une ligne est requise"),
  commentaires: z.string().optional().nullable(),
});

export const GET = routeApi(async (request) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "facturesFournisseurs.lire");

  const { searchParams } = new URL(request.url);
  const fournisseurId = searchParams.get("fournisseurId");
  const { skip, take, page, taille } = pagination(request);

  const filtre: Prisma.FactureFournisseurWhereInput = fournisseurId ? { fournisseurId } : {};

  const [factures, total] = await Promise.all([
    db.factureFournisseur.findMany({
      where: filtre,
      include: {
        fournisseur: { select: { nom: true, societe: true } },
        lignes: { include: { produit: { select: { nom: true, codeProduit: true } } } },
      },
      orderBy: { dateFacture: "desc" },
      skip,
      take,
    }),
    db.factureFournisseur.count({ where: filtre }),
  ]);

  return NextResponse.json({
    donnees: factures,
    pagination: { page, taille, total, pages: Math.ceil(total / taille) },
  });
});

export const POST = routeApi(async (request) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "facturesFournisseurs.ecrire");

  const corps = schemaFacture.parse(await corpsJSON(request));

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

    const facture = await tx.factureFournisseur.create({
      data: {
        numeroFacture: corps.numeroFacture,
        fournisseurId: corps.fournisseurId,
        utilisateurId: userId,
        dateFacture: corps.dateFacture ?? new Date(),
        totalHT,
        totalTTC,
        montantPaye: 0,
        statut: "EN_ATTENTE",
        commentaires: corps.commentaires,
        lignes: { create: lignesPreparees },
      },
      include: {
        fournisseur: { select: { nom: true, societe: true } },
        lignes: { include: { produit: { select: { nom: true, codeProduit: true } } } },
      },
    });

    return facture;
  });

  await journaliser(userId, "FACTURE_FOURNISSEUR_CREEE", `FactureFournisseur#${resultat.id}`, {
    numeroFacture: resultat.numeroFacture,
  });

  return NextResponse.json({ donnees: resultat }, { status: 201 });
});
