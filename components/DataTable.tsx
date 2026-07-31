"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export type Colonne<T> = {
  cle: string;
  entete: string;
  rendu: (ligne: T) => React.ReactNode;
  alignement?: "gauche" | "droite" | "centre";
};

export function DataTable<T extends { id: string }>({
  colonnes,
  lignes,
  chargement,
  recherche,
  onRecherche,
  placeholderRecherche = "Rechercher...",
  page,
  pages,
  onChangerPage,
  onClicLigne,
  actionsEnTete,
  messageVide = "Aucune donnee pour le moment.",
}: {
  colonnes: Colonne<T>[];
  lignes: T[];
  chargement?: boolean;
  recherche?: string;
  onRecherche?: (valeur: string) => void;
  placeholderRecherche?: string;
  page?: number;
  pages?: number;
  onChangerPage?: (page: number) => void;
  onClicLigne?: (ligne: T) => void;
  actionsEnTete?: React.ReactNode;
  messageVide?: string;
}) {
  const [valeurLocale, setValeurLocale] = useState(recherche ?? "");

  function soumettreRecherche(e: React.FormEvent) {
    e.preventDefault();
    onRecherche?.(valeurLocale);
  }

  return (
    <div className="carte overflow-hidden !p-0">
      {(onRecherche || actionsEnTete) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          {onRecherche ? (
            <form onSubmit={soumettreRecherche} className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={valeurLocale}
                onChange={(e) => setValeurLocale(e.target.value)}
                placeholder={placeholderRecherche}
                className="champ pl-9"
              />
            </form>
          ) : (
            <div />
          )}
          {actionsEnTete}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-navy-900/50">
              {colonnes.map((c) => (
                <th
                  key={c.cle}
                  className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${
                    c.alignement === "droite" ? "text-right" : c.alignement === "centre" ? "text-center" : "text-left"
                  }`}
                >
                  {c.entete}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {chargement ? (
              <tr>
                <td colSpan={colonnes.length} className="px-4 py-10 text-center text-slate-400">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : lignes.length === 0 ? (
              <tr>
                <td colSpan={colonnes.length} className="px-4 py-10 text-center text-sm text-slate-400">
                  {messageVide}
                </td>
              </tr>
            ) : (
              lignes.map((ligne) => (
                <tr
                  key={ligne.id}
                  onClick={() => onClicLigne?.(ligne)}
                  className={onClicLigne ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-navy-900/50" : ""}
                >
                  {colonnes.map((c) => (
                    <td
                      key={c.cle}
                      className={`whitespace-nowrap px-4 py-3 ${
                        c.alignement === "droite" ? "text-right" : c.alignement === "centre" ? "text-center" : "text-left"
                      }`}
                    >
                      {c.rendu(ligne)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {page !== undefined && pages !== undefined && pages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 p-3 dark:border-slate-800">
          <button
            disabled={page <= 1}
            onClick={() => onChangerPage?.(page - 1)}
            className="bouton-secondaire !px-3 !py-1.5 text-xs"
          >
            <ChevronLeft className="h-4 w-4" /> Precedent
          </button>
          <span className="text-xs text-slate-500">
            Page {page} / {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => onChangerPage?.(page + 1)}
            className="bouton-secondaire !px-3 !py-1.5 text-xs"
          >
            Suivant <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
