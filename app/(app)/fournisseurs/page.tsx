"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, formaterMontant, ErreurAPI } from "@/lib/api-client";
import { EnTetePage } from "@/components/ui";
import { DataTable, type Colonne } from "@/components/DataTable";
import { Modal } from "@/components/Modal";

type Fournisseur = {
  id: string;
  nom: string;
  societe: string | null;
  telephone: string | null;
  ville: string | null;
  totalAchete: number;
  resteAPayer: number;
};

const ETAT_VIDE = {
  nom: "",
  societe: "",
  telephone: "",
  mobile: "",
  email: "",
  adresse: "",
  ville: "",
  pays: "Maroc",
  ice: "",
  identifiantFiscal: "",
  registreCommerce: "",
  personneContact: "",
  conditionsPaiement: "",
};

export default function PageFournisseurs() {
  const router = useRouter();
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [formulaire, setFormulaire] = useState(ETAT_VIDE);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const params = new URLSearchParams({ page: String(page), taille: "20" });
      if (recherche) params.set("recherche", recherche);
      const reponse = await apiGet<{ donnees: Fournisseur[]; pagination: { pages: number } }>(
        `/api/fournisseurs?${params}`
      );
      setFournisseurs(reponse.donnees);
      setPages(reponse.pagination.pages);
    } finally {
      setChargement(false);
    }
  }, [page, recherche]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setErreur(null);
    try {
      await apiPost("/api/fournisseurs", formulaire);
      setModalOuvert(false);
      setFormulaire(ETAT_VIDE);
      charger();
    } catch (e) {
      setErreur(e instanceof ErreurAPI ? e.message : "Enregistrement impossible");
    } finally {
      setEnregistrement(false);
    }
  }

  const colonnes: Colonne<Fournisseur>[] = [
    {
      cle: "nom",
      entete: "Fournisseur",
      rendu: (f) => (
        <div>
          <p className="font-medium">{f.nom}</p>
          {f.societe && <p className="text-xs text-slate-500">{f.societe}</p>}
        </div>
      ),
    },
    { cle: "ville", entete: "Ville", rendu: (f) => f.ville ?? "—" },
    { cle: "telephone", entete: "Telephone", rendu: (f) => f.telephone ?? "—" },
    { cle: "totalAchete", entete: "Total achete", rendu: (f) => formaterMontant(f.totalAchete), alignement: "droite" },
    {
      cle: "resteAPayer",
      entete: "Reste a payer",
      rendu: (f) => (
        <span className={f.resteAPayer > 0 ? "font-semibold text-warning" : "text-slate-500"}>
          {formaterMontant(f.resteAPayer)}
        </span>
      ),
      alignement: "droite",
    },
  ];

  return (
    <div>
      <EnTetePage
        titre="Fournisseurs"
        sousTitre="Base fournisseurs, historique et montants dus"
        actions={
          <button onClick={() => setModalOuvert(true)} className="bouton-principal">
            <Plus className="h-4 w-4" /> Nouveau fournisseur
          </button>
        }
      />

      <DataTable
        colonnes={colonnes}
        lignes={fournisseurs}
        chargement={chargement}
        recherche={recherche}
        onRecherche={(v) => {
          setRecherche(v);
          setPage(1);
        }}
        placeholderRecherche="Rechercher un fournisseur..."
        page={page}
        pages={pages}
        onChangerPage={setPage}
        onClicLigne={(f) => router.push(`/fournisseurs/${f.id}`)}
        messageVide="Aucun fournisseur. Cliquez sur 'Nouveau fournisseur' pour commencer."
      />

      <Modal titre="Nouveau fournisseur" ouvert={modalOuvert} onFermer={() => setModalOuvert(false)} largeur="max-w-xl">
        <form onSubmit={enregistrer} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Nom" requis>
              <input required className="champ" value={formulaire.nom} onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })} />
            </Champ>
            <Champ label="Societe">
              <input className="champ" value={formulaire.societe} onChange={(e) => setFormulaire({ ...formulaire, societe: e.target.value })} />
            </Champ>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Telephone">
              <input className="champ" value={formulaire.telephone} onChange={(e) => setFormulaire({ ...formulaire, telephone: e.target.value })} />
            </Champ>
            <Champ label="Email">
              <input type="email" className="champ" value={formulaire.email} onChange={(e) => setFormulaire({ ...formulaire, email: e.target.value })} />
            </Champ>
          </div>
          <Champ label="Adresse">
            <input className="champ" value={formulaire.adresse} onChange={(e) => setFormulaire({ ...formulaire, adresse: e.target.value })} />
          </Champ>
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Ville">
              <input className="champ" value={formulaire.ville} onChange={(e) => setFormulaire({ ...formulaire, ville: e.target.value })} />
            </Champ>
            <Champ label="Conditions de paiement">
              <input className="champ" placeholder="30 jours net" value={formulaire.conditionsPaiement} onChange={(e) => setFormulaire({ ...formulaire, conditionsPaiement: e.target.value })} />
            </Champ>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Champ label="ICE">
              <input className="champ" value={formulaire.ice} onChange={(e) => setFormulaire({ ...formulaire, ice: e.target.value })} />
            </Champ>
            <Champ label="Identifiant fiscal">
              <input className="champ" value={formulaire.identifiantFiscal} onChange={(e) => setFormulaire({ ...formulaire, identifiantFiscal: e.target.value })} />
            </Champ>
            <Champ label="Registre de commerce">
              <input className="champ" value={formulaire.registreCommerce} onChange={(e) => setFormulaire({ ...formulaire, registreCommerce: e.target.value })} />
            </Champ>
          </div>
          <Champ label="Personne a contacter">
            <input className="champ" value={formulaire.personneContact} onChange={(e) => setFormulaire({ ...formulaire, personneContact: e.target.value })} />
          </Champ>

          {erreur && <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erreur}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOuvert(false)} className="bouton-secondaire">
              Annuler
            </button>
            <button type="submit" disabled={enregistrement} className="bouton-principal">
              {enregistrement ? "Enregistrement..." : "Enregistrer"}
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
