"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Receipt } from "lucide-react";
import { apiGet, apiPost, formaterMontant, formaterDate, ErreurAPI } from "@/lib/api-client";
import { StatutBadge } from "@/components/ui";

type BonLivraison = {
  id: string;
  numeroSerie: string;
  numeroBon: string;
  statut: string;
  dateLivraison: string;
  creeLe: string;
  sousTotalHT: string;
  totalRemise: string;
  totalTVA: string;
  totalTTC: string;
  commentaires: string | null;
  client: {
    id: string;
    nom: string;
    societe: string | null;
    adresse: string | null;
    ville: string | null;
    telephone: string | null;
  };
  utilisateur: { nom: string };
  vente: { id: string; numeroFacture: string } | null;
  lignes: {
    id: string;
    quantite: string;
    prixUnitaire: string;
    remisePct: string;
    totalLigneTTC: string;
    produit: { nom: string; codeProduit: string; unite: string };
  }[];
};

const TEXTE_STATUT: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Valide",
  FACTUREE: "Facture",
  ANNULEE: "Annule",
};

export default function PageBonLivraisonClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bon, setBon] = useState<BonLivraison | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function charger() {
    const reponse = await apiGet<{ donnees: BonLivraison }>(`/api/bons-livraison-client/${id}`);
    setBon(reponse.donnees);
  }

  useEffect(() => {
    charger();
  }, [id]);

  async function facturer() {
    if (!bon) return;
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await apiPost<{ donnees: { id: string } }>(
        `/api/bons-livraison-client/${bon.id}/facturer`,
        {}
      );
      router.push(`/ventes/${reponse.donnees.id}`);
    } catch (e) {
      setErreur(e instanceof ErreurAPI ? e.message : "Impossible de facturer ce bon de livraison.");
    } finally {
      setEnCours(false);
    }
  }

  if (!bon) return <p className="text-sm text-slate-400">Chargement...</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.push("/bons-livraison-client")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux bons de livraison
        </button>
        <div className="flex gap-2">
          {bon.vente ? (
            <button onClick={() => router.push(`/ventes/${bon.vente!.id}`)} className="bouton-secondaire">
              <Receipt className="h-4 w-4" /> Voir la facture {bon.vente.numeroFacture}
            </button>
          ) : (
            <button onClick={facturer} disabled={enCours} className="bouton-secondaire">
              <Receipt className="h-4 w-4" /> {enCours ? "Facturation..." : "Facturer"}
            </button>
          )}
          <button onClick={() => window.print()} className="bouton-principal">
            <Printer className="h-4 w-4" /> Imprimer
          </button>
        </div>
      </div>

      {erreur && (
        <div className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erreur}</div>
      )}

      <div className="carte">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Bon de livraison {bon.numeroBon}</h1>
            <p className="text-xs text-slate-400">Serie {bon.numeroSerie}</p>
            <p className="text-sm text-slate-500">
              {formaterDate(bon.dateLivraison)} · Prepare par : {bon.utilisateur.nom}
            </p>
          </div>
          <StatutBadge statut={bon.statut} texte={TEXTE_STATUT[bon.statut] ?? bon.statut} />
        </div>

        <div className="mb-6">
          <p className="text-xs uppercase text-slate-500">Client</p>
          <p className="font-medium">{bon.client.nom}</p>
          {bon.client.societe && <p className="text-sm text-slate-500">{bon.client.societe}</p>}
          {bon.client.adresse && (
            <p className="text-sm text-slate-500">
              {bon.client.adresse}, {bon.client.ville}
            </p>
          )}
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
            {bon.lignes.map((l) => (
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
              <span className="tabular-nums">{formaterMontant(bon.sousTotalHT)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>Remises</span>
              <span className="tabular-nums">-{formaterMontant(bon.totalRemise)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>TVA</span>
              <span className="tabular-nums">{formaterMontant(bon.totalTVA)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-semibold dark:border-slate-800">
              <span>Total TTC</span>
              <span className="tabular-nums">{formaterMontant(bon.totalTTC)}</span>
            </div>
          </div>
        </div>

        {bon.commentaires && (
          <div className="mt-6">
            <p className="text-xs uppercase text-slate-500">Commentaires</p>
            <p className="text-sm">{bon.commentaires}</p>
          </div>
        )}
      </div>
    </div>
  );
}
