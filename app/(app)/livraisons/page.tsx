"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { apiGet, formaterMontant, formaterDate } from "@/lib/api-client";
import { EnTetePage, StatutBadge } from "@/components/ui";
import { DataTable, type Colonne } from "@/components/DataTable";

type Livraison = {
  id: string;
  numeroBon: string;
  dateLivraison: string;
  totalTTC: string;
  montantPaye: string;
  fournisseur: { nom: string };
};

export default function PageLivraisons() {
  const router = useRouter();
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);
  const [chargement, setChargement] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const reponse = await apiGet<{ donnees: Livraison[]; pagination: { pages: number } }>(
        `/api/livraisons?page=${page}&taille=20`
      );
      setLivraisons(reponse.donnees);
      setPages(reponse.pagination.pages);
    } finally {
      setChargement(false);
    }
  }, [page]);

  useEffect(() => {
    charger();
  }, [charger]);

  const colonnes: Colonne<Livraison>[] = [
    { cle: "numeroBon", entete: "Bon", rendu: (l) => <span className="font-medium">{l.numeroBon}</span> },
    { cle: "fournisseur", entete: "Fournisseur", rendu: (l) => l.fournisseur.nom },
    { cle: "date", entete: "Date", rendu: (l) => formaterDate(l.dateLivraison) },
    { cle: "total", entete: "Total", rendu: (l) => formaterMontant(l.totalTTC), alignement: "droite" },
    {
      cle: "statut",
      entete: "Statut",
      rendu: (l) => {
        const solde = Number(l.totalTTC) - Number(l.montantPaye);
        return solde <= 0 ? (
          <StatutBadge statut="PAYEE" texte="Soldee" />
        ) : Number(l.montantPaye) > 0 ? (
          <StatutBadge statut="PARTIELLEMENT_PAYEE" texte="Partielle" />
        ) : (
          <StatutBadge statut="EN_ATTENTE" texte="A payer" />
        );
      },
    },
  ];

  return (
    <div>
      <EnTetePage
        titre="Livraisons fournisseurs"
        sousTitre="Receptions de marchandises et mise a jour du stock"
        actions={
          <button onClick={() => router.push("/livraisons/nouvelle")} className="bouton-principal">
            <Plus className="h-4 w-4" /> Nouvelle livraison
          </button>
        }
      />

      <DataTable
        colonnes={colonnes}
        lignes={livraisons}
        chargement={chargement}
        page={page}
        pages={pages}
        onChangerPage={setPage}
        onClicLigne={(l) => router.push(`/livraisons/${l.id}`)}
        messageVide="Aucune livraison. Cliquez sur 'Nouvelle livraison' pour commencer."
      />
    </div>
  );
}
