import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { PermissionRefusee } from "@/lib/permissions";
import type { Role } from "@prisma/client";

/**
 * Lit l'identite de l'utilisateur posee par le middleware sur les headers
 * de la requete. Le middleware garantit qu'un utilisateur non authentifie
 * n'atteint jamais une route protegee, donc userId/role sont toujours
 * presents ici pour une route qui n'est pas dans ROUTES_PUBLIQUES.
 */
export function utilisateurCourant(request: NextRequest): {
  userId: string;
  role: Role;
} {
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role") as Role | null;
  if (!userId || !role) {
    throw new Error(
      "Utilisateur introuvable dans la requete - le middleware d'auth a-t-il bien tourne ?"
    );
  }
  return { userId, role };
}

/**
 * Enveloppe un handler de route API pour centraliser la gestion d'erreurs :
 * - PermissionRefusee -> 403
 * - ZodError (validation) -> 400 avec le detail des champs en erreur
 * - erreur Prisma "not found" -> 404
 * - tout le reste -> 500, avec le detail masque en production
 */
export function routeApi(
  gestionnaire: (request: NextRequest, contexte: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, contexte: any) => {
    try {
      return await gestionnaire(request, contexte);
    } catch (erreur) {
      return gererErreur(erreur);
    }
  };
}

export function gererErreur(erreur: unknown): NextResponse {
  if (erreur instanceof PermissionRefusee) {
    return NextResponse.json({ erreur: erreur.message }, { status: 403 });
  }
  if (erreur instanceof ZodError) {
    return NextResponse.json(
      {
        erreur: "Donnees invalides",
        details: erreur.issues.map((i) => ({
          champ: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }
  if (erreur instanceof Error && erreur.message.includes("Record to update not found")) {
    return NextResponse.json({ erreur: "Ressource introuvable" }, { status: 404 });
  }

  console.error("[API]", erreur);
  const message =
    process.env.NODE_ENV === "development" && erreur instanceof Error
      ? erreur.message
      : "Erreur interne du serveur";
  return NextResponse.json({ erreur: message }, { status: 500 });
}

/** Parse le corps JSON d'une requete, avec un message clair si absent/invalide. */
export async function corpsJSON(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw Object.assign(new Error("Corps de requete JSON invalide"), { status: 400 });
  }
}

/** Construit les parametres de pagination a partir de la query string (?page=1&taille=20). */
export function pagination(request: NextRequest, tailleDefaut = 20) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const taille = Math.min(100, Math.max(1, Number(searchParams.get("taille") ?? tailleDefaut)));
  return { page, taille, skip: (page - 1) * taille, take: taille };
}
