import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { routeApi, corpsJSON, pagination, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";
import { journaliser } from "@/lib/auth";

const schemaPaiement = z.object({
  fournisseurId: z.string().min(1),
  livraisonId: z.string().optional().nullable(),
  montant: z.coerce.number().positive("Le montant doit etre superieur a 0"),
  mode: z.enum(["ESPECES", "VIREMENT", "CHEQUE", "TRAITE", "CARTE_BANCAIRE"]),
  reference: z.string().optional().nullable(),
  commentaires: z.string().optional().nullable(),
});

export const GET = routeApi(async (request) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "paiementsFournisseurs.ecrire");

  const { searchParams } = new URL(request.url);
  const fournisseurId = searchParams.get("fournisseurId");
  const { skip, take, page, taille } = pagination(request);

  const filtre = fournisseurId ? { fournisseurId } : {};

  const [paiements, total] = await Promise.all([
    db.paiementFournisseur.findMany({
      where: filtre,
      include: {
        fournisseur: { select: { nom: true } },
        livraison: { select: { numeroBon: true } },
      },
      orderBy: { datePaiement: "desc" },
      skip,
      take,
    }),
    db.paiementFournisseur.count({ where: filtre }),
  ]);

  return NextResponse.json({
    donnees: paiements,
    pagination: { page, taille, total, pages: Math.ceil(total / taille) },
  });
});

export const POST = routeApi(async (request) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "paiementsFournisseurs.ecrire");

  const donnees = schemaPaiement.parse(await corpsJSON(request));

  const resultat = await db.$transaction(async (tx) => {
    const paiement = await tx.paiementFournisseur.create({
      data: { ...donnees, utilisateurId: userId },
    });

    if (donnees.livraisonId) {
      const livraison = await tx.livraison.findUniqueOrThrow({
        where: { id: donnees.livraisonId },
      });
      const nouveauMontantPaye = Number(livraison.montantPaye) + donnees.montant;

      if (nouveauMontantPaye > Number(livraison.totalTTC) + 0.01) {
        throw new Error(
          `Le paiement (${donnees.montant}) depasse le solde restant du bon ${livraison.numeroBon}`
        );
      }

      await tx.livraison.update({
        where: { id: donnees.livraisonId },
        data: { montantPaye: nouveauMontantPaye },
      });
    }

    return paiement;
  });

  await journaliser(userId, "PAIEMENT_FOURNISSEUR_ENREGISTRE", `Paiement#${resultat.id}`, {
    montant: resultat.montant,
  });

  return NextResponse.json({ donnees: resultat }, { status: 201 });
});
