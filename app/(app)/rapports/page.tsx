"use client";

import { useState } from "react";
import { Download, FileBarChart } from "lucide-react";
import { EnTetePage } from "@/components/ui";

const TYPES_RAPPORT = [
  { valeur: "ventes", libelle: "Rapport des ventes" },
  { valeur: "achats", libelle: "Rapport des achats" },
  { valeur: "stock", libelle: "Rapport du stock" },
  { valeur: "clients", libelle: "Rapport clients" },
  { valeur: "fournisseurs", libelle: "Rapport fournisseurs" },
  { valeur: "reglements", libelle: "Rapport des reglements" },
  { valeur: "benefices", libelle: "Rapport des benefices / marges" },
];

export default function PageRapports() {
  const [du, setDu] = useState("");
  const [au, setAu] = useState("");

  function telecharger(type: string) {
    const params = new URLSearchParams({ type, format: "csv" });
    if (du) params.set("du", du);
    if (au) params.set("au", au);
    // Navigation directe : le navigateur declenche le telechargement grace
    // a l'en-tete Content-Disposition renvoye par l'API.
    window.location.href = `/api/rapports?${params}`;
  }

  return (
    <div>
      <EnTetePage
        titre="Rapports"
        sousTitre="Exports CSV compatibles Excel / Google Sheets. L'export PDF mis en forme est prevu dans une prochaine iteration (voir README)."
      />

      <div className="carte mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="etiquette">Du</label>
          <input type="date" className="champ" value={du} onChange={(e) => setDu(e.target.value)} />
        </div>
        <div>
          <label className="etiquette">Au</label>
          <input type="date" className="champ" value={au} onChange={(e) => setAu(e.target.value)} />
        </div>
        <p className="pb-2.5 text-xs text-slate-500">
          Laissez vide pour exporter toutes les periodes (les rapports Stock, Clients et Fournisseurs ne sont pas
          filtres par date : ils refletent l'etat actuel).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TYPES_RAPPORT.map((t) => (
          <div key={t.valeur} className="carte flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-navy-800">
                <FileBarChart className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">{t.libelle}</p>
            </div>
            <button onClick={() => telecharger(t.valeur)} className="bouton-secondaire !px-3 !py-1.5 text-xs" aria-label={`Exporter ${t.libelle}`}>
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
