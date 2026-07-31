"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { apiGet, apiPut, ErreurAPI } from "@/lib/api-client";
import { EnTetePage } from "@/components/ui";

type ParametresEntreprise = {
  nom: string;
  adresse: string;
  ville: string;
  pays: string;
  telephone: string;
  email: string;
  ice: string;
  identifiantFiscal: string;
  registreCommerce: string;
  logoUrl: string;
};

const ETAT_VIDE: ParametresEntreprise = {
  nom: "",
  adresse: "",
  ville: "",
  pays: "Maroc",
  telephone: "",
  email: "",
  ice: "",
  identifiantFiscal: "",
  registreCommerce: "",
  logoUrl: "",
};

export default function PageParametresEntreprise() {
  const [formulaire, setFormulaire] = useState<ParametresEntreprise>(ETAT_VIDE);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    apiGet<{ donnees: ParametresEntreprise | null }>("/api/parametres-entreprise")
      .then((r) => {
        if (r.donnees) setFormulaire({ ...ETAT_VIDE, ...r.donnees });
      })
      .finally(() => setChargement(false));
  }, []);

  function gererLogo(fichier: File | undefined) {
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = () => setFormulaire((f) => ({ ...f, logoUrl: String(lecteur.result) }));
    lecteur.readAsDataURL(fichier);
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setErreur(null);
    setSucces(false);
    try {
      await apiPut("/api/parametres-entreprise", formulaire);
      setSucces(true);
    } catch (e) {
      setErreur(e instanceof ErreurAPI ? e.message : "Enregistrement impossible");
    } finally {
      setEnregistrement(false);
    }
  }

  if (chargement) return <p className="text-sm text-slate-400">Chargement...</p>;

  return (
    <div>
      <EnTetePage
        titre="Parametres de l'entreprise"
        sousTitre="Logo et informations legales utilises sur les documents PDF (factures, bons de livraison)"
      />

      <form onSubmit={enregistrer} className="carte max-w-3xl space-y-4">
        <Champ label="Logo de l'entreprise">
          <div className="flex items-center gap-4">
            {formulaire.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={formulaire.logoUrl}
                alt="Logo"
                className="h-16 w-16 rounded-lg bg-white object-contain p-1"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => gererLogo(e.target.files?.[0])}
              className="text-sm"
            />
          </div>
        </Champ>

        <div className="grid grid-cols-2 gap-4">
          <Champ label="Nom de l'entreprise" requis>
            <input
              required
              className="champ"
              value={formulaire.nom}
              onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
            />
          </Champ>
          <Champ label="Telephone">
            <input
              className="champ"
              value={formulaire.telephone}
              onChange={(e) => setFormulaire({ ...formulaire, telephone: e.target.value })}
            />
          </Champ>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Champ label="Email">
            <input
              type="email"
              className="champ"
              value={formulaire.email}
              onChange={(e) => setFormulaire({ ...formulaire, email: e.target.value })}
            />
          </Champ>
          <Champ label="Adresse">
            <input
              className="champ"
              value={formulaire.adresse}
              onChange={(e) => setFormulaire({ ...formulaire, adresse: e.target.value })}
            />
          </Champ>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Champ label="Ville">
            <input
              className="champ"
              value={formulaire.ville}
              onChange={(e) => setFormulaire({ ...formulaire, ville: e.target.value })}
            />
          </Champ>
          <Champ label="Pays">
            <input
              className="champ"
              value={formulaire.pays}
              onChange={(e) => setFormulaire({ ...formulaire, pays: e.target.value })}
            />
          </Champ>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Champ label="ICE">
            <input
              className="champ"
              value={formulaire.ice}
              onChange={(e) => setFormulaire({ ...formulaire, ice: e.target.value })}
            />
          </Champ>
          <Champ label="Identifiant fiscal">
            <input
              className="champ"
              value={formulaire.identifiantFiscal}
              onChange={(e) => setFormulaire({ ...formulaire, identifiantFiscal: e.target.value })}
            />
          </Champ>
          <Champ label="Registre de commerce">
            <input
              className="champ"
              value={formulaire.registreCommerce}
              onChange={(e) => setFormulaire({ ...formulaire, registreCommerce: e.target.value })}
            />
          </Champ>
        </div>

        {erreur && <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erreur}</div>}
        {succes && (
          <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">Parametres enregistres.</div>
        )}

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={enregistrement} className="bouton-principal">
            <Save className="h-4 w-4" /> {enregistrement ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
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
