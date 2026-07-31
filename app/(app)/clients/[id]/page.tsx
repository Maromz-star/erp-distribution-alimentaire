"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Phone, Mail, MapPin } from "lucide-react";
import { apiGet, formaterMontant, formaterDate } from "@/lib/api-client";
import { StatutBadge } from "@/components/ui";

type FicheClient = {
  id: string;
  nom: string;
  societe: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  ville: string | null;
  commentaires: string | null;
  totalAchete: number;
  totalPaye: number;
  solde: number;
  derniereCommande: { numeroFacture: string; creeLe: string } | null;
  produitsPlusAchetes: { nom: string; quantite: number }[];
  ventes: {
    id: string;
    numeroFacture: string;
    creeLe: string;
    totalTTC: string;
    montantPaye: string;
    statut: string;
  }[];
  reglements: { id: string; montant: string; mode: string; dateReglement: string; reference: string | null }[];
};

export default function PageFicheClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<FicheClient | null>(null);

  useEffect(() => {
    apiGet<{ donnees: FicheClient }>(`/api/clients/${id}`).then((r) => setClient(r.donnees));
  }, [id]);

  if (!client) return <p className="text-sm text-slate-400">Chargement...</p>;

  return (
    <div>
      <button onClick={() => router.push("/clients")} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Retour aux clients
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{client.nom}</h1>
          {client.societe && <p className="text-slate-500">{client.societe}</p>}
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
            {client.telephone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {client.telephone}
              </span>
            )}
            {client.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {client.email}
              </span>
            )}
            {client.ville && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {client.ville}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="carte">
          <p className="text-xs uppercase text-slate-500">Total achete</p>
          <p className="mt-1 text-xl font-semibold">{formaterMontant(client.totalAchete)}</p>
        </div>
        <div className="carte">
          <p className="text-xs uppercase text-slate-500">Total paye</p>
          <p className="mt-1 text-xl font-semibold">{formaterMontant(client.totalPaye)}</p>
        </div>
        <div className="carte">
          <p className="text-xs uppercase text-slate-500">Solde actuel</p>
          <p className={`mt-1 text-xl font-semibold ${client.solde > 0 ? "text-danger" : ""}`}>
            {formaterMontant(client.solde)}
          </p>
        </div>
        <div className="carte">
          <p className="text-xs uppercase text-slate-500">Derniere commande</p>
          <p className="mt-1 text-sm font-medium">
            {client.derniereCommande ? formaterDate(client.derniereCommande.creeLe) : "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Historique des ventes</h2>
          <div className="carte !p-0 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-navy-900/50">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase text-slate-500">Facture</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase text-slate-500">Date</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">Total</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">Solde</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase text-slate-500">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {client.ventes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Aucune vente pour ce client.
                    </td>
                  </tr>
                )}
                {client.ventes.map((v) => {
                  const solde = Number(v.totalTTC) - Number(v.montantPaye);
                  return (
                    <tr key={v.id} onClick={() => router.push(`/ventes/${v.id}`)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-navy-900/50">
                      <td className="px-4 py-2.5 font-medium">{v.numeroFacture}</td>
                      <td className="px-4 py-2.5">{formaterDate(v.creeLe)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formaterMontant(v.totalTTC)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${solde > 0 ? "text-danger" : ""}`}>
                        {formaterMontant(solde)}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatutBadge statut={solde <= 0 ? "PAYEE" : Number(v.montantPaye) > 0 ? "PARTIELLEMENT_PAYEE" : "EN_ATTENTE"} texte={solde <= 0 ? "Payee" : Number(v.montantPaye) > 0 ? "Partielle" : "En attente"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h2 className="mb-3 mt-6 text-sm font-semibold">Reglements</h2>
          <div className="carte !p-0 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-navy-900/50">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase text-slate-500">Date</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase text-slate-500">Mode</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase text-slate-500">Reference</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {client.reglements.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      Aucun reglement enregistre.
                    </td>
                  </tr>
                )}
                {client.reglements.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5">{formaterDate(r.dateReglement)}</td>
                    <td className="px-4 py-2.5">{r.mode}</td>
                    <td className="px-4 py-2.5">{r.reference ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formaterMontant(r.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Produits les plus achetes</h2>
          <div className="carte space-y-2">
            {client.produitsPlusAchetes.length === 0 && <p className="text-sm text-slate-400">Aucune donnee.</p>}
            {client.produitsPlusAchetes.map((p) => (
              <div key={p.nom} className="flex items-center justify-between text-sm">
                <span>{p.nom}</span>
                <span className="font-medium tabular-nums">{p.quantite}</span>
              </div>
            ))}
          </div>

          {client.commentaires && (
            <>
              <h2 className="mb-3 mt-6 text-sm font-semibold">Commentaires</h2>
              <div className="carte text-sm text-slate-600 dark:text-slate-300">{client.commentaires}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
