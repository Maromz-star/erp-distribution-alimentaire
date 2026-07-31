"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { EnTetePage, StatutBadge } from "@/components/ui";
import { DataTable, type Colonne } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { formaterDate, formaterMontant } from "@/lib/api-client";

type FactureFournisseur = {
  id: string;
  numeroFacture: string;
  fournisseur: string;
  dateFacture: string;
  montantTTC: number;
  montantPaye: number;
  statut: string;
};

const ETAT_VIDE = {
  numeroFacture: "",
  fournisseur: "",
  dateFacture: new Date().toISOString().slice(0, 10),
  montantTTC: 0,
  montantPaye: 0,
  statut: "EN_ATTENTE",
};

const DONNEES_INITIALES: FactureFournisseur[] = [
  {
    id: "ff-001",
    numeroFacture: "FAC-F-2026-001",
    fournisseur: "Sarl Alimentaire du Nord",
    dateFacture: "2026-07-25",
    montantTTC: 3560,
    montantPaye: 1200,
    statut: "PARTIELLEMENT_PAYEE",
  },
  {
    id: "ff-002",
    numeroFacture: "FAC-F-2026-002",
    fournisseur: "Comptoir des Fruits",
    dateFacture: "2026-07-24",
    montantTTC: 2480,
    montantPaye: 2480,
    statut: "PAYEE",
  },
];

export default function PageFacturesFournisseurs() {
  const [factures, setFactures] = useState<FactureFournisseur[]>(DONNEES_INITIALES);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [formulaire, setFormulaire] = useState(ETAT_VIDE);

  const colonnes = useMemo<Colonne<FactureFournisseur>[]>(
    () => [
      {
        cle: "numeroFacture",
        entete: "Facture",
        rendu: (f) => <span className="font-medium">{f.numeroFacture}</span>,
      },
      { cle: "fournisseur", entete: "Fournisseur", rendu: (f) => f.fournisseur },
      { cle: "dateFacture", entete: "Date", rendu: (f) => formaterDate(f.dateFacture) },
      { cle: "montantTTC", entete: "Total TTC", rendu: (f) => formaterMontant(f.montantTTC), alignement: "droite" },
      {
        cle: "statut",
        entete: "Statut",
        rendu: (f) => {
          if (f.statut === "PAYEE") return <StatutBadge statut="PAYEE" texte="Payée" />;
          if (f.statut === "PARTIELLEMENT_PAYEE") return <StatutBadge statut="PARTIELLEMENT_PAYEE" texte="Partielle" />;
          return <StatutBadge statut="EN_ATTENTE" texte="En attente" />;
        },
      },
    ],
    []
  );

  function enregistrerFacture(e: React.FormEvent) {
    e.preventDefault();
    const nouvelleFacture: FactureFournisseur = {
      id: `ff-${Date.now()}`,
      numeroFacture: formulaire.numeroFacture,
      fournisseur: formulaire.fournisseur,
      dateFacture: formulaire.dateFacture,
      montantTTC: Number(formulaire.montantTTC),
      montantPaye: Number(formulaire.montantPaye),
      statut: formulaire.statut,
    };

    setFactures((courant) => [nouvelleFacture, ...courant]);
    setFormulaire(ETAT_VIDE);
    setModalOuvert(false);
  }

  return (
    <div>
      <EnTetePage
        titre="Factures fournisseurs"
        sousTitre="Reçues des fournisseurs, rapprochées avec les livraisons et paiements"
        actions={
          <button onClick={() => setModalOuvert(true)} className="bouton-principal">
            <Plus className="h-4 w-4" /> Nouvelle facture
          </button>
        }
      />

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-navy-950 dark:text-slate-200">
        Cette facture porte votre identité d’entreprise en en-tête : nom, adresse, logo, ICE, TVA. Elle permet ensuite d’aligner les livraisons fournisseurs, les paiements, et la comptabilité.
      </div>

      <DataTable
        colonnes={colonnes}
        lignes={factures}
        chargement={false}
        page={1}
        pages={1}
        onChangerPage={() => {}}
        onClicLigne={(facture) => console.log("Facture", facture.id)}
        messageVide="Aucune facture fournisseur enregistrée."
      />

      <Modal titre="Nouvelle facture fournisseur" ouvert={modalOuvert} onFermer={() => setModalOuvert(false)} largeur="max-w-xl">
        <form onSubmit={enregistrerFacture} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Numéro facture" requis>
              <input
                required
                className="champ"
                value={formulaire.numeroFacture}
                onChange={(e) => setFormulaire({ ...formulaire, numeroFacture: e.target.value })}
              />
            </Champ>
            <Champ label="Fournisseur" requis>
              <input
                required
                className="champ"
                value={formulaire.fournisseur}
                onChange={(e) => setFormulaire({ ...formulaire, fournisseur: e.target.value })}
              />
            </Champ>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Champ label="Date facture" requis>
              <input
                type="date"
                required
                className="champ"
                value={formulaire.dateFacture}
                onChange={(e) => setFormulaire({ ...formulaire, dateFacture: e.target.value })}
              />
            </Champ>
            <Champ label="Statut">
              <select className="champ" value={formulaire.statut} onChange={(e) => setFormulaire({ ...formulaire, statut: e.target.value })}>
                <option value="EN_ATTENTE">En attente</option>
                <option value="PARTIELLEMENT_PAYEE">Partiellement payée</option>
                <option value="PAYEE">Payée</option>
              </select>
            </Champ>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Champ label="Montant TTC">
              <input
                type="number"
                min="0"
                step="0.01"
                className="champ"
                value={formulaire.montantTTC}
                onChange={(e) => setFormulaire({ ...formulaire, montantTTC: Number(e.target.value) })}
              />
            </Champ>
            <Champ label="Montant payé">
              <input
                type="number"
                min="0"
                step="0.01"
                className="champ"
                value={formulaire.montantPaye}
                onChange={(e) => setFormulaire({ ...formulaire, montantPaye: Number(e.target.value) })}
              />
            </Champ>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOuvert(false)} className="bouton-secondaire">
              Annuler
            </button>
            <button type="submit" className="bouton-principal">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Champ({ label, requis, children }: { label: string; requis?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="etiquette">
        {label} {requis && <span className="text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}
