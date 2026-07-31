"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { apiGet, formaterMontant, formaterDate } from "@/lib/api-client";
import { EnTetePage, StatutBadge } from "@/components/ui";
import { DataTable, type Colonne } from "@/components/DataTable";

type Vente = {
  id: string;
  numeroFacture: string;
  creeLe: string;
  totalTTC: string;
  montantPaye: string;
  statut: string;
  client: { nom: string; societe: string | null };
};

export default function PageVentes() {
  const router = useRouter();
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [chargement, setChargement] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const reponse = await apiGet<{ donnees: Vente[]; pagination: { pages: number } }>(
        `/api/ventes?page=${page}&taille=20`
      );
      setVentes(reponse.donnees);
      setPages(reponse.pagination.pages);
    } finally {
      setChargement(false);
    }
  }, [page]);

  useEffect(() => {
    charger();
  }, [charger]);

  const colonnes: Colonne<Vente>[] = [
    { cle: "numeroFacture", entete: "Facture", rendu: (v) => <span className="font-medium">{v.numeroFacture}</span> },
    { cle: "client", entete: "Client", rendu: (v) => v.client.nom },
    { cle: "date", entete: "Date", rendu: (v) => formaterDate(v.creeLe) },
    { cle: "total", entete: "Total TTC", rendu: (v) => formaterMontant(v.totalTTC), alignement: "droite" },
    {
      cle: "solde",
      entete: "Solde",
      rendu: (v) => {
        const solde = Number(v.totalTTC) - Number(v.montantPaye);
        return <span className={solde > 0 ? "font-semibold text-danger" : "text-slate-500"}>{formaterMontant(solde)}</span>;
      },
      alignement: "droite",
    },
    {
      cle: "statut",
      entete: "Statut",
      rendu: (v) => {
        const solde = Number(v.totalTTC) - Number(v.montantPaye);
        if (v.statut === "ANNULEE") return <StatutBadge statut="ANNULEE" texte="Annulee" />;
        if (solde <= 0) return <StatutBadge statut="PAYEE" texte="Payee" />;
        if (Number(v.montantPaye) > 0) return <StatutBadge statut="PARTIELLEMENT_PAYEE" texte="Partielle" />;
        return <StatutBadge statut="EN_ATTENTE" texte="En attente" />;
      },
    },
  ];

  return (
    <div>
      <EnTetePage
        titre="Ventes"
        sousTitre="Historique des factures et encaissements"
        actions={
          <button onClick={() => router.push("/ventes/nouvelle")} className="bouton-principal">
            <Plus className="h-4 w-4" /> Nouvelle vente
          </button>
        }
      />

      <DataTable
        colonnes={colonnes}
        lignes={ventes}
        chargement={chargement}
        page={page}
        pages={pages}
        onChangerPage={setPage}
        onClicLigne={(v) => router.push(`/ventes/${v.id}`)}
        messageVide="Aucune vente. Cliquez sur 'Nouvelle vente' pour commencer."
      />
    </div>
  );
}
