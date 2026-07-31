import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { routeApi, corpsJSON, utilisateurCourant } from "@/lib/api-helpers";
import { journaliser } from "@/lib/auth";

const schemaMiseAJour = z.object({
  nom: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "EMPLOYE", "COMMERCIAL"]).optional(),
  actif: z.boolean().optional(),
});

type Contexte = { params: { id: string } };

export const PUT = routeApi(async (request: NextRequest, { params }: Contexte) => {
  const { userId, role } = utilisateurCourant(request);
  if (role !== "ADMIN") {
    return NextResponse.json({ erreur: "Reserve aux administrateurs" }, { status: 403 });
  }

  const donnees = schemaMiseAJour.parse(await corpsJSON(request));

  if (params.id === userId) {
    // Empeche un admin de se retirer accidentellement ses propres droits
    // ou de se desactiver lui-meme, ce qui bloquerait tout acces admin.
    if (donnees.actif === false || (donnees.role && donnees.role !== "ADMIN")) {
      return NextResponse.json(
        { erreur: "Vous ne pouvez pas retirer vos propres droits administrateur." },
        { status: 400 }
      );
    }
  }

  const utilisateur = await db.user.update({
    where: { id: params.id },
    data: donnees,
    select: { id: true, nom: true, email: true, role: true, actif: true },
  });

  await journaliser(userId, "UTILISATEUR_MODIFIE", `User#${utilisateur.id}`);

  return NextResponse.json({ donnees: utilisateur });
});
