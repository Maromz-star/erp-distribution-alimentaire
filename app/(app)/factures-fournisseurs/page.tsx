"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet, formaterMontant, formaterDate, ErreurAPI } from "@/lib/api-client";
import { EnTetePage, StatutBadge } from "@/components/ui";
import { DataTable, type Colonne } from "@/components/DataTable";

type FactureFournisseur = {
  id: string;
  numeroFacture: string;
  dateFacture: string;
  totalTTC: string;
  montantPaye: string;
  statut: string;
  fournisseur: { nom: string; societe: string | null };
};

export default function PageFacturesFournisseurs() {
  const router = useRouter();
  const [factures, setFactures] = useState<FactureFournisseur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await apiGet<{ donnees: FactureFournisseur[]; pagination: { pages: number } }>(
        `/api/factures-fournisseurs?page=${page}`
      );
      setFactures(reponse.donnees);
      setPages(reponse.pagination.pages);
    } catch (e) {
      setFactures([]);
      setErreur(e instanceof ErreurAPI ? e.message : "Impossible de charger les factures fournisseurs.");
    } finally {
      setChargement(false);
    }
  }, [page]);

  useEffect(() => {
    charger();
  }, [charger]);

  const colonnes: Colonne<FactureFournisseur>[] = [
    { cle: "numeroFacture", entete: "Facture", rendu: (f) => <span className="font-medium">{f.numeroFacture}</span> },
    { cle: "fournisseur", entete: "Fournisseur", rendu: (f) => f.fournisseur.societe || f.fournisseur.nom },
    { cle: "dateFacture", entete: "Date", rendu: (f) => formaterDate(f.dateFacture) },
    { cle: "totalTTC", entete: "Total TTC", rendu: (f) => formaterMontant(f.totalTTC), alignement: "droite" },
    {
      cle: "solde",
      entete: "Solde",
      rendu: (f) => {
        const solde = Number(f.totalTTC) - Number(f.montantPaye);
        return <span className={solde > 0 ? "font-semibold text-danger" : "text-slate-500"}>{formaterMontant(solde)}</span>;
      },
      alignement: "droite",
    },
    {
      cle: "statut",
      entete: "Statut",
      rendu: (f) => {
        if (f.statut === "PAYEE") return <StatutBadge statut="PAYEE" texte="Payee" />;
        if (f.statut === "PARTIELLEMENT_PAYEE") return <StatutBadge statut="PARTIELLEMENT_PAYEE" texte="Partielle" />;
        if (f.statut === "ANNULEE") return <StatutBadge statut="ANNULEE" texte="Annulee" />;
        return <StatutBadge statut="EN_ATTENTE" texte="En attente" />;
      },
    },
  ];

  return (
    <div>
      <EnTetePage
        titre="Factures fournisseurs"
        sousTitre="Recues des fournisseurs, rapprochees avec les livraisons et paiements"
        actions={
          <button type="button" onClick={() => router.push("/factures-fournisseurs/nouveau")} className="bouton-principal">
            Nouvelle facture
          </button>
        }
      />

      {erreur && (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {erreur} Contactez votre administrateur si le probleme persiste (base de donnees a verifier).
        </div>
      )}

      <DataTable
        colonnes={colonnes}
        lignes={factures}
        chargement={chargement}
        page={page}
        pages={pages}
        onChangerPage={setPage}
        onClicLigne={(f) => router.push(`/factures-fournisseurs/${f.id}`)}
        messageVide="Aucune facture fournisseur enregistree."
      />
    </div>
  );
}
