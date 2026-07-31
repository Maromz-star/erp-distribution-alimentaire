"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { apiGet, apiPost, apiPut, formaterMontant, ErreurAPI } from "@/lib/api-client";
import { EnTetePage } from "@/components/ui";
import { DataTable, type Colonne } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { useRouter } from "next/navigation";

type Client = {
  id: string;
  nom: string;
  societe: string | null;
  telephone: string | null;
  ville: string | null;
  totalAchete: number;
  solde: number;
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
  commentaires: "",
};

export default function PageClients() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
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
      const reponse = await apiGet<{ donnees: Client[]; pagination: { pages: number } }>(
        `/api/clients?${params}`
      );
      setClients(reponse.donnees);
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
      await apiPost("/api/clients", formulaire);
      setModalOuvert(false);
      setFormulaire(ETAT_VIDE);
      charger();
    } catch (e) {
      setErreur(e instanceof ErreurAPI ? e.message : "Enregistrement impossible");
    } finally {
      setEnregistrement(false);
    }
  }

  const colonnes: Colonne<Client>[] = [
    {
      cle: "nom",
      entete: "Client",
      rendu: (c) => (
        <div>
          <p className="font-medium">{c.nom}</p>
          {c.societe && <p className="text-xs text-slate-500">{c.societe}</p>}
        </div>
      ),
    },
    { cle: "ville", entete: "Ville", rendu: (c) => c.ville ?? "—" },
    { cle: "telephone", entete: "Telephone", rendu: (c) => c.telephone ?? "—" },
    { cle: "totalAchete", entete: "Total achete", rendu: (c) => formaterMontant(c.totalAchete), alignement: "droite" },
    {
      cle: "solde",
      entete: "Solde",
      rendu: (c) => (
        <span className={c.solde > 0 ? "font-semibold text-danger" : "text-slate-500"}>
          {formaterMontant(c.solde)}
        </span>
      ),
      alignement: "droite",
    },
  ];

  return (
    <div>
      <EnTetePage
        titre="Clients"
        sousTitre="Base clients, historique et soldes"
        actions={
          <button onClick={() => setModalOuvert(true)} className="bouton-principal">
            <Plus className="h-4 w-4" /> Nouveau client
          </button>
        }
      />

      <DataTable
        colonnes={colonnes}
        lignes={clients}
        chargement={chargement}
        recherche={recherche}
        onRecherche={(v) => {
          setRecherche(v);
          setPage(1);
        }}
        placeholderRecherche="Rechercher un client..."
        page={page}
        pages={pages}
        onChangerPage={setPage}
        onClicLigne={(c) => router.push(`/clients/${c.id}`)}
        messageVide="Aucun client. Cliquez sur 'Nouveau client' pour commencer."
      />

      <Modal titre="Nouveau client" ouvert={modalOuvert} onFermer={() => setModalOuvert(false)} largeur="max-w-xl">
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
            <Champ label="Pays">
              <input className="champ" value={formulaire.pays} onChange={(e) => setFormulaire({ ...formulaire, pays: e.target.value })} />
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
          <Champ label="Commentaires">
            <textarea rows={2} className="champ" value={formulaire.commentaires} onChange={(e) => setFormulaire({ ...formulaire, commentaires: e.target.value })} />
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
