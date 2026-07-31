"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Search } from "lucide-react";
import { apiGet, apiPost, formaterMontant, ErreurAPI } from "@/lib/api-client";

type Client = { id: string; nom: string; societe: string | null };
type Produit = {
  id: string;
  nom: string;
  codeProduit: string;
  prixVente: string;
  prixPromo: string | null;
  tauxTVA: string;
  quantiteStock: string;
  unite: string;
};

type LignePanier = {
  produit: Produit;
  quantite: number;
  remisePct: number;
  prixUnitaire: number;
};

export default function PageNouvelleVente() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [rechercheProduit, setRechercheProduit] = useState("");
  const [suggestions, setSuggestions] = useState<Produit[]>([]);
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [commentaires, setCommentaires] = useState("");
  const [enregistrerReglement, setEnregistrerReglement] = useState(false);
  const [montantReglement, setMontantReglement] = useState("");
  const [modeReglement, setModeReglement] = useState<"ESPECES" | "VIREMENT" | "CHEQUE" | "TRAITE" | "CARTE_BANCAIRE">("ESPECES");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ donnees: Client[] }>("/api/clients?taille=100").then((r) => setClients(r.donnees));
  }, []);

  useEffect(() => {
    if (rechercheProduit.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const identifiant = setTimeout(async () => {
      const reponse = await apiGet<{ donnees: Produit[] }>(
        `/api/produits?recherche=${encodeURIComponent(rechercheProduit)}&taille=8&statut=ACTIF`
      );
      setSuggestions(reponse.donnees);
    }, 200);
    return () => clearTimeout(identifiant);
  }, [rechercheProduit]);

  function ajouterAuPanier(produit: Produit) {
    setRechercheProduit("");
    setSuggestions([]);
    setPanier((p) => {
      const existante = p.find((l) => l.produit.id === produit.id);
      if (existante) {
        return p.map((l) => (l.produit.id === produit.id ? { ...l, quantite: l.quantite + 1 } : l));
      }
      const prix = produit.prixPromo ? Number(produit.prixPromo) : Number(produit.prixVente);
      return [...p, { produit, quantite: 1, remisePct: 0, prixUnitaire: prix }];
    });
  }

  function modifierLigne(produitId: string, champ: keyof LignePanier, valeur: number) {
    setPanier((p) => p.map((l) => (l.produit.id === produitId ? { ...l, [champ]: valeur } : l)));
  }

  function retirerLigne(produitId: string) {
    setPanier((p) => p.filter((l) => l.produit.id !== produitId));
  }

  const totaux = useMemo(() => {
    let sousTotalHT = 0;
    let totalRemise = 0;
    let totalTVA = 0;
    let totalTTC = 0;
    for (const l of panier) {
      const avantRemise = l.prixUnitaire * l.quantite;
      const remise = avantRemise * (l.remisePct / 100);
      const ht = avantRemise - remise;
      const tva = ht * (Number(l.produit.tauxTVA) / 100);
      sousTotalHT += avantRemise;
      totalRemise += remise;
      totalTVA += tva;
      totalTTC += ht + tva;
    }
    return { sousTotalHT, totalRemise, totalTVA, totalTTC };
  }, [panier]);

  async function validerVente() {
    if (!clientId) {
      setErreur("Veuillez choisir un client.");
      return;
    }
    if (panier.length === 0) {
      setErreur("Ajoutez au moins un produit.");
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await apiPost<{ donnees: { id: string } }>("/api/ventes", {
        clientId,
        commentaires,
        lignes: panier.map((l) => ({
          produitId: l.produit.id,
          quantite: l.quantite,
          remisePct: l.remisePct,
          prixUnitaire: l.prixUnitaire,
        })),
        reglementImmediat:
          enregistrerReglement && montantReglement
            ? { montant: Number(montantReglement), mode: modeReglement }
            : undefined,
      });
      router.push(`/ventes/${reponse.donnees.id}`);
    } catch (e) {
      setErreur(e instanceof ErreurAPI ? e.message : "Impossible d'enregistrer la vente");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Nouvelle vente</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="carte">
            <label className="etiquette">Client</label>
            <select className="champ" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Selectionner un client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} {c.societe ? `(${c.societe})` : ""}
                </option>
              ))}
            </select>
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
                      onClick={() => ajouterAuPanier(p)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-navy-800"
                    >
                      <span>
                        {p.nom} <span className="text-slate-400">· {p.codeProduit}</span>
                      </span>
                      <span className="text-xs text-slate-500">
                        Stock : {Number(p.quantiteStock)} {p.unite}
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
                  <th className="w-24 px-3 py-2.5 text-xs font-semibold uppercase text-slate-500">Qte</th>
                  <th className="w-28 px-3 py-2.5 text-xs font-semibold uppercase text-slate-500">Prix unit.</th>
                  <th className="w-20 px-3 py-2.5 text-xs font-semibold uppercase text-slate-500">Remise %</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">Total TTC</th>
                  <th className="w-10 px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {panier.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                      Aucun produit ajoute. Utilisez la recherche ci-dessus.
                    </td>
                  </tr>
                )}
                {panier.map((l) => {
                  const avantRemise = l.prixUnitaire * l.quantite;
                  const remise = avantRemise * (l.remisePct / 100);
                  const ht = avantRemise - remise;
                  const ttc = ht * (1 + Number(l.produit.tauxTVA) / 100);
                  const depasseStock = l.quantite > Number(l.produit.quantiteStock);
                  return (
                    <tr key={l.produit.id}>
                      <td className="px-3 py-2">
                        <p className="font-medium">{l.produit.nom}</p>
                        {depasseStock && (
                          <p className="text-xs text-danger">
                            Stock disponible : {Number(l.produit.quantiteStock)} {l.produit.unite}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          className="champ !py-1"
                          value={l.quantite}
                          onChange={(e) => modifierLigne(l.produit.id, "quantite", Number(e.target.value))}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="champ !py-1"
                          value={l.prixUnitaire}
                          onChange={(e) => modifierLigne(l.produit.id, "prixUnitaire", Number(e.target.value))}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          className="champ !py-1"
                          value={l.remisePct}
                          onChange={(e) => modifierLigne(l.produit.id, "remisePct", Number(e.target.value))}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{formaterMontant(ttc)}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => retirerLigne(l.produit.id)} className="text-slate-400 hover:text-danger" aria-label="Retirer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="carte">
            <label className="etiquette">Commentaires</label>
            <textarea className="champ" rows={2} value={commentaires} onChange={(e) => setCommentaires(e.target.value)} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="carte space-y-2">
            <h3 className="mb-2 text-sm font-semibold">Recapitulatif</h3>
            <LigneTotal libelle="Sous-total HT" valeur={totaux.sousTotalHT} />
            <LigneTotal libelle="Remises" valeur={-totaux.totalRemise} />
            <LigneTotal libelle="TVA" valeur={totaux.totalTVA} />
            <div className="my-2 border-t border-slate-200 dark:border-slate-800" />
            <LigneTotal libelle="Total TTC" valeur={totaux.totalTTC} fort />
          </div>

          <div className="carte">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={enregistrerReglement}
                onChange={(e) => setEnregistrerReglement(e.target.checked)}
              />
              Encaisser un reglement immediat
            </label>
            {enregistrerReglement && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="etiquette">Montant</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="champ"
                    value={montantReglement}
                    onChange={(e) => setMontantReglement(e.target.value)}
                    placeholder={String(totaux.totalTTC.toFixed(2))}
                  />
                </div>
                <div>
                  <label className="etiquette">Mode de paiement</label>
                  <select className="champ" value={modeReglement} onChange={(e) => setModeReglement(e.target.value as any)}>
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

          <button onClick={validerVente} disabled={enCours} className="bouton-principal w-full">
            <Plus className="h-4 w-4" /> {enCours ? "Enregistrement..." : "Valider la vente"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LigneTotal({ libelle, valeur, fort }: { libelle: string; valeur: number; fort?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${fort ? "text-base font-semibold" : "text-slate-600 dark:text-slate-300"}`}>
      <span>{libelle}</span>
      <span className="tabular-nums">{formaterMontant(valeur)}</span>
    </div>
  );
}
