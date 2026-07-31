"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Archive, ImagePlus } from "lucide-react";
import { apiGet, apiPost, apiPut, formaterMontant, ErreurAPI } from "@/lib/api-client";
import { EnTetePage, StatutBadge } from "@/components/ui";
import { DataTable, type Colonne } from "@/components/DataTable";
import { Modal } from "@/components/Modal";

type Produit = {
  id: string;
  codeProduit: string;
  nom: string;
  prixAchat: string;
  prixVente: string;
  tauxTVA: string;
  unite: string;
  quantiteStock: string;
  stockMin: string;
  statut: string;
  photoPrincipale: string | null;
};

const ETAT_VIDE = {
  codeProduit: "",
  nom: "",
  description: "",
  prixAchat: "",
  prixVente: "",
  prixPromo: "",
  tauxTVA: "20",
  unite: "unite",
  quantiteStock: "0",
  stockMin: "0",
  stockMax: "",
  emplacement: "",
  photoPrincipale: "" as string | null,
};

export default function PageProduits() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [modalOuvert, setModalOuvert] = useState(false);
  const [produitEnEdition, setProduitEnEdition] = useState<string | null>(null);
  const [formulaire, setFormulaire] = useState(ETAT_VIDE);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState<string | null>(null);
  const [televersement, setTeleversement] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const params = new URLSearchParams({ page: String(page), taille: "20" });
      if (recherche) params.set("recherche", recherche);
      const reponse = await apiGet<{ donnees: Produit[]; pagination: { pages: number } }>(
        `/api/produits?${params}`
      );
      setProduits(reponse.donnees);
      setPages(reponse.pagination.pages);
    } finally {
      setChargement(false);
    }
  }, [page, recherche]);

  useEffect(() => {
    charger();
  }, [charger]);

  function ouvrirCreation() {
    setProduitEnEdition(null);
    setFormulaire(ETAT_VIDE);
    setErreurFormulaire(null);
    setModalOuvert(true);
  }

  async function ouvrirEdition(produit: Produit) {
    setProduitEnEdition(produit.id);
    setErreurFormulaire(null);
    const reponse = await apiGet<{ donnees: any }>(`/api/produits/${produit.id}`);
    const p = reponse.donnees;
    setFormulaire({
      codeProduit: p.codeProduit,
      nom: p.nom,
      description: p.description ?? "",
      prixAchat: String(p.prixAchat),
      prixVente: String(p.prixVente),
      prixPromo: p.prixPromo ? String(p.prixPromo) : "",
      tauxTVA: String(p.tauxTVA),
      unite: p.unite,
      quantiteStock: String(p.quantiteStock),
      stockMin: String(p.stockMin),
      stockMax: p.stockMax ? String(p.stockMax) : "",
      emplacement: p.emplacement ?? "",
      photoPrincipale: p.photoPrincipale,
    });
    setModalOuvert(true);
  }

  async function televerserPhoto(fichier: File) {
    setTeleversement(true);
    try {
      const donneesFormulaire = new FormData();
      donneesFormulaire.append("fichier", fichier);
      const reponse = await apiPost<{ donnees: { url: string } }>("/api/upload", donneesFormulaire);
      setFormulaire((f) => ({ ...f, photoPrincipale: reponse.donnees.url }));
    } catch (e) {
      setErreurFormulaire(e instanceof ErreurAPI ? e.message : "Televersement impossible");
    } finally {
      setTeleversement(false);
    }
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setErreurFormulaire(null);
    try {
      if (produitEnEdition) {
        await apiPut(`/api/produits/${produitEnEdition}`, formulaire);
      } else {
        await apiPost("/api/produits", formulaire);
      }
      setModalOuvert(false);
      charger();
    } catch (e) {
      setErreurFormulaire(e instanceof ErreurAPI ? e.message : "Enregistrement impossible");
    } finally {
      setEnregistrement(false);
    }
  }

  async function archiver(produit: Produit) {
    if (!confirm(`Archiver le produit "${produit.nom}" ? Il ne sera plus visible dans les ventes.`)) return;
    await apiPut(`/api/produits/${produit.id}`, { statut: "ARCHIVE" });
    charger();
  }

  const colonnes: Colonne<Produit>[] = [
    {
      cle: "nom",
      entete: "Produit",
      rendu: (p) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-navy-800">
            {p.photoPrincipale ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photoPrincipale} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-4 w-4 text-slate-400" />
            )}
          </div>
          <div>
            <p className="font-medium">{p.nom}</p>
            <p className="text-xs text-slate-500">{p.codeProduit}</p>
          </div>
        </div>
      ),
    },
    { cle: "prixVente", entete: "Prix de vente", rendu: (p) => formaterMontant(p.prixVente), alignement: "droite" },
    {
      cle: "stock",
      entete: "Stock",
      rendu: (p) => (
        <span className={Number(p.quantiteStock) <= Number(p.stockMin) ? "font-semibold text-danger" : ""}>
          {Number(p.quantiteStock)} {p.unite}
        </span>
      ),
      alignement: "droite",
    },
    { cle: "statut", entete: "Statut", rendu: (p) => <StatutBadge statut={p.statut} /> },
    {
      cle: "actions",
      entete: "",
      rendu: (p) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              ouvrirEdition(p);
            }}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800"
            aria-label="Modifier"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              archiver(p);
            }}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800"
            aria-label="Archiver"
          >
            <Archive className="h-4 w-4" />
          </button>
        </div>
      ),
      alignement: "droite",
    },
  ];

  return (
    <div>
      <EnTetePage
        titre="Produits"
        sousTitre="Catalogue, prix et niveaux de stock"
        actions={
          <button onClick={ouvrirCreation} className="bouton-principal">
            <Plus className="h-4 w-4" /> Nouveau produit
          </button>
        }
      />

      <DataTable
        colonnes={colonnes}
        lignes={produits}
        chargement={chargement}
        recherche={recherche}
        onRecherche={(v) => {
          setRecherche(v);
          setPage(1);
        }}
        placeholderRecherche="Rechercher par nom ou code..."
        page={page}
        pages={pages}
        onChangerPage={setPage}
        onClicLigne={ouvrirEdition}
        messageVide="Aucun produit. Cliquez sur 'Nouveau produit' pour commencer."
      />

      <Modal
        titre={produitEnEdition ? "Modifier le produit" : "Nouveau produit"}
        ouvert={modalOuvert}
        onFermer={() => setModalOuvert(false)}
        largeur="max-w-2xl"
      >
        <form onSubmit={enregistrer} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-navy-800">
              {formulaire.photoPrincipale ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={formulaire.photoPrincipale} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <label className="bouton-secondaire cursor-pointer text-xs">
              {televersement ? "Televersement..." : "Choisir une photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && televerserPhoto(e.target.files[0])}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Champ label="Code produit" requis>
              <input
                required
                className="champ"
                value={formulaire.codeProduit}
                onChange={(e) => setFormulaire({ ...formulaire, codeProduit: e.target.value })}
              />
            </Champ>
            <Champ label="Nom" requis>
              <input
                required
                className="champ"
                value={formulaire.nom}
                onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
              />
            </Champ>
          </div>

          <Champ label="Description">
            <textarea
              className="champ"
              rows={2}
              value={formulaire.description}
              onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
            />
          </Champ>

          <div className="grid grid-cols-3 gap-4">
            <Champ label="Prix d'achat" requis>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                className="champ"
                value={formulaire.prixAchat}
                onChange={(e) => setFormulaire({ ...formulaire, prixAchat: e.target.value })}
              />
            </Champ>
            <Champ label="Prix de vente" requis>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                className="champ"
                value={formulaire.prixVente}
                onChange={(e) => setFormulaire({ ...formulaire, prixVente: e.target.value })}
              />
            </Champ>
            <Champ label="Prix promo">
              <input
                type="number"
                step="0.01"
                min="0"
                className="champ"
                value={formulaire.prixPromo}
                onChange={(e) => setFormulaire({ ...formulaire, prixPromo: e.target.value })}
              />
            </Champ>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Champ label="TVA (%)">
              <input
                type="number"
                step="0.01"
                className="champ"
                value={formulaire.tauxTVA}
                onChange={(e) => setFormulaire({ ...formulaire, tauxTVA: e.target.value })}
              />
            </Champ>
            <Champ label="Unite">
              <input
                className="champ"
                value={formulaire.unite}
                onChange={(e) => setFormulaire({ ...formulaire, unite: e.target.value })}
                placeholder="unite, kg, carton..."
              />
            </Champ>
            <Champ label="Emplacement">
              <input
                className="champ"
                value={formulaire.emplacement}
                onChange={(e) => setFormulaire({ ...formulaire, emplacement: e.target.value })}
                placeholder="Depot A - Rayon 3"
              />
            </Champ>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {!produitEnEdition && (
              <Champ label="Stock initial">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  className="champ"
                  value={formulaire.quantiteStock}
                  onChange={(e) => setFormulaire({ ...formulaire, quantiteStock: e.target.value })}
                />
              </Champ>
            )}
            <Champ label="Stock minimum">
              <input
                type="number"
                step="0.001"
                min="0"
                className="champ"
                value={formulaire.stockMin}
                onChange={(e) => setFormulaire({ ...formulaire, stockMin: e.target.value })}
              />
            </Champ>
            <Champ label="Stock maximum">
              <input
                type="number"
                step="0.001"
                min="0"
                className="champ"
                value={formulaire.stockMax}
                onChange={(e) => setFormulaire({ ...formulaire, stockMax: e.target.value })}
              />
            </Champ>
          </div>

          {produitEnEdition && (
            <p className="text-xs text-slate-500">
              Le stock ne se modifie pas ici : utilisez une livraison, une vente, ou un ajustement
              d'inventaire (page Stock) pour garder un historique complet et fiable.
            </p>
          )}

          {erreurFormulaire && (
            <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erreurFormulaire}</div>
          )}

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
