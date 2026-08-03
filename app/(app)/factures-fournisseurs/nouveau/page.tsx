"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Search } from "lucide-react";
import { apiGet, apiPost, formaterMontant, ErreurAPI } from "@/lib/api-client";
import { EnTetePage } from "@/components/ui";

type Fournisseur = { id: string; nom: string; societe: string | null };
type Produit = {
  id: string;
  nom: string;
  codeProduit: string;
  prixAchat: string;
  unite: string;
};

type LignePanier = {
  produit: Produit;
  quantite: number;
  prixUnitaire: number;
};

function dateAujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

export default function PageNouvelleFactureFournisseur() {
  const router = useRouter();
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [fournisseurId, setFournisseurId] = useState("");
  const [numeroFacture, setNumeroFacture] = useState("");
  const [dateFacture, setDateFacture] = useState(dateAujourdhui());
  const [rechercheProduit, setRechercheProduit] = useState("");
  const [suggestions, setSuggestions] = useState<Produit[]>([]);
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [commentaires, setCommentaires] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    apiGet<{ donnees: Fournisseur[] }>("/api/fournisseurs?taille=100").then((r) => setFournisseurs(r.donnees));
  }, []);

  useEffect(() => {
    if (rechercheProduit.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      apiGet<{ donnees: Produit[] }>(
        "/api/produits?recherche=" + encodeURIComponent(rechercheProduit) + "&taille=8"
      ).then((r) => setSuggestions(r.donnees));
    }, 250);
    return () => clearTimeout(t);
  }, [rechercheProduit]);

  function ajouterProduit(produit: Produit) {
    setRechercheProduit("");
    setSuggestions([]);
    setPanier((p) => {
      const existant = p.find((l) => l.produit.id === produit.id);
      if (existant) {
        return p.map((l) => (l.produit.id === produit.id ? { ...l, quantite: l.quantite + 1 } : l));
      }
      return [...p, { produit, quantite: 1, prixUnitaire: Number(produit.prixAchat) }];
    });
  }

  function modifierLigne(produitId: string, champ: keyof LignePanier, valeur: number) {
    setPanier((p) => p.map((l) => (l.produit.id === produitId ? { ...l, [champ]: valeur } : l)));
  }

  function retirerLigne(produitId: string) {
    setPanier((p) => p.filter((l) => l.produit.id !== produitId));
  }

  const totalTTC = useMemo(() => panier.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0), [panier]);

  async function soumettre() {
    setErreur("");
    if (!fournisseurId) {
      setErreur("Choisissez un fournisseur.");
      return;
    }
    if (!numeroFacture.trim()) {
      setErreur("Indiquez le numero de facture du fournisseur.");
      return;
    }
    if (panier.length === 0) {
      setErreur("Ajoutez au moins un produit.");
      return;
    }
    setEnCours(true);
    try {
      const reponse = await apiPost<{ donnees: { id: string } }>("/api/factures-fournisseurs", {
        fournisseurId,
        numeroFacture: numeroFacture.trim(),
        dateFacture,
        commentaires: commentaires || null,
        lignes: panier.map((l) => ({
          produitId: l.produit.id,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
        })),
      });
      router.push("/factures-fournisseurs/" + reponse.donnees.id);
    } catch (e) {
      setErreur(e instanceof ErreurAPI ? e.message : "Une erreur est survenue.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div>
      <EnTetePage
        titre="Nouvelle facture fournisseur"
        sousTitre="Saisissez la facture recue du fournisseur pour suivre le solde a payer"
      />

      {erreur && (
        <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{erreur}</div>
      )}

      <div className="carte mb-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Fournisseur</label>
          <select value={fournisseurId} onChange={(e) => setFournisseurId(e.target.value)} className="champ">
            <option value="">Selectionner...</option>
            {fournisseurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.societe || f.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">N&deg; facture fournisseur</label>
          <input
            value={numeroFacture}
            onChange={(e) => setNumeroFacture(e.target.value)}
            placeholder="Ex: FF-2026-0456"
            className="champ"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Date facture</label>
          <input
            type="date"
            value={dateFacture}
            onChange={(e) => setDateFacture(e.target.value)}
            className="champ"
          />
        </div>
      </div>

      <div className="carte mb-4">
        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Ajouter un produit</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={rechercheProduit}
            onChange={(e) => setRechercheProduit(e.target.value)}
            placeholder="Nom ou code produit..."
            className="champ pl-9"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => ajouterProduit(p)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <span>
                    {p.nom} <span className="text-slate-400">- {p.codeProduit}</span>
                  </span>
                  <span className="text-slate-500">{formaterMontant(p.prixAchat)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="carte mb-4">
        {panier.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Aucun produit ajoute pour le moment.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 text-left text-xs font-semibold uppercase text-slate-500">Produit</th>
                <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Qte</th>
                <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Prix achat</th>
                <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Total</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {panier.map((l) => (
                <tr key={l.produit.id}>
                  <td className="py-2">{l.produit.nom}</td>
                  <td className="py-2 text-right">
                    <input
                      type="number"
                      min={0.001}
                      step={1}
                      value={l.quantite}
                      onChange={(e) => modifierLigne(l.produit.id, "quantite", Number(e.target.value))}
                      className="w-20 rounded border border-slate-200 px-2 py-1 text-right dark:border-slate-700 dark:bg-slate-800"
                    />
                  </td>
                  <td className="py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={l.prixUnitaire}
                      onChange={(e) => modifierLigne(l.produit.id, "prixUnitaire", Number(e.target.value))}
                      className="w-24 rounded border border-slate-200 px-2 py-1 text-right dark:border-slate-700 dark:bg-slate-800"
                    />
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums">
                    {formaterMontant(l.prixUnitaire * l.quantite)}
                  </td>
                  <td className="py-2 text-right">
                    <button onClick={() => retirerLigne(l.produit.id)} className="text-slate-400 hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="carte mb-4">
        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Commentaires</label>
        <textarea
          value={commentaires}
          onChange={(e) => setCommentaires(e.target.value)}
          className="champ"
          rows={2}
        />
      </div>

      <div className="carte flex items-center justify-between">
        <p className="text-base font-semibold">Total TTC : {formaterMontant(totalTTC)}</p>
        <button onClick={soumettre} disabled={enCours} className="bouton-principal">
          <Plus className="h-4 w-4" /> {enCours ? "Enregistrement..." : "Creer la facture"}
        </button>
      </div>
    </div>
  );
}
