import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { routeApi, corpsJSON, pagination, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";
import { journaliser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const schemaFournisseur = z.object({
  nom: z.string().min(1, "Nom requis"),
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
});

export const GET = routeApi(async (request) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "fournisseurs.lire");

  const { searchParams } = new URL(request.url);
  const recherche = searchParams.get("recherche");
  const { skip, take, page, taille } = pagination(request);

  const filtre: Prisma.FournisseurWhereInput = recherche
    ? {
        OR: [
          { nom: { contains: recherche, mode: "insensitive" } },
          { societe: { contains: recherche, mode: "insensitive" } },
          { telephone: { contains: recherche, mode: "insensitive" } },
        ],
      }
    : {};

  const [fournisseurs, total] = await Promise.all([
    db.fournisseur.findMany({
      where: filtre,
      orderBy: { nom: "asc" },
      skip,
      take,
      include: { livraisons: { select: { totalTTC: true, montantPaye: true } } },
    }),
    db.fournisseur.count({ where: filtre }),
  ]);

  const donnees = fournisseurs.map(({ livraisons, ...f }) => {
    const totalAchete = livraisons.reduce((s, l) => s + Number(l.totalTTC), 0);
    const totalPaye = livraisons.reduce((s, l) => s + Number(l.montantPaye), 0);
    return { ...f, totalAchete, totalPaye, resteAPayer: totalAchete - totalPaye };
  });

  return NextResponse.json({
    donnees,
    pagination: { page, taille, total, pages: Math.ceil(total / taille) },
  });
});

export const POST = routeApi(async (request) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "fournisseurs.ecrire");

  const donnees = schemaFournisseur.parse(await corpsJSON(request));
  const fournisseur = await db.fournisseur.create({ data: donnees });

  await journaliser(userId, "FOURNISSEUR_CREE", `Fournisseur#${fournisseur.id}`, {
    nom: fournisseur.nom,
  });

  return NextResponse.json({ donnees: fournisseur }, { status: 201 });
});
