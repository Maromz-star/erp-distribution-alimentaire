import type { Prisma } from "@prisma/client";

/**
 * Numerotation simple par comptage : suffisant pour le volume d'une PME.
 * En tres forte concurrence (deux documents la meme milliseconde), un
 * conflit est possible mais rattrape proprement par la contrainte @unique
 * sur le numero (l'utilisateur n'a qu'a reessayer).
 */

export async function genererNumeroFacture(tx: Prisma.TransactionClient): Promise<string> {
  const annee = new Date().getFullYear();
  const debutAnnee = new Date(annee, 0, 1);
  const compte = await tx.vente.count({ where: { creeLe: { gte: debutAnnee } } });
  return `FV-${annee}-${String(compte + 1).padStart(5, "0")}`;
}

/**
 * Genere le numero de bon de livraison client. Le document porte deux
 * informations distinctes affichees a l'utilisateur :
 * - numeroSerie : la serie du document (ici l'annee en cours, ex "2026")
 * - numeroBon   : le numero complet, unique, du bon (ex "BL-2026-00001")
 */
export async function genererNumeroBonLivraison(
  tx: Prisma.TransactionClient
): Promise<{ numeroSerie: string; numeroBon: string }> {
  const annee = new Date().getFullYear();
  const debutAnnee = new Date(annee, 0, 1);
  const compte = await tx.bonLivraisonClient.count({ where: { creeLe: { gte: debutAnnee } } });
  const numeroSerie = String(annee);
  const numeroBon = `BL-${annee}-${String(compte + 1).padStart(5, "0")}`;
  return { numeroSerie, numeroBon };
}
