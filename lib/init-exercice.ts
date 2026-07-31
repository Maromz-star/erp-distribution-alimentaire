import { db } from "@/lib/db";

export async function ensureExercice(annee: number) {
  let exercice = await db.exercice.findUnique({
    where: { annee },
  });

  if (!exercice) {
    exercice = await db.exercice.create({
      data: {
        annee,
        libelle: `Exercice ${annee}`,
        actif: true,
      },
    });
  }

  const series = [
    { type: "BON_LIVRAISON_CLIENT", prefix: "BL" },
    { type: "FACTURE_CLIENT", prefix: "FC" },
    { type: "FACTURE_FOURNISSEUR", prefix: "FF" },
  ];

  for (const item of series) {
    await db.documentSerie.upsert({
      where: {
        type_exerciceId: {
          type: item.type,
          exerciceId: exercice.id,
        },
      },
      create: {
        type: item.type,
        prefix: item.prefix,
        currentNumber: 0,
        digitCount: 4,
        exerciceId: exercice.id,
      },
      update: {},
    });
  }

  return exercice;
}