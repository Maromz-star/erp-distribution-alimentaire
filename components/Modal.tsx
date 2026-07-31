"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  titre,
  ouvert,
  onFermer,
  children,
  largeur = "max-w-lg",
}: {
  titre: string;
  ouvert: boolean;
  onFermer: () => void;
  children: React.ReactNode;
  largeur?: string;
}) {
  useEffect(() => {
    function surEchap(e: KeyboardEvent) {
      if (e.key === "Escape") onFermer();
    }
    if (ouvert) document.addEventListener("keydown", surEchap);
    return () => document.removeEventListener("keydown", surEchap);
  }, [ouvert, onFermer]);

  if (!ouvert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10 sm:pt-16">
      <div
        className={`w-full ${largeur} rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-navy-900`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold">{titre}</h2>
          <button
            onClick={onFermer}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
