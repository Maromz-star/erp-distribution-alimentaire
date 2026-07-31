"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Search, Moon, Sun, LogOut, Bell, User as UserIcon } from "lucide-react";
import { apiGet, api } from "@/lib/api-client";

type ResultatRecherche = {
  produits: { id: string; nom: string; codeProduit: string }[];
  clients: { id: string; nom: string; societe: string | null }[];
  fournisseurs: { id: string; nom: string; societe: string | null }[];
  ventes: { id: string; numeroFacture: string; totalTTC: string }[];
  livraisons: { id: string; numeroBon: string; totalTTC: string }[];
};

export function TopBar({
  nomUtilisateur,
  role,
  alertesStock,
  onOuvrirMenu,
}: {
  nomUtilisateur: string;
  role: string;
  alertesStock: number;
  onOuvrirMenu: () => void;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState<"clair" | "sombre">("clair");
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<ResultatRecherche | null>(null);
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const zoneRecherche = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "sombre" : "clair");
  }, []);

  useEffect(() => {
    function fermerSiExterieur(e: MouseEvent) {
      if (zoneRecherche.current && !zoneRecherche.current.contains(e.target as Node)) {
        setRechercheOuverte(false);
      }
    }
    document.addEventListener("mousedown", fermerSiExterieur);
    return () => document.removeEventListener("mousedown", fermerSiExterieur);
  }, []);

  // Recherche instantanee avec debounce (250ms) pour ne pas spammer l'API a chaque frappe
  useEffect(() => {
    if (recherche.trim().length < 2) {
      setResultats(null);
      return;
    }
    const identifiant = setTimeout(async () => {
      try {
        const reponse = await apiGet<{ donnees: ResultatRecherche }>(
          `/api/recherche?q=${encodeURIComponent(recherche)}`
        );
        setResultats(reponse.donnees);
      } catch {
        setResultats(null);
      }
    }, 250);
    return () => clearTimeout(identifiant);
  }, [recherche]);

  function basculerTheme() {
    const nouveauTheme = theme === "clair" ? "sombre" : "clair";
    setTheme(nouveauTheme);
    document.documentElement.classList.toggle("dark", nouveauTheme === "sombre");
    localStorage.setItem("theme", nouveauTheme);
  }

  async function seDeconnecter() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const aDesResultats =
    resultats &&
    (resultats.produits.length ||
      resultats.clients.length ||
      resultats.fournisseurs.length ||
      resultats.ventes.length ||
      resultats.livraisons.length);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-navy-950/80">
      <button onClick={onOuvrirMenu} className="text-slate-500 lg:hidden" aria-label="Ouvrir le menu">
        <Menu className="h-5 w-5" />
      </button>

      <div ref={zoneRecherche} className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Rechercher un produit, client, facture..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          onFocus={() => setRechercheOuverte(true)}
          className="champ pl-9"
        />
        {rechercheOuverte && recherche.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-full mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-navy-900">
            {!aDesResultats && (
              <p className="px-3 py-2 text-sm text-slate-500">Aucun resultat pour "{recherche}"</p>
            )}
            {!!resultats?.produits.length && (
              <GroupeResultats titre="Produits">
                {resultats.produits.map((p) => (
                  <Link key={p.id} href={`/produits/${p.id}`} className="bloc-resultat">
                    {p.nom} <span className="text-slate-400">· {p.codeProduit}</span>
                  </Link>
                ))}
              </GroupeResultats>
            )}
            {!!resultats?.clients.length && (
              <GroupeResultats titre="Clients">
                {resultats.clients.map((c) => (
                  <Link key={c.id} href={`/clients/${c.id}`} className="bloc-resultat">
                    {c.nom} {c.societe ? <span className="text-slate-400">· {c.societe}</span> : null}
                  </Link>
                ))}
              </GroupeResultats>
            )}
            {!!resultats?.fournisseurs.length && (
              <GroupeResultats titre="Fournisseurs">
                {resultats.fournisseurs.map((f) => (
                  <Link key={f.id} href={`/fournisseurs/${f.id}`} className="bloc-resultat">
                    {f.nom}
                  </Link>
                ))}
              </GroupeResultats>
            )}
            {!!resultats?.ventes.length && (
              <GroupeResultats titre="Factures">
                {resultats.ventes.map((v) => (
                  <Link key={v.id} href={`/ventes/${v.id}`} className="bloc-resultat">
                    {v.numeroFacture}
                  </Link>
                ))}
              </GroupeResultats>
            )}
            {!!resultats?.livraisons.length && (
              <GroupeResultats titre="Bons de livraison">
                {resultats.livraisons.map((l) => (
                  <Link key={l.id} href={`/livraisons/${l.id}`} className="bloc-resultat">
                    {l.numeroBon}
                  </Link>
                ))}
              </GroupeResultats>
            )}
          </div>
        )}
      </div>

      <Link
        href="/stock?filtre=faible"
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-900"
        aria-label="Alertes de stock"
      >
        <Bell className="h-5 w-5" />
        {alertesStock > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {alertesStock > 99 ? "99+" : alertesStock}
          </span>
        )}
      </Link>

      <button
        onClick={basculerTheme}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-900"
        aria-label="Changer de theme"
      >
        {theme === "clair" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </button>

      <div className="relative">
        <button
          onClick={() => setMenuOuvert((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-navy-900"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-navy-800 dark:text-brand-500">
            <UserIcon className="h-4 w-4" />
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium leading-tight">{nomUtilisateur}</p>
            <p className="text-xs leading-tight text-slate-500">{role}</p>
          </div>
        </button>
        {menuOuvert && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-navy-900">
            <button
              onClick={seDeconnecter}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10"
            >
              <LogOut className="h-4 w-4" />
              Se deconnecter
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        .bloc-resultat {
          display: block;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .bloc-resultat:hover {
          background-color: rgb(241 245 249);
        }
        .dark .bloc-resultat:hover {
          background-color: rgb(30 47 82);
        }
      `}</style>
    </header>
  );
}

function GroupeResultats({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{titre}</p>
      {children}
    </div>
  );
}
