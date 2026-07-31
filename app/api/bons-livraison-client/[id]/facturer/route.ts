import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routeApi, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";
import { journaliser } from "@/lib/auth";
import { genererNumeroFacture } from "@/lib/numerotation";

type Contexte = { params: { id: string } };

// POST /api/bons-livraison-client/[id]/facturer
//
// Emet la facture (Vente) correspondant a ce bon de livraison client deja
// emis. C'est le SEUL endroit ou une facture peut etre creee : impossible
// de facturer sans un bon de livraison existant, et impossible de facturer
// deux fois le meme bon (contrainte @unique sur bonLivraisonClientId).
export const POST = routeApi(async (request: NextRequest, { params }: Contexte) => {
  const { userId, role } = utilisateurCourant(request);
  exigerPermission(role, "ventes.ecrire");

  const resultat = await db.$transaction(async (tx) => {
    const bon = await tx.bonLivraisonClient.findUnique({
      where: { id: params.id },
      include: { lignes: true, vente: true },
    });

    if (!bon) {
      throw new Error("Bon de livraison introuvable");
    }
    if (bon.statut === "ANNULEE") {
      throw new Error("Ce bon de livraison est annule et ne peut pas etre facture");
    }
    if (bon.statut === "BROUILLON") {
      throw new Error("Le bon de livraison doit etre valide avant de pouvoir etre facture");
    }
    if (bon.vente) {
      throw new Error(`Ce bon de livraison a deja ete facture (facture ${bon.vente.numeroFacture})`);
    }

    const numeroFacture = await genererNumeroFacture(tx);

    const vente = await tx.vente.create({
      data: {
        numeroFacture,
        clientId: bon.clientId,
        utilisateurId: userId,
        bonLivraisonClientId: bon.id,
        sousTotalHT: bon.sousTotalHT,
        totalRemise: bon.totalRemise,
        totalTVA: bon.totalTVA,
        totalTTC: bon.totalTTC,
        montantPaye: 0,
        statut: "VALIDEE",
        commentaires: bon.commentaires,
        lignes: {
          create: bon.lignes.map((l) => ({
            produitId: l.produitId,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            remisePct: l.remisePct,
            tauxTVA: l.tauxTVA,
            totalLigneHT: l.totalLigneHT,
            totalLigneTTC: l.totalLigneTTC,
          })),
        },
      },
      include: { client: true, lignes: true },
    });

    await tx.bonLivraisonClient.update({
      where: { id: bon.id },
      data: { statut: "FACTUREE" },
    });

    return vente;
  });

  await journaliser(userId, "FACTURE_EMISE_DEPUIS_BL", `Vente#${resultat.id}`, {
    numeroFacture: resultat.numeroFacture,
    bonLivraisonClientId: params.id,
  });

  return NextResponse.json({ donnees: resultat }, { status: 201 });
});
