"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  ShoppingCart,
  PackagePlus,
  Boxes,
  Wallet,
  FileBarChart,
  X,
  FileText,
  ClipboardList,
} from "lucide-react";
import clsx from "clsx";
import type { Role } from "@prisma/client";

const LIENS = [
  { href: "/dashboard", label: "Tableau de bord", icone: LayoutDashboard, roles: ["ADMIN", "EMPLOYE", "COMMERCIAL"] },
  { href: "/bons-livraison-client", label: "Bons de livraison client", icone: ClipboardList, roles: ["ADMIN", "EMPLOYE", "COMMERCIAL"] },
  { href: "/ventes", label: "Ventes", icone: ShoppingCart, roles: ["ADMIN", "EMPLOYE", "COMMERCIAL"] },
  { href: "/clients", label: "Clients", icone: Users, roles: ["ADMIN", "EMPLOYE", "COMMERCIAL"] },
  { href: "/produits", label: "Produits", icone: Package, roles: ["ADMIN", "EMPLOYE"] },
  { href: "/stock", label: "Stock", icone: Boxes, roles: ["ADMIN", "EMPLOYE"] },
  { href: "/livraisons", label: "Livraisons fournisseurs", icone: PackagePlus, roles: ["ADMIN", "EMPLOYE"] },
  { href: "/factures-fournisseurs", label: "Factures fournisseurs", icone: FileText, roles: ["ADMIN", "EMPLOYE"] },
  { href: "/fournisseurs", label: "Fournisseurs", icone: Truck, roles: ["ADMIN", "EMPLOYE"] },
  { href: "/reglements", label: "Reglements & paiements", icone: Wallet, roles: ["ADMIN", "EMPLOYE", "COMMERCIAL"] },
  { href: "/rapports", label: "Rapports", icone: FileBarChart, roles: ["ADMIN", "EMPLOYE", "COMMERCIAL"] },
];

export function Sidebar({
  role,
  ouverte,
  onFermer,
}: {
  role: Role;
  ouverte: boolean;
  onFermer: () => void;
}) {
  const pathname = usePathname();
  const liensVisibles = LIENS.filter((l) => l.roles.includes(role));

  return (
    <>
      {/* Overlay mobile */}
      {ouverte && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onFermer}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-navy-950 transition-transform duration-200 lg:static lg:translate-x-0",
          ouverte ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Package className="h-[18px] w-[18px] text-white" />
            </div>
            <span className="text-sm font-semibold text-white">ERP Distribution</span>
          </div>
          <button onClick={onFermer} className="text-slate-400 lg:hidden" aria-label="Fermer le menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-2 space-y-0.5 px-3">
          {liensVisibles.map(({ href, label, icone: Icone }) => {
            const actif = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onFermer}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  actif
                    ? "bg-brand-600 text-white"
                    : "text-slate-300 hover:bg-navy-900 hover:text-white"
                )}
              >
                <Icone className="h-[18px] w-[18px] shrink-0" />
                {label}
              </Link>
            );
          })}

          {role === "ADMIN" && (
            <Link
              href="/utilisateurs"
              onClick={onFermer}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                pathname.startsWith("/utilisateurs")
                  ? "bg-brand-600 text-white"
                  : "text-slate-300 hover:bg-navy-900 hover:text-white"
              )}
            >
              <Users className="h-[18px] w-[18px] shrink-0" />
              Utilisateurs
            </Link>
          )}
        </nav>
      </aside>
    </>
  );
}
