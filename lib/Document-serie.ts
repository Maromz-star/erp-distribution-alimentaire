import { db } from "@/lib/db";

export type DocumentType =
  | "BON_LIVRAISON_CLIENT"
  | "FACTURE_CLIENT"
  | "FACTURE_FOURNISSEUR";

export async function prochainNumero(
  type: DocumentType,
  exerciceId: string
) {
  const exercice = await db.exercice.findUnique({
    where: { id: exerciceId },
  });

  if (!exercice) {
    throw new Error("Exercice introuvable");
  }

  const serie = await db.documentSerie.findUnique({
    where: {
      type_exerciceId: {
        type,
        exerciceId,
      },
    },
  });

  if (!serie) {
    throw new Error(`Série introuvable pour ${type} sur l'exercice ${exercice.annee}`);
  }

  const nextNumber = serie.currentNumber + 1;
  const padded = String(nextNumber).padStart(serie.digitCount, "0");

  await db.documentSerie.update({
    where: { id: serie.id },
    data: {
      currentNumber: nextNumber,
    },
  });

  return `${exercice.annee}-${serie.prefix}-${padded}`;
}