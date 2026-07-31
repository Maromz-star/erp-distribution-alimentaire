import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { routeApi, corpsJSON, pagination, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";
import { journaliser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const schemaClient = z.object({
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
  plafondCredit: z.coerce.number().nonnegative().optional().nullable(),
  commentaires: z.string().optional().nullable(),
});

// GET /api/clients?recherche=&soldeDebiteur=true&page=&taille=
export const GET = routeApi(async (request) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "clients.lire");

  const { searchParams } = new URL(request.url);
  const recherche = searchParams.get("recherche");
  const { skip, take, page, taille } = pagination(request);

  const filtre: Prisma.ClientWhereInput = recherche
    ? {
        OR: [
          { nom: { contains: recherche, mode: "insensitive" } },
          { societe: { contains: recherche, mode: "insensitive" } },
          { telephone: { contains: recherche, mode: "insensitive" } },
          { email: { contains: recherche, mode: "insensitive" } },
        ],
      }
    : {};

  const [clients, total] = await Promise.all([
    db.client.findMany({
      where: filtre,
      orderBy: { nom: "asc" },
      skip,
      take,
      include: {
        ventes: { select: { totalTTC: true, montantPaye: true } },
      },
    }),
    db.client.count({ where: filtre }),
  ]);

  // Solde = somme(totalTTC) - somme(montantPaye), calcule cote serveur pour
  // chaque client (evite d'exposer une requete SQL brute au frontend).
  const donnees = clients.map(({ ventes, ...client }) => {
    const totalAchete = ventes.reduce((s, v) => s + Number(v.totalTTC), 0);
    const totalPaye = ventes.reduce((s, v) => s + Number(v.montantPaye), 0);
    return { ...client, totalAchete, totalPaye, solde: totalAchete - totalPaye };
  });

  return NextResponse.json({
    donnees,
    pagination: { page, taille, total, pages: Math.ceil(total / taille) },
  });
});

export const POST = routeApi(async (request) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "clients.ecrire");

  const donnees = schemaClient.parse(await corpsJSON(request));
  const client = await db.client.create({ data: donnees });

  await journaliser(userId, "CLIENT_CREE", `Client#${client.id}`, { nom: client.nom });

  return NextResponse.json({ donnees: client }, { status: 201 });
});
