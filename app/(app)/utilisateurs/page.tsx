"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { apiGet, apiPost, apiPut, ErreurAPI } from "@/lib/api-client";
import { EnTetePage, StatutBadge } from "@/components/ui";
import { DataTable, type Colonne } from "@/components/DataTable";
import { Modal } from "@/components/Modal";

type Utilisateur = {
  id: string;
  nom: string;
  email: string;
  role: "ADMIN" | "EMPLOYE" | "COMMERCIAL";
  actif: boolean;
};

export default function PageUtilisateurs() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [role, setRole] = useState<"ADMIN" | "EMPLOYE" | "COMMERCIAL">("EMPLOYE");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const reponse = await apiGet<{ donnees: Utilisateur[] }>("/api/utilisateurs");
      setUtilisateurs(reponse.donnees);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      await apiPost("/api/utilisateurs", { nom, email, motDePasse, role });
      setModalOuvert(false);
      setNom("");
      setEmail("");
      setMotDePasse("");
      setRole("EMPLOYE");
      charger();
    } catch (e) {
      setErreur(e instanceof ErreurAPI ? e.message : "Creation impossible");
    } finally {
      setEnCours(false);
    }
  }

  async function basculerActif(u: Utilisateur) {
    await apiPut(`/api/utilisateurs/${u.id}`, { actif: !u.actif }).catch(() => {});
    charger();
  }

  const colonnes: Colonne<Utilisateur>[] = [
    { cle: "nom", entete: "Nom", rendu: (u) => u.nom },
    { cle: "email", entete: "Email", rendu: (u) => u.email },
    { cle: "role", entete: "Role", rendu: (u) => u.role },
    { cle: "statut", entete: "Statut", rendu: (u) => <StatutBadge statut={u.actif ? "ACTIF" : "INACTIF"} texte={u.actif ? "Actif" : "Desactive"} /> },
    {
      cle: "actions",
      entete: "",
      rendu: (u) => (
        <button onClick={() => basculerActif(u)} className="bouton-secondaire !px-3 !py-1.5 text-xs">
          {u.actif ? "Desactiver" : "Reactiver"}
        </button>
      ),
      alignement: "droite",
    },
  ];

  return (
    <div>
      <EnTetePage
        titre="Utilisateurs"
        sousTitre="Comptes et roles d'acces a l'application"
        actions={
          <button onClick={() => setModalOuvert(true)} className="bouton-principal">
            <Plus className="h-4 w-4" /> Nouvel utilisateur
          </button>
        }
      />

      <DataTable colonnes={colonnes} lignes={utilisateurs} chargement={chargement} messageVide="Aucun utilisateur." />

      <Modal titre="Nouvel utilisateur" ouvert={modalOuvert} onFermer={() => setModalOuvert(false)}>
        <form onSubmit={creer} className="space-y-4">
          <div>
            <label className="etiquette">Nom complet</label>
            <input required className="champ" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div>
            <label className="etiquette">Email</label>
            <input required type="email" className="champ" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="etiquette">Mot de passe (8 caracteres minimum)</label>
            <input required minLength={8} type="password" className="champ" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          </div>
          <div>
            <label className="etiquette">Role</label>
            <select className="champ" value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="ADMIN">Administrateur - acces total</option>
              <option value="EMPLOYE">Employe - operations metier</option>
              <option value="COMMERCIAL">Commercial - ventes et clients</option>
            </select>
          </div>
          {erreur && <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erreur}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOuvert(false)} className="bouton-secondaire">
              Annuler
            </button>
            <button type="submit" disabled={enCours} className="bouton-principal">
              {enCours ? "Creation..." : "Creer l'utilisateur"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
