"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet, formaterMontant, formaterDate } from "@/lib/api-client";
import { EnTetePage } from "@/components/ui";
import { DataTable, type Colonne } from "@/components/DataTable";

type ReglementClient = {
  id: string;
  montant: string;
  mode: string;
  dateReglement: string;
  reference: string | null;
  client: { nom: string };
  vente: { numeroFacture: string } | null;
};

type PaiementFournisseur = {
  id: string;
  montant: string;
  mode: string;
  datePaiement: string;
  reference: string | null;
  fournisseur: { nom: string };
  livraison: { numeroBon: string } | null;
};

export default function PageReglements() {
  const [onglet, setOnglet] = useState<"clients" | "fournisseurs">("clients");
  const [reglementsClients, setReglementsClients] = useState<ReglementClient[]>([]);
  const [paiementsFournisseurs, setPaiementsFournisseurs] = useState<PaiementFournisseur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      if (onglet === "clients") {
        const r = await apiGet<{ donnees: ReglementClient[]; pagination: { pages: number } }>(
          `/api/reglements?page=${page}&taille=20`
        );
        setReglementsClients(r.donnees);
        setPages(r.pagination.pages);
      } else {
        const r = await apiGet<{ donnees: PaiementFournisseur[]; pagination: { pages: number } }>(
          `/api/paiements-fournisseurs?page=${page}&taille=20`
        );
        setPaiementsFournisseurs(r.donnees);
        setPages(r.pagination.pages);
      }
    } finally {
      setChargement(false);
    }
  }, [onglet, page]);

  useEffect(() => {
    charger();
  }, [charger]);

  const colonnesClients: Colonne<ReglementClient>[] = [
    { cle: "date", entete: "Date", rendu: (r) => formaterDate(r.dateReglement) },
    { cle: "client", entete: "Client", rendu: (r) => r.client.nom },
    { cle: "facture", entete: "Facture", rendu: (r) => r.vente?.numeroFacture ?? "—" },
    { cle: "mode", entete: "Mode", rendu: (r) => r.mode },
    { cle: "reference", entete: "Reference", rendu: (r) => r.reference ?? "—" },
    { cle: "montant", entete: "Montant", rendu: (r) => formaterMontant(r.montant), alignement: "droite" },
  ];

  const colonnesFournisseurs: Colonne<PaiementFournisseur>[] = [
    { cle: "date", entete: "Date", rendu: (p) => formaterDate(p.datePaiement) },
    { cle: "fournisseur", entete: "Fournisseur", rendu: (p) => p.fournisseur.nom },
    { cle: "bon", entete: "Bon", rendu: (p) => p.livraison?.numeroBon ?? "—" },
    { cle: "mode", entete: "Mode", rendu: (p) => p.mode },
    { cle: "reference", entete: "Reference", rendu: (p) => p.reference ?? "—" },
    { cle: "montant", entete: "Montant", rendu: (p) => formaterMontant(p.montant), alignement: "droite" },
  ];

  return (
    <div>
      <EnTetePage
        titre="Reglements & paiements"
        sousTitre="Encaissements clients et decaissements fournisseurs. Pour enregistrer un nouveau reglement, ouvrez la facture ou le bon concerne."
      />

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => {
            setOnglet("clients");
            setPage(1);
          }}
          className={onglet === "clients" ? "bouton-principal !py-1.5" : "bouton-secondaire !py-1.5"}
        >
          Reglements clients
        </button>
        <button
          onClick={() => {
            setOnglet("fournisseurs");
            setPage(1);
          }}
          className={onglet === "fournisseurs" ? "bouton-principal !py-1.5" : "bouton-secondaire !py-1.5"}
        >
          Paiements fournisseurs
        </button>
      </div>

      {onglet === "clients" ? (
        <DataTable
          colonnes={colonnesClients}
          lignes={reglementsClients}
          chargement={chargement}
          page={page}
          pages={pages}
          onChangerPage={setPage}
          messageVide="Aucun reglement client enregistre."
        />
      ) : (
        <DataTable
          colonnes={colonnesFournisseurs}
          lignes={paiementsFournisseurs}
          chargement={chargement}
          page={page}
          pages={pages}
          onChangerPage={setPage}
          messageVide="Aucun paiement fournisseur enregistre."
        />
      )}
    </div>
  );
}
