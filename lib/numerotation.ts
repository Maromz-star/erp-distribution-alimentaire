import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function genererNumeroFacture(tx: Prisma.TransactionClient) {
  const exercice = await tx.exercice.findFirst({
    where: { actif: true },
    orderBy: { annee: "desc" },
  });

  if (!exercice) {
    throw new Error("Aucun exercice actif trouvé");
  }

  const serie = await tx.documentSerie.findFirst({
    where: {
      type: "FACTURE_CLIENT",
      exerciceId: exercice.id,
    },
  });

  if (!serie) {
    throw new Error("Série facture client introuvable");
  }

  const nouveauNumero = serie.currentNumber + 1;
  const padded = String(nouveauNumero).padStart(serie.digitCount, "0");

  await tx.documentSerie.update({
    where: { id: serie.id },
    data: { currentNumber: nouveauNumero },
  });

  return `${serie.prefix}-${padded}-${exercice.annee}`;
}