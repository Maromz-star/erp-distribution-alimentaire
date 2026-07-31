import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { Prisma, type Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = Number(process.env.JWT_EXPIRES_IN ?? 86400);
const COOKIE_NAME = "erp_session";

if (!JWT_SECRET) {
  // On échoue fort et tôt plutôt que de signer des tokens avec un secret
  // vide ou par défaut : une erreur de configuration doit être visible
  // immédiatement, pas découverte après une faille de sécurité.
  throw new Error(
    "JWT_SECRET n'est pas défini. Copiez .env.example vers .env et renseignez un secret."
  );
}

export type SessionPayload = {
  userId: string;
  email: string;
  role: Role;
  nom: string;
};

// ----------------------------------------------------------------------------
// Mots de passe
// ----------------------------------------------------------------------------

export async function hashPassword(motDePasse: string): Promise<string> {
  return bcrypt.hash(motDePasse, 12);
}

export async function verifyPassword(
  motDePasse: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(motDePasse, hash);
}

// ----------------------------------------------------------------------------
// Session JWT (stockee dans un cookie httpOnly)
// ----------------------------------------------------------------------------

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: JWT_EXPIRES_IN });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET as string) as SessionPayload;
  } catch {
    return null;
  }
}

/** A utiliser dans les Server Components / Route Handlers pour lire la session courante. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function sessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: JWT_EXPIRES_IN,
  };
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

// ----------------------------------------------------------------------------
// Connexion complète (verifie identifiants + renvoie payload de session)
// ----------------------------------------------------------------------------

export async function authenticate(email: string, motDePasse: string) {
  const utilisateur = await db.user.findUnique({ where: { email } });
  if (!utilisateur || !utilisateur.actif) return null;

  const motDePasseValide = await verifyPassword(motDePasse, utilisateur.motDePasse);
  if (!motDePasseValide) return null;

  return utilisateur;
}

// ----------------------------------------------------------------------------
// Journal des actions (audit trail)
// ----------------------------------------------------------------------------

export async function journaliser(
  utilisateurId: string,
  action: string,
  cible?: string,
  details?: Prisma.InputJsonValue
) {
  await db.journalAction.create({
    data: {
      utilisateurId,
      action,
      cible,
      details: details as any,
    },
  });
}