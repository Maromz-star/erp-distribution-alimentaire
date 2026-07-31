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
  conditionsPaiement: z.string().optional().nullable(),
  actif: z.boolean().optional(),
});

type Contexte = { params: { id: string } };

export const GET = routeApi(async (request: NextRequest, { params }: Contexte) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "fournisseurs.lire");

  const fournisseur = await db.fournisseur.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      livraisons: {
        orderBy: { dateLivraison: "desc" },
        include: { lignes: { include: { produit: { select: { nom: true } } } } },
      },
      paiements: { orderBy: { datePaiement: "desc" } },
    },
  });

  const totalAchete = fournisseur.livraisons.reduce((s, l) => s + Number(l.totalTTC), 0);
  const totalPaye = fournisseur.livraisons.reduce((s, l) => s + Number(l.montantPaye), 0);

  return NextResponse.json({
    donnees: {
      ...fournisseur,
      totalAchete,
      totalPaye,
      resteAPayer: totalAchete - totalPaye,
    },
  });
});

export const PUT = routeApi(async (request: NextRequest, { params }: Contexte) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "fournisseurs.ecrire");

  const donnees = schemaMiseAJour.parse(await corpsJSON(request));
  const fournisseur = await db.fournisseur.update({ where: { id: params.id }, data: donnees });

  await journaliser(userId, "FOURNISSEUR_MODIFIE", `Fournisseur#${fournisseur.id}`);

  return NextResponse.json({ donnees: fournisseur });
});

export const DELETE = routeApi(async (request: NextRequest, { params }: Contexte) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "fournisseurs.ecrire");

  const fournisseur = await db.fournisseur.update({
    where: { id: params.id },
    data: { actif: false },
  });

  await journaliser(userId, "FOURNISSEUR_DESACTIVE", `Fournisseur#${fournisseur.id}`);

  return NextResponse.json({ donnees: fournisseur });
});
