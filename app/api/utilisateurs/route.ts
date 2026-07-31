import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { routeApi, corpsJSON, utilisateurCourant } from "@/lib/api-helpers";
import { hashPassword, journaliser } from "@/lib/auth";

// Reserve aux ADMIN : deja verrouille une premiere fois par le middleware
// (voir middleware.ts, bloc "/api/utilisateurs"), et revalide ici par
// defense en profondeur si jamais la route est appelee autrement.
const schemaUtilisateur = z.object({
  nom: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  motDePasse: z.string().min(8, "8 caracteres minimum"),
  role: z.enum(["ADMIN", "EMPLOYE", "COMMERCIAL"]).default("EMPLOYE"),
});

export const GET = routeApi(async (request) => {
  const { role } = utilisateurCourant(request);
  if (role !== "ADMIN") {
    return NextResponse.json({ erreur: "Reserve aux administrateurs" }, { status: 403 });
  }

  const utilisateurs = await db.user.findMany({
    select: { id: true, nom: true, email: true, role: true, actif: true, creeLe: true },
    orderBy: { nom: "asc" },
  });

  return NextResponse.json({ donnees: utilisateurs });
});

export const POST = routeApi(async (request) => {
  const { userId, role } = utilisateurCourant(request);
  if (role !== "ADMIN") {
    return NextResponse.json({ erreur: "Reserve aux administrateurs" }, { status: 403 });
  }

  const donnees = schemaUtilisateur.parse(await corpsJSON(request));
  const motDePasseHache = await hashPassword(donnees.motDePasse);

  const utilisateur = await db.user.create({
    data: {
      nom: donnees.nom,
      email: donnees.email,
      role: donnees.role,
      motDePasse: motDePasseHache,
    },
    select: { id: true, nom: true, email: true, role: true, actif: true },
  });

  await journaliser(userId, "UTILISATEUR_CREE", `User#${utilisateur.id}`, { email: utilisateur.email });

  return NextResponse.json({ donnees: utilisateur }, { status: 201 });
});
