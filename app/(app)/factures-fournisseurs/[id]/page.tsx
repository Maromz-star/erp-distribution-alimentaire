"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { apiGet, formaterMontant, formaterDate } from "@/lib/api-client";
import { StatutBadge } from "@/components/ui";

type Facture = {
  id: string;
  numeroFacture: string;
  dateFacture: string;
  totalHT: string;
  totalTTC: string;
  montantPaye: string;
  solde: number;
  statut: string;
  commentaires: string | null;
  fournisseur: { nom: string; societe: string | null; adresse: string | null; ville: string | null; telephone: string | null };
  utilisateur: { nom: string };
  livraison: { id: string; numeroBon: string } | null;
  lignes: {
    id: string;
    quantite: string;
    prixUnitaire: string;
    totalLigne: string;
    produit: { nom: string; codeProduit: string; unite: string };
  }[];
};

export default function PageFactureFournisseur() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [facture, setFacture] = useState<Facture | null>(null);

  useEffect(() => {
    apiGet<{ donnees: Facture }>(`/api/factures-fournisseurs/${id}`).then((r) => setFacture(r.donnees));
  }, [id]);

  if (!facture) return <p className="text-sm text-slate-400">Chargement...</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <button onClick={() => router.push("/factures-fournisseurs")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Retour aux factures fournisseurs
        </button>
        <button onClick={() => window.print()} className="bouton-principal">
          <Printer className="h-4 w-4" /> Imprimer
        </button>
      </div>

      <div className="carte">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Facture fournisseur {facture.numeroFacture}</h1>
            {facture.livraison && (
              <p className="text-xs text-slate-400">Liee a la livraison {facture.livraison.numeroBon}</p>
            )}
            <p className="text-sm text-slate-500">
              {formaterDate(facture.dateFacture)} · Enregistre par : {facture.utilisateur.nom}
            </p>
          </div>
          <StatutBadge
            statut={facture.statut}
            texte={
              facture.statut === "PAYEE"
                ? "Payee"
                : facture.statut === "PARTIELLEMENT_PAYEE"
                ? "Partiellement payee"
                : facture.statut === "ANNULEE"
                ? "Annulee"
                : "En attente"
            }
          />
        </div>

        <div className="mb-6">
          <p className="text-xs uppercase text-slate-500">Fournisseur</p>
          <p className="font-medium">{facture.fournisseur.nom}</p>
          {facture.fournisseur.societe && <p className="text-sm text-slate-500">{facture.fournisseur.societe}</p>}
          {facture.fournisseur.adresse && (
            <p className="text-sm text-slate-500">{facture.fournisseur.adresse}, {facture.fournisseur.ville}</p>
          )}
        </div>

        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-2 text-xs font-semibold uppercase text-slate-500">Produit</th>
              <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Qte</th>
              <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Prix unit.</th>
              <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Total</th>
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
                <td className="py-2 text-right font-medium tabular-nums">{formaterMontant(l.totalLigne)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1.5">
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

        {facture.solde > 0 && (
          <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:bg-navy-950 print:hidden">
            Le suivi des paiements fournisseurs se fait actuellement via le module Livraisons fournisseurs.
          </div>
        )}

        {facture.commentaires && (
          <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-800">
            {facture.commentaires}
          </div>
        )}
      </div>
    </div>
  );
}
