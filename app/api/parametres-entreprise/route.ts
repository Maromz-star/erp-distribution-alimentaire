import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { routeApi, corpsJSON, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";

// GET /api/parametres-entreprise - infos de la societe vendeuse (utilisees
// pour l'en-tete des documents PDF : logo, adresse, ICE, RC...). Accessible
// a tout utilisateur authentifie (necessaire pour generer un PDF depuis
// n'importe quel role).
export const GET = routeApi(async (request: NextRequest) => {
  utilisateurCourant(request);
  const parametres = await db.parametreEntreprise.findFirst({
    orderBy: { modifieLe: "desc" },
  });
  return NextResponse.json({ donnees: parametres });
});

const schemaParametres = z.object({
  nom: z.string().min(1, "Nom requis"),
  adresse: z.string().optional().nullable(),
  ville: z.string().optional().nullable(),
  pays: z.string().optional().nullable(),
  telephone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  ice: z.string().optional().nullable(),
  identifiantFiscal: z.string().optional().nullable(),
  registreCommerce: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
});

// PUT /api/parametres-entreprise - cree ou met a jour la fiche unique des
// parametres de l'entreprise (ligne unique en base). Reserve aux
// administrateurs.
export const PUT = routeApi(async (request: NextRequest) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "parametresEntreprise.gerer");

  const donnees = schemaParametres.parse(await corpsJSON(request));

  const existant = await db.parametreEntreprise.findFirst();

  const parametres = existant
    ? await db.parametreEntreprise.update({ where: { id: existant.id }, data: donnees })
    : await db.parametreEntreprise.create({ data: donnees });

  return NextResponse.json({ donnees: parametres });
});
