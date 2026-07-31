import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { routeApi, corpsJSON, pagination, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";
import { journaliser } from "@/lib/auth";

const schemaReglement = z.object({
  clientId: z.string().min(1),
  venteId: z.string().optional().nullable(),
  montant: z.coerce.number().positive("Le montant doit etre superieur a 0"),
  mode: z.enum(["ESPECES", "VIREMENT", "CHEQUE", "TRAITE", "CARTE_BANCAIRE"]),
  reference: z.string().optional().nullable(),
  commentaires: z.string().optional().nullable(),
});

export const GET = routeApi(async (request) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "reglements.ecrire"); // ecrire implique lire dans ce module

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const { skip, take, page, taille } = pagination(request);

  const filtre = clientId ? { clientId } : {};

  const [reglements, total] = await Promise.all([
    db.reglement.findMany({
      where: filtre,
      include: { client: { select: { nom: true } }, vente: { select: { numeroFacture: true } } },
      orderBy: { dateReglement: "desc" },
      skip,
      take,
    }),
    db.reglement.count({ where: filtre }),
  ]);

  return NextResponse.json({
    donnees: reglements,
    pagination: { page, taille, total, pages: Math.ceil(total / taille) },
  });
});

// POST /api/reglements - enregistre un paiement client et met a jour le solde
// de la vente concernee (montantPaye). Le paiement partiel est gere
// naturellement : le solde restant = totalTTC - somme(montantPaye).
export const POST = routeApi(async (request) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "reglements.ecrire");

  const donnees = schemaReglement.parse(await corpsJSON(request));

  const resultat = await db.$transaction(async (tx) => {
    const reglement = await tx.reglement.create({
      data: { ...donnees, utilisateurId: userId },
    });

    if (donnees.venteId) {
      const vente = await tx.vente.findUniqueOrThrow({ where: { id: donnees.venteId } });
      const nouveauMontantPaye = Number(vente.montantPaye) + donnees.montant;

      if (nouveauMontantPaye > Number(vente.totalTTC) + 0.01) {
        throw new Error(
          `Le reglement (${donnees.montant}) depasse le solde restant de la facture ${vente.numeroFacture}`
        );
      }

      await tx.vente.update({
        where: { id: donnees.venteId },
        data: { montantPaye: nouveauMontantPaye },
      });
    }

    return reglement;
  });

  await journaliser(userId, "REGLEMENT_ENREGISTRE", `Reglement#${resultat.id}`, {
    montant: resultat.montant,
  });

  return NextResponse.json({ donnees: resultat }, { status: 201 });
});
