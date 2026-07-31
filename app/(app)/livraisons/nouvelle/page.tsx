"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Search } from "lucide-react";
import { apiGet, apiPost, formaterMontant, ErreurAPI } from "@/lib/api-client";

type Fournisseur = { id: string; nom: string; societe: string | null };
type Produit = { id: string; nom: string; codeProduit: string; prixAchat: string; unite: string };
type LigneBon = { produit: Produit; quantite: number; prixAchat: number };

export default function PageNouvelleLivraison() {
  const router = useRouter();
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [fournisseurId, setFournisseurId] = useState("");
  const [numeroBon, setNumeroBon] = useState("");
  const [rechercheProduit, setRechercheProduit] = useState("");
  const [suggestions, setSuggestions] = useState<Produit[]>([]);
  const [lignes, setLignes] = useState<LigneBon[]>([]);
  const [commentaires, setCommentaires] = useState("");
  const [enregistrerPaiement, setEnregistrerPaiement] = useState(false);
  const [montantPaiement, setMontantPaiement] = useState("");
  const [modePaiement, setModePaiement] = useState("VIREMENT");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ donnees: Fournisseur[] }>("/api/fournisseurs?taille=100").then((r) => setFournisseurs(r.donnees));
  }, []);

  useEffect(() => {
    if (rechercheProduit.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const id = setTimeout(async () => {
      const reponse = await apiGet<{ donnees: Produit[] }>(
        `/api/produits?recherche=${encodeURIComponent(rechercheProduit)}&taille=8`
      );
      setSuggestions(reponse.donnees);
    }, 200);
    return () => clearTimeout(id);
  }, [rechercheProduit]);

  function ajouter(produit: Produit) {
    setRechercheProduit("");
    setSuggestions([]);
    setLignes((l) => {
      const existante = l.find((x) => x.produit.id === produit.id);
      if (existante) return l.map((x) => (x.produit.id === produit.id ? { ...x, quantite: x.quantite + 1 } : x));
      return [...l, { produit, quantite: 1, prixAchat: Number(produit.prixAchat) }];
    });
  }

  function modifier(produitId: string, champ: "quantite" | "prixAchat", valeur: number) {
    setLignes((l) => l.map((x) => (x.produit.id === produitId ? { ...x, [champ]: valeur } : x)));
  }

  function retirer(produitId: string) {
    setLignes((l) => l.filter((x) => x.produit.id !== produitId));
  }

  const totalHT = useMemo(() => lignes.reduce((s, l) => s + l.quantite * l.prixAchat, 0), [lignes]);

  async function valider() {
    if (!fournisseurId || !numeroBon || lignes.length === 0) {
      setErreur("Fournisseur, numero de bon et au moins un produit sont requis.");
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await apiPost<{ donnees: { id: string } }>("/api/livraisons", {
        fournisseurId,
        numeroBon,
        commentaires,
        lignes: lignes.map((l) => ({ produitId: l.produit.id, quantite: l.quantite, prixAchat: l.prixAchat })),
        paiementImmediat:
          enregistrerPaiement && montantPaiement ? { montant: Number(montantPaiement), mode: modePaiement } : undefined,
      });
      router.push(`/livraisons/${reponse.donnees.id}`);
    } catch (e) {
      setErreur(e instanceof ErreurAPI ? e.message : "Impossible d'enregistrer la livraison");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Nouvelle livraison fournisseur</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="carte grid grid-cols-2 gap-4">
            <div>
              <label className="etiquette">Fournisseur</label>
              <select className="champ" value={fournisseurId} onChange={(e) => setFournisseurId(e.target.value)}>
                <option value="">Selectionner...</option>
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiquette">Numero de bon</label>
              <input className="champ" value={numeroBon} onChange={(e) => setNumeroBon(e.target.value)} placeholder="BL-2026-001" />
            </div>
          </div>

          <div className="carte">
            <label className="etiquette">Ajouter un produit</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="champ pl-9"
                placeholder="Rechercher par nom ou code produit..."
                value={rechercheProduit}
                onChange={(e) => setRechercheProduit(e.target.value)}
              />
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-navy-900">
                  {suggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => ajouter(p)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-navy-800"
                    >
                      <span>
                        {p.nom} <span className="text-slate-400">· {p.codeProduit}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="carte !p-0 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-navy-900/50">
                <tr>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase text-slate-500">Produit</th>
                  <th className="w-28 px-3 py-2.5 text-xs font-semibold uppercase text-slate-500">Quantite</th>
                  <th className="w-32 px-3 py-2.5 text-xs font-semibold uppercase text-slate-500">Prix d'achat</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">Total</th>
                  <th className="w-10 px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lignes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                      Aucun produit ajoute.
                    </td>
                  </tr>
                )}
                {lignes.map((l) => (
                  <tr key={l.produit.id}>
                    <td className="px-3 py-2 font-medium">{l.produit.nom}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        className="champ !py-1"
                        value={l.quantite}
                        onChange={(e) => modifier(l.produit.id, "quantite", Number(e.target.value))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="champ !py-1"
                        value={l.prixAchat}
                        onChange={(e) => modifier(l.produit.id, "prixAchat", Number(e.target.value))}
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {formaterMontant(l.quantite * l.prixAchat)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => retirer(l.produit.id)} className="text-slate-400 hover:text-danger">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="carte">
            <label className="etiquette">Commentaires</label>
            <textarea className="champ" rows={2} value={commentaires} onChange={(e) => setCommentaires(e.target.value)} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="carte">
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formaterMontant(totalHT)}</span>
            </div>
          </div>

          <div className="carte">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={enregistrerPaiement} onChange={(e) => setEnregistrerPaiement(e.target.checked)} />
              Enregistrer un paiement immediat
            </label>
            {enregistrerPaiement && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="etiquette">Montant</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="champ"
                    value={montantPaiement}
                    onChange={(e) => setMontantPaiement(e.target.value)}
                  />
                </div>
                <div>
                  <label className="etiquette">Mode de paiement</label>
                  <select className="champ" value={modePaiement} onChange={(e) => setModePaiement(e.target.value)}>
                    <option value="ESPECES">Especes</option>
                    <option value="VIREMENT">Virement</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="TRAITE">Traite</option>
                    <option value="CARTE_BANCAIRE">Carte bancaire</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {erreur && <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erreur}</div>}

          <button onClick={valider} disabled={enCours} className="bouton-principal w-full">
            <Plus className="h-4 w-4" /> {enCours ? "Enregistrement..." : "Valider la livraison"}
          </button>
        </div>
      </div>
    </div>
  );
}
