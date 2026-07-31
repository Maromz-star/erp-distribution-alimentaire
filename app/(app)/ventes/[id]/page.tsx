"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Plus } from "lucide-react";
import { apiGet, apiPost, formaterMontant, formaterDate, ErreurAPI } from "@/lib/api-client";
import { StatutBadge } from "@/components/ui";
import { Modal } from "@/components/Modal";

type Facture = {
  id: string;
  numeroFacture: string;
  creeLe: string;
  sousTotalHT: string;
  totalRemise: string;
  totalTVA: string;
  totalTTC: string;
  montantPaye: string;
  solde: number;
  statut: string;
  commentaires: string | null;
  client: { id: string; nom: string; societe: string | null; adresse: string | null; ville: string | null; telephone: string | null };
  utilisateur: { nom: string };
  bonLivraisonClient: { id: string; numeroBon: string; numeroSerie: string } | null;
  lignes: {
    id: string;
    quantite: string;
    prixUnitaire: string;
    remisePct: string;
    tauxTVA: string;
    totalLigneTTC: string;
    produit: { nom: string; codeProduit: string; unite: string };
  }[];
  reglements: { id: string; montant: string; mode: string; dateReglement: string }[];
};

export default function PageFacture() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [facture, setFacture] = useState<Facture | null>(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [montant, setMontant] = useState("");
  const [mode, setMode] = useState("ESPECES");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function charger() {
    const reponse = await apiGet<{ donnees: Facture }>(`/api/ventes/${id}`);
    setFacture(reponse.donnees);
  }

  useEffect(() => {
    charger();
  }, [id]);

  async function enregistrerReglement(e: React.FormEvent) {
    e.preventDefault();
    if (!facture) return;
    setEnCours(true);
    setErreur(null);
    try {
      await apiPost("/api/reglements", {
        clientId: facture.client.id,
        venteId: facture.id,
        montant: Number(montant),
        mode,
      });
      setModalOuvert(false);
      setMontant("");
      charger();
    } catch (e) {
      setErreur(e instanceof ErreurAPI ? e.message : "Impossible d'enregistrer le reglement");
    } finally {
      setEnCours(false);
    }
  }

  if (!facture) return <p className="text-sm text-slate-400">Chargement...</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <button onClick={() => router.push("/ventes")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Retour aux ventes
        </button>
        <div className="flex gap-2">
          {facture.solde > 0 && (
            <button onClick={() => setModalOuvert(true)} className="bouton-secondaire">
              <Plus className="h-4 w-4" /> Encaisser un reglement
            </button>
          )}
          <button onClick={() => window.print()} className="bouton-principal">
            <Printer className="h-4 w-4" /> Imprimer
          </button>
        </div>
      </div>

      <div className="carte">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Facture {facture.numeroFacture}</h1>
            {facture.bonLivraisonClient && (
              <p className="text-xs text-slate-400">
                Emise depuis le bon de livraison {facture.bonLivraisonClient.numeroBon} (serie {facture.bonLivraisonClient.numeroSerie})
              </p>
            )}
            <p className="text-sm text-slate-500">
              {formaterDate(facture.creeLe)} · Vendeur : {facture.utilisateur.nom}
            </p>
          </div>
          <StatutBadge
            statut={facture.solde <= 0 ? "PAYEE" : Number(facture.montantPaye) > 0 ? "PARTIELLEMENT_PAYEE" : "EN_ATTENTE"}
            texte={facture.solde <= 0 ? "Payee" : Number(facture.montantPaye) > 0 ? "Partiellement payee" : "En attente"}
          />
        </div>

        <div className="mb-6">
          <p className="text-xs uppercase text-slate-500">Client</p>
          <p className="font-medium">{facture.client.nom}</p>
          {facture.client.societe && <p className="text-sm text-slate-500">{facture.client.societe}</p>}
          {facture.client.adresse && <p className="text-sm text-slate-500">{facture.client.adresse}, {facture.client.ville}</p>}
        </div>

        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-2 text-xs font-semibold uppercase text-slate-500">Produit</th>
              <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Qte</th>
              <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Prix unit.</th>
              <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Remise</th>
              <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Total TTC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {facture.lignes.map((l) => (
              <tr key={l.id}>
                <td className="py-2">
                  {l.produit.nom} <span className="text-slate-400">· {l.produit.codeProduit}</span>
                </td>
                <td className="py-2 text-right tabular-nums">
                  {Number(l.quantite)} {l.produit.unite}
                </td>
                <td className="py-2 text-right tabular-nums">{formaterMontant(l.prixUnitaire)}</td>
                <td className="py-2 text-right tabular-nums">{Number(l.remisePct)}%</td>
                <td className="py-2 text-right font-medium tabular-nums">{formaterMontant(l.totalLigneTTC)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>Sous-total HT</span>
              <span className="tabular-nums">{formaterMontant(facture.sousTotalHT)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>Remises</span>
              <span className="tabular-nums">-{formaterMontant(facture.totalRemise)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>TVA</span>
              <span className="tabular-nums">{formaterMontant(facture.totalTVA)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-semibold dark:border-slate-800">
              <span>Total TTC</span>
              <span className="tabular-nums">{formaterMontant(facture.totalTTC)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>Paye</span>
              <span className="tabular-nums">{formaterMontant(facture.montantPaye)}</span>
            </div>
            <div className={`flex justify-between text-sm font-semibold ${facture.solde > 0 ? "text-danger" : ""}`}>
              <span>Solde</span>
              <span className="tabular-nums">{formaterMontant(facture.solde)}</span>
            </div>
          </div>
        </div>

        {facture.commentaires && (
          <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-800">
            {facture.commentaires}
          </div>
        )}
      </div>

      <Modal titre="Encaisser un reglement" ouvert={modalOuvert} onFermer={() => setModalOuvert(false)}>
        <form onSubmit={enregistrerReglement} className="space-y-4">
          <div>
            <label className="etiquette">Montant (solde restant : {formaterMontant(facture.solde)})</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              max={facture.solde}
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
