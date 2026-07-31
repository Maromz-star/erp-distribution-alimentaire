import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, signSession, sessionCookieOptions, journaliser } from "@/lib/auth";

const schemaConnexion = z.object({
  email: z.string().email("Adresse email invalide"),
  motDePasse: z.string().min(1, "Mot de passe requis"),
});

export async function POST(request: NextRequest) {
  const corps = await request.json().catch(() => null);
  const analyse = schemaConnexion.safeParse(corps);

  if (!analyse.success) {
    return NextResponse.json(
      { erreur: analyse.error.issues[0]?.message ?? "Requete invalide" },
      { status: 400 }
    );
  }

  const { email, motDePasse } = analyse.data;
  const utilisateur = await authenticate(email, motDePasse);

  if (!utilisateur) {
    // Message volontairement generique : ne pas reveler si c'est l'email
    // ou le mot de passe qui est incorrect (limite l'enumeration de comptes).
    return NextResponse.json(
      { erreur: "Identifiants incorrects." },
      { status: 401 }
    );
  }

  const token = signSession({
    userId: utilisateur.id,
    email: utilisateur.email,
    role: utilisateur.role,
    nom: utilisateur.nom,
  });

  await journaliser(utilisateur.id, "CONNEXION");

  const reponse = NextResponse.json({
    utilisateur: {
      id: utilisateur.id,
      nom: utilisateur.nom,
      email: utilisateur.email,
      role: utilisateur.role,
    },
  });
  reponse.cookies.set(sessionCookieOptions().name, token, sessionCookieOptions());
  return reponse;
}
