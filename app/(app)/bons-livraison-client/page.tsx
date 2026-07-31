"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { EnTetePage, StatutBadge } from "@/components/ui";
import { DataTable, type Colonne } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { formaterDate, formaterMontant } from "@/lib/api-client";

type BonLivraisonClient = {
  id: string;
  numeroBL: string;
  client: string;
  dateLivraison: string;
  statut: string;
  totalTTC: number;
};

const ETAT_VIDE = {
  numeroBL: "",
  client: "",
  dateLivraison: new Date().toISOString().slice(0, 10),
  statut: "BROUILLON",
  totalTTC: 0,
};

const DONNEES_INITIALES: BonLivraisonClient[] = [
  {
    id: "bl-001",
    numeroBL: "BL-2026-001",
    client: "Société M A",
    dateLivraison: "2026-07-30",
    statut: "VALIDEE",
    totalTTC: 4200,
  },
  {
    id: "bl-002",
    numeroBL: "BL-2026-002",
    client: "Boulangerie Elite",
    dateLivraison: "2026-07-29",
    statut: "BROUILLON",
    totalTTC: 1860,
  },
];

export default function PageBonsLivraisonClient() {
  const [bons, setBons] = useState<BonLivraisonClient[]>(DONNEES_INITIALES);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [formulaire, setFormulaire] = useState(ETAT_VIDE);

  const colonnes = useMemo<Colonne<BonLivraisonClient>[]>(
    () => [
      {
        cle: "numeroBL",
        entete: "Bon de livraison",
        rendu: (b) => <span className="font-medium">{b.numeroBL}</span>,
      },
      { cle: "client", entete: "Client", rendu: (b) => b.client },
      { cle: "dateLivraison", entete: "Date", rendu: (b) => formaterDate(b.dateLivraison) },
      { cle: "totalTTC", entete: "Total TTC", rendu: (b) => formaterMontant(b.totalTTC), alignement: "droite" },
      {
        cle: "statut",
        entete: "Statut",
        rendu: (b) =>
          b.statut === "VALIDEE" ? <StatutBadge statut="VALIDEE" texte="Validé" /> : <StatutBadge statut="BROUILLON" texte="Brouillon" />,
      },
    ],
    []
  );

  function ajouterBon(e: React.FormEvent) {
    e.preventDefault();
    const nouveauBon: BonLivraisonClient = {
      id: `bl-${Date.now()}`,
      numeroBL: formulaire.numeroBL,
      client: formulaire.client,
      dateLivraison: formulaire.dateLivraison,
      statut: formulaire.statut,
      totalTTC: Number(formulaire.totalTTC),
    };

    setBons((courant) => [nouveauBon, ...courant]);
    setFormulaire(ETAT_VIDE);
    setModalOuvert(false);
  }

  return (
    <div>
      <EnTetePage
        titre="Bons de livraison client"
        sousTitre="Préparez les livraisons avant de lancer la facture client"
        actions={
          <button onClick={() => setModalOuvert(true)} className="bouton-principal">
            <Plus className="h-4 w-4" /> Nouveau bon
          </button>
        }
      />

      <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50/70 p-4 text-sm text-brand-900 dark:border-brand-900/40 dark:bg-brand-950/30 dark:text-brand-100">
        Ce module sert à générer le document de préparation de livraison client avant la facture. Le flux logique recommandé est : <strong>client → bon de livraison client → facture client</strong>.
      </div>

      <DataTable
        colonnes={colonnes}
        lignes={bons}
        chargement={false}
        page={1}
        pages={1}
        onChangerPage={() => {}}
        onClicLigne={(bon) => console.log("Voir", bon.id)}
        messageVide="Aucun bon de livraison client pour le moment."
      />

      <Modal titre="Nouveau bon de livraison client" ouvert={modalOuvert} onFermer={() => setModalOuvert(false)} largeur="max-w-xl">
        <form onSubmit={ajouterBon} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Numéro du bon" requis>
              <input
                required
                className="champ"
                value={formulaire.numeroBL}
                onChange={(e) => setFormulaire({ ...formulaire, numeroBL: e.target.value })}
              />
            </Champ>
            <Champ label="Client" requis>
              <input
                required
                className="champ"
                value={formulaire.client}
                onChange={(e) => setFormulaire({ ...formulaire, client: e.target.value })}
              />
            </Champ>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Champ label="Date de livraison" requis>
              <input
                type="date"
                required
                className="champ"
                value={formulaire.dateLivraison}
                onChange={(e) => setFormulaire({ ...formulaire, dateLivraison: e.target.value })}
              />
            </Champ>
            <Champ label="Statut">
              <select className="champ" value={formulaire.statut} onChange={(e) => setFormulaire({ ...formulaire, statut: e.target.value })}>
                <option value="BROUILLON">Brouillon</option>
                <option value="VALIDEE">Validé</option>
              </select>
            </Champ>
          </div>

          <Champ label="Total TTC">
            <input
              type="number"
              min="0"
              step="0.01"
              className="champ"
              value={formulaire.totalTTC}
              onChange={(e) => setFormulaire({ ...formulaire, totalTTC: Number(e.target.value) })}
            />
          </Champ>

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
