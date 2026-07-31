"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Phone, Mail, MapPin } from "lucide-react";
import { apiGet, formaterMontant, formaterDate } from "@/lib/api-client";

type FicheFournisseur = {
  id: string;
  nom: string;
  societe: string | null;
  telephone: string | null;
  email: string | null;
  ville: string | null;
  conditionsPaiement: string | null;
  totalAchete: number;
  totalPaye: number;
  resteAPayer: number;
  livraisons: { id: string; numeroBon: string; dateLivraison: string; totalTTC: string; montantPaye: string }[];
  paiements: { id: string; montant: string; mode: string; datePaiement: string; reference: string | null }[];
};

export default function PageFicheFournisseur() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [f, setF] = useState<FicheFournisseur | null>(null);

  useEffect(() => {
    apiGet<{ donnees: FicheFournisseur }>(`/api/fournisseurs/${id}`).then((r) => setF(r.donnees));
  }, [id]);

  if (!f) return <p className="text-sm text-slate-400">Chargement...</p>;

  return (
    <div>
      <button onClick={() => router.push("/fournisseurs")} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Retour aux fournisseurs
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{f.nom}</h1>
        {f.societe && <p className="text-slate-500">{f.societe}</p>}
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
          {f.telephone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {f.telephone}</span>}
          {f.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {f.email}</span>}
          {f.ville && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {f.ville}</span>}
          {f.conditionsPaiement && <span>· {f.conditionsPaiement}</span>}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="carte">
          <p className="text-xs uppercase text-slate-500">Total achete</p>
          <p className="mt-1 text-xl font-semibold">{formaterMontant(f.totalAchete)}</p>
        </div>
        <div className="carte">
          <p className="text-xs uppercase text-slate-500">Total paye</p>
          <p className="mt-1 text-xl font-semibold">{formaterMontant(f.totalPaye)}</p>
        </div>
        <div className="carte">
          <p className="text-xs uppercase text-slate-500">Reste a payer</p>
          <p className={`mt-1 text-xl font-semibold ${f.resteAPayer > 0 ? "text-warning" : ""}`}>
            {formaterMontant(f.resteAPayer)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold">Historique des livraisons</h2>
          <div className="carte !p-0 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-navy-900/50">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase text-slate-500">Bon</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase text-slate-500">Date</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {f.livraisons.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Aucune livraison.</td></tr>
                )}
                {f.livraisons.map((l) => (
                  <tr key={l.id} onClick={() => router.push(`/livraisons/${l.id}`)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-navy-900/50">
                    <td className="px-4 py-2.5 font-medium">{l.numeroBon}</td>
                    <td className="px-4 py-2.5">{formaterDate(l.dateLivraison)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formaterMontant(l.totalTTC)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Paiements</h2>
          <div className="carte !p-0 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-navy-900/50">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase text-slate-500">Date</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase text-slate-500">Mode</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {f.paiements.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Aucun paiement.</td></tr>
                )}
                {f.paiements.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5">{formaterDate(p.datePaiement)}</td>
                    <td className="px-4 py-2.5">{p.mode}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formaterMontant(p.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
