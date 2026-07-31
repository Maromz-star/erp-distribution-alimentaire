"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Sliders, Search } from "lucide-react";
import { apiGet, apiPost, formaterMontant, formaterDate, ErreurAPI } from "@/lib/api-client";
import { EnTetePage, StatutBadge } from "@/components/ui";
import { DataTable, type Colonne } from "@/components/DataTable";
import { Modal } from "@/components/Modal";

type Mouvement = {
  id: string;
  type: string;
  quantite: string;
  stockApres: string;
  reference: string | null;
  motif: string | null;
  creeLe: string;
  produit: { nom: string; codeProduit: string; unite: string };
  utilisateur: { nom: string } | null;
};

type Produit = {
  id: string;
  nom: string;
  codeProduit: string;
  quantiteStock: string;
  stockMin: string;
  unite: string;
  prixAchat: string;
};

const LIBELLES_TYPE: Record<string, string> = {
  ENTREE_LIVRAISON: "Entree (livraison)",
  SORTIE_VENTE: "Sortie (vente)",
  AJUSTEMENT_POSITIF: "Ajustement +",
  AJUSTEMENT_NEGATIF: "Ajustement -",
  INVENTAIRE: "Stock initial",
};

export default function PageStock() {
  const searchParams = useSearchParams();
  const filtreInitial = searchParams.get("filtre");

  const [onglet, setOnglet] = useState<"mouvements" | "alertes">(filtreInitial ? "alertes" : "mouvements");
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [produits, setProduits] = useState<Produit[]>([]);
  const [rechercheProduit, setRechercheProduit] = useState("");
  const [suggestions, setSuggestions] = useState<Produit[]>([]);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [produitSelectionne, setProduitSelectionne] = useState<Produit | null>(null);
  const [nouvelleQuantite, setNouvelleQuantite] = useState("");
  const [motif, setMotif] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const chargerMouvements = useCallback(async () => {
    setChargement(true);
    try {
      const reponse = await apiGet<{ donnees: Mouvement[]; pagination: { pages: number } }>(
        `/api/stock?page=${page}&taille=30`
      );
      setMouvements(reponse.donnees);
      setPages(reponse.pagination.pages);
    } finally {
      setChargement(false);
    }
  }, [page]);

  const chargerAlertes = useCallback(async () => {
    setChargement(true);
    try {
      const reponse = await apiGet<{ donnees: Produit[] }>(`/api/produits?stockFaible=true&taille=100`);
      setProduits(reponse.donnees);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    if (onglet === "mouvements") chargerMouvements();
    else chargerAlertes();
  }, [onglet, chargerMouvements, chargerAlertes]);

  useEffect(() => {
    if (rechercheProduit.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const id = setTimeout(async () => {
      const reponse = await apiGet<{ donnees: Produit[] }>(`/api/produits?recherche=${encodeURIComponent(rechercheProduit)}&taille=8`);
      setSuggestions(reponse.donnees);
    }, 200);
    return () => clearTimeout(id);
  }, [rechercheProduit]);

  function ouvrirAjustement(produit: Produit) {
    setProduitSelectionne(produit);
    setNouvelleQuantite(String(Number(produit.quantiteStock)));
    setMotif("");
    setErreur(null);
    setModalOuvert(true);
    setRechercheProduit("");
    setSuggestions([]);
  }

  async function enregistrerAjustement(e: React.FormEvent) {
    e.preventDefault();
    if (!produitSelectionne) return;
    setEnCours(true);
    setErreur(null);
    try {
      await apiPost("/api/stock/ajustement", {
        produitId: produitSelectionne.id,
        nouvelleQuantite: Number(nouvelleQuantite),
        motif,
      });
      setModalOuvert(false);
      if (onglet === "mouvements") chargerMouvements();
      else chargerAlertes();
    } catch (e) {
      setErreur(e instanceof ErreurAPI ? e.message : "Ajustement impossible");
    } finally {
      setEnCours(false);
    }
  }

  const colonnesMouvements: Colonne<Mouvement>[] = [
    { cle: "date", entete: "Date", rendu: (m) => formaterDate(m.creeLe) },
    { cle: "produit", entete: "Produit", rendu: (m) => `${m.produit.nom} (${m.produit.codeProduit})` },
    { cle: "type", entete: "Type", rendu: (m) => LIBELLES_TYPE[m.type] ?? m.type },
    {
      cle: "quantite",
      entete: "Quantite",
      rendu: (m) => {
        const sortie = m.type === "SORTIE_VENTE" || m.type === "AJUSTEMENT_NEGATIF";
        return (
          <span className={sortie ? "text-danger" : "text-success"}>
            {sortie ? "-" : "+"}
            {Number(m.quantite)} {m.produit.unite}
          </span>
        );
      },
      alignement: "droite",
    },
    { cle: "stockApres", entete: "Stock apres", rendu: (m) => `${Number(m.stockApres)} ${m.produit.unite}`, alignement: "droite" },
    { cle: "reference", entete: "Reference", rendu: (m) => m.reference ?? m.motif ?? "—" },
    { cle: "utilisateur", entete: "Par", rendu: (m) => m.utilisateur?.nom ?? "—" },
  ];

  const colonnesAlertes: Colonne<Produit>[] = [
    { cle: "produit", entete: "Produit", rendu: (p) => `${p.nom} (${p.codeProduit})` },
    { cle: "stock", entete: "Stock actuel", rendu: (p) => <span className="font-semibold text-danger">{Number(p.quantiteStock)} {p.unite}</span>, alignement: "droite" },
    { cle: "stockMin", entete: "Stock min.", rendu: (p) => `${Number(p.stockMin)} ${p.unite}`, alignement: "droite" },
    {
      cle: "statut",
      entete: "Statut",
      rendu: (p) => (Number(p.quantiteStock) <= 0 ? <StatutBadge statut="RUPTURE" texte="Rupture" /> : <StatutBadge statut="FAIBLE" texte="Stock faible" />),
    },
    {
      cle: "actions",
      entete: "",
      rendu: (p) => (
        <button onClick={() => ouvrirAjustement(p)} className="bouton-secondaire !px-3 !py-1.5 text-xs">
          Ajuster
        </button>
      ),
      alignement: "droite",
    },
  ];

  return (
    <div>
      <EnTetePage
        titre="Stock"
        sousTitre="Mouvements, alertes et ajustements d'inventaire"
        actions={
          <button
            onClick={() => {
              setProduitSelectionne(null);
              setRechercheProduit("");
              setModalOuvert(true);
            }}
            className="bouton-principal"
          >
            <Sliders className="h-4 w-4" /> Ajuster un produit
          </button>
        }
      />

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setOnglet("mouvements")}
          className={onglet === "mouvements" ? "bouton-principal !py-1.5" : "bouton-secondaire !py-1.5"}
        >
          Mouvements
        </button>
        <button
          onClick={() => setOnglet("alertes")}
          className={onglet === "alertes" ? "bouton-principal !py-1.5" : "bouton-secondaire !py-1.5"}
        >
          Alertes stock faible
        </button>
      </div>

      {onglet === "mouvements" ? (
        <DataTable
          colonnes={colonnesMouvements}
          lignes={mouvements}
          chargement={chargement}
          page={page}
          pages={pages}
          onChangerPage={setPage}
          messageVide="Aucun mouvement de stock enregistre."
        />
      ) : (
        <DataTable
          colonnes={colonnesAlertes}
          lignes={produits}
          chargement={chargement}
          messageVide="Aucun produit en stock faible ou en rupture. 👍"
        />
      )}

      <Modal titre="Ajustement de stock" ouvert={modalOuvert} onFermer={() => setModalOuvert(false)}>
        <form onSubmit={enregistrerAjustement} className="space-y-4">
          {!produitSelectionne ? (
            <div>
              <label className="etiquette">Produit</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="champ pl-9"
                  placeholder="Rechercher un produit..."
                  value={rechercheProduit}
                  onChange={(e) => setRechercheProduit(e.target.value)}
                  autoFocus
                />
                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-navy-900">
                    {suggestions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => ouvrirAjustement(p)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-navy-800"
                      >
                        {p.nom} <span className="text-slate-400">· {p.codeProduit}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium">{produitSelectionne.nom}</p>
                <p className="text-xs text-slate-500">
                  Stock actuel : {Number(produitSelectionne.quantiteStock)} {produitSelectionne.unite}
                </p>
              </div>
              <div>
                <label className="etiquette">Nouvelle quantite en stock</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.001"
                  className="champ"
                  value={nouvelleQuantite}
                  onChange={(e) => setNouvelleQuantite(e.target.value)}
                />
              </div>
              <div>
                <label className="etiquette">Motif de l'ajustement</label>
                <input
                  required
                  className="champ"
                  placeholder="Ex : casse, erreur de comptage, peremption..."
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                />
              </div>
              {erreur && <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erreur}</div>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModalOuvert(false)} className="bouton-secondaire">
                  Annuler
                </button>
                <button type="submit" disabled={enCours} className="bouton-principal">
                  {enCours ? "Enregistrement..." : "Confirmer l'ajustement"}
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
