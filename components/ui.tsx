import Link from "next/link";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

// ----------------------------------------------------------------------------
// Carte KPI (tableau de bord)
// ----------------------------------------------------------------------------

const COULEURS_KPI = {
  navy: "bg-navy-800 text-white",
  brand: "bg-brand-600 text-white",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
  danger: "bg-danger text-white",
} as const;

export function KPICard({
  titre,
  valeur,
  icone: Icone,
  couleur = "navy",
  lien,
}: {
  titre: string;
  valeur: string;
  icone?: LucideIcon;
  couleur?: keyof typeof COULEURS_KPI;
  lien?: string;
}) {
  const contenu = (
    <div className="carte flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {titre}
        </p>
        <p className="mt-1.5 text-2xl font-semibold tabular-nums">{valeur}</p>
      </div>
      {Icone && (
        <div className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", COULEURS_KPI[couleur])}>
          <Icone className="h-5 w-5" />
        </div>
      )}
    </div>
  );

  if (lien) {
    return (
      <Link href={lien} className="block transition hover:-translate-y-0.5 hover:shadow-md rounded-xl">
        {contenu}
      </Link>
    );
  }
  return contenu;
}

// ----------------------------------------------------------------------------
// Badge de statut (couleurs coherentes avec les fichiers Excel de la marque)
// ----------------------------------------------------------------------------

const STYLES_BADGE: Record<string, string> = {
  // statuts factures / paiements
  PAYEE: "bg-success/10 text-success",
  VALIDEE: "bg-success/10 text-success",
  ACTIF: "bg-success/10 text-success",
  OK: "bg-success/10 text-success",
  PARTIELLEMENT_PAYEE: "bg-warning/10 text-warning",
  FAIBLE: "bg-warning/10 text-warning",
  EN_ATTENTE: "bg-warning/10 text-warning",
  EN_RETARD: "bg-danger/10 text-danger",
  RUPTURE: "bg-danger/10 text-danger",
  ANNULEE: "bg-danger/10 text-danger",
  INACTIF: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  ARCHIVE: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  BROUILLON: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export function StatutBadge({ statut, texte }: { statut: string; texte?: string }) {
  const style = STYLES_BADGE[statut.toUpperCase().replace(/\s+/g, "_")] ?? "bg-brand-100 text-brand-600";
  return <span className={clsx("badge", style)}>{texte ?? statut}</span>;
}

// ----------------------------------------------------------------------------
// En-tete de page standard (titre + sous-titre + actions)
// ----------------------------------------------------------------------------

export function EnTetePage({
  titre,
  sousTitre,
  actions,
}: {
  titre: string;
  sousTitre?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{titre}</h1>
        {sousTitre && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sousTitre}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
