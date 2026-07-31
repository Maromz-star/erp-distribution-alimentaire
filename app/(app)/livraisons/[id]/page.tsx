"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { apiGet, apiPost, formaterMontant, formaterDate, ErreurAPI } from "@/lib/api-client";
import { Modal } from "@/components/Modal";

type Bon = {
  id: string;
  numeroBon: string;
  dateLivraison: string;
  totalTTC: string;
  montantPaye: string;
  commentaires: string | null;
  fournisseur: { id: string; nom: string };
  lignes: { id: string; quantite: string; prixAchat: string; totalLigne: string; produit: { nom: string; unite: string } }[];
};

export default function PageLivraisonDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bon, setBon] = useState<Bon | null>(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [montant, setMontant] = useState("");
  const [mode, setMode] = useState("VIREMENT");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function charger() {
    const reponse = await apiGet<{ donnees: Bon }>(`/api/livraisons/${id}`).catch(() => null);
    if (reponse) setBon(reponse.donnees);
  }

  useEffect(() => {
    charger();
  }, [id]);

  async function payer(e: React.FormEvent) {
    e.preventDefault();
    if (!bon) return;
    setEnCours(true);
    setErreur(null);
    try {
      await apiPost("/api/paiements-fournisseurs", {
        fournisseurId: bon.fournisseur.id,
        livraisonId: bon.id,
        montant: Number(montant),
        mode,
      });
      setModalOuvert(false);
      setMontant("");
      charger();
    } catch (e) {
      setErreur(e instanceof ErreurAPI ? e.message : "Impossible d'enregistrer le paiement");
    } finally {
      setEnCours(false);
    }
  }

  if (!bon) return <p className="text-sm text-slate-400">Chargement...</p>;

  const solde = Number(bon.totalTTC) - Number(bon.montantPaye);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => router.push("/livraisons")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Retour aux livraisons
        </button>
        {solde > 0 && (
          <button onClick={() => setModalOuvert(true)} className="bouton-principal">
            <Plus className="h-4 w-4" /> Enregistrer un paiement
          </button>
        )}
      </div>

      <div className="carte">
        <h1 className="text-2xl font-semibold">Bon {bon.numeroBon}</h1>
        <p className="mb-6 text-sm text-slate-500">
          {bon.fournisseur.nom} · {formaterDate(bon.dateLivraison)}
        </p>

        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-2 text-xs font-semibold uppercase text-slate-500">Produit</th>
              <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Quantite</th>
              <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Prix d'achat</th>
              <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {bon.lignes.map((l) => (
              <tr key={l.id}>
                <td className="py-2">{l.produit.nom}</td>
                <td className="py-2 text-right tabular-nums">
                  {Number(l.quantite)} {l.produit.unite}
                </td>
                <td className="py-2 text-right tabular-nums">{formaterMontant(l.prixAchat)}</td>
                <td className="py-2 text-right font-medium tabular-nums">{formaterMontant(l.totalLigne)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1.5">
            <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-semibold dark:border-slate-800">
              <span>Total</span>
              <span className="tabular-nums">{formaterMontant(bon.totalTTC)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>Paye</span>
              <span className="tabular-nums">{formaterMontant(bon.montantPaye)}</span>
            </div>
            <div className={`flex justify-between text-sm font-semibold ${solde > 0 ? "text-warning" : ""}`}>
              <span>Reste a payer</span>
              <span className="tabular-nums">{formaterMontant(solde)}</span>
            </div>
          </div>
        </div>

        {bon.commentaires && (
          <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-800">
            {bon.commentaires}
          </div>
        )}
      </div>

      <Modal titre="Enregistrer un paiement" ouvert={modalOuvert} onFermer={() => setModalOuvert(false)}>
        <form onSubmit={payer} className="space-y-4">
          <div>
            <label className="etiquette">Montant (reste a payer : {formaterMontant(solde)})</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              max={solde}
              className="champ"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
            />
          </div>
          <div>
            <label className="etiquette">Mode de paiement</label>
            <select className="champ" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="ESPECES">Especes</option>
              <option value="VIREMENT">Virement</option>
              <option value="CHEQUE">Cheque</option>
              <option value="TRAITE">Traite</option>
              <option value="CARTE_BANCAIRE">Carte bancaire</option>
            </select>
          </div>
          {erreur && <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erreur}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOuvert(false)} className="bouton-secondaire">
              Annuler
            </button>
            <button type="submit" disabled={enCours} className="bouton-principal">
              {enCours ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
