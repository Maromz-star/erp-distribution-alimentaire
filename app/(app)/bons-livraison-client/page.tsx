"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { apiGet, formaterMontant, formaterDate } from "@/lib/api-client";
import { EnTetePage, StatutBadge } from "@/components/ui";
import { DataTable, type Colonne } from "@/components/DataTable";

type BonLivraisonClient = {
  id: string;
  numeroBon: string;
  numeroSerie: string;
  dateLivraison: string;
  totalTTC: string;
  statut: string;
  client: { nom: string; societe: string | null };
  vente: { id: string; numeroFacture: string } | null;
};

export default function PageBonsLivraisonClient() {
  const router = useRouter();
  const [bons, setBons] = useState<BonLivraisonClient[]>([]);
  const [chargement, setChargement] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const reponse = await apiGet<{ donnees: BonLivraisonClient[]; pagination: { pages: number } }>(
        `/api/bons-livraison-client?page=${page}`
      );
      setBons(reponse.donnees);
      setPages(reponse.pagination.pages);
    } finally {
      setChargement(false);
    }
  }, [page]);

  useEffect(() => {
    charger();
  }, [charger]);

  const colonnes: Colonne<BonLivraisonClient>[] = [
    { cle: "numeroBon", entete: "Bon de livraison", rendu: (b) => <span className="font-medium">{b.numeroBon}</span> },
    { cle: "client", entete: "Client", rendu: (b) => b.client.societe || b.client.nom },
    { cle: "dateLivraison", entete: "Date", rendu: (b) => formaterDate(b.dateLivraison) },
    { cle: "totalTTC", entete: "Total TTC", rendu: (b) => formaterMontant(b.totalTTC), alignement: "droite" },
    {
      cle: "statut",
      entete: "Statut",
      rendu: (b) => {
        if (b.statut === "FACTUREE") return <StatutBadge statut="PAYEE" texte="Facturee" />;
        if (b.statut === "ANNULEE") return <StatutBadge statut="ANNULEE" texte="Annulee" />;
        if (b.statut === "VALIDEE") return <StatutBadge statut="VALIDEE" texte="Validee" />;
        return <StatutBadge statut="BROUILLON" texte="Brouillon" />;
      },
    },
  ];

  return (
    <div>
      <EnTetePage
        titre="Bons de livraison client"
        sousTitre="Preparez les livraisons avant de lancer la facture client"
        actions={
          <button onClick={() => router.push("/bons-livraison-client/nouveau")} className="bouton-principal">
            <Plus className="h-4 w-4" /> Nouveau bon
          </button>
        }
      />

      <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50/70 p-4 text-sm text-brand-900 dark:border-brand-900/40 dark:bg-brand-950/30 dark:text-brand-100">
        Ce module sert a generer le document de preparation de livraison client avant la facture. Le flux logique recommande est : <strong>client -&gt; bon de livraison client -&gt; facture client</strong>.
      </div>

      <DataTable
        colonnes={colonnes}
        lignes={bons}
        chargement={chargement}
        page={page}
        pages={pages}
        onChangerPage={setPage}
        onClicLigne={(b) => router.push(`/bons-livraison-client/${b.id}`)}
        messageVide="Aucun bon de livraison client pour le moment."
      />
    </div>
  );
}
