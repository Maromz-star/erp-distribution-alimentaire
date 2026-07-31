"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Truck,
  Boxes,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { apiGet, formaterMontant, formaterDate } from "@/lib/api-client";
import { EnTetePage, KPICard } from "@/components/ui";

type DonneesDashboard = {
  kpi: {
    caJour: number;
    caMois: number;
    nombreVentesJour: number;
    nombreVentesMois: number;
    nombreVentesTotal: number;
    nombreClients: number;
    nombreFournisseurs: number;
    valeurStock: number;
    nombreProduitsEnRupture: number;
    nombreProduitsBientotEnRupture: number;
  };
  dernieresVentes: { id: string; numeroFacture: string; totalTTC: string; creeLe: string; client: { nom: string } }[];
  dernieresLivraisons: { id: string; numeroBon: string; totalTTC: string; dateLivraison: string; fournisseur: { nom: string } }[];
  clientsSoldeDebiteur: { id: string; nom: string; solde: number }[];
  produitsEnRupture: { id: string; nom: string; quantiteStock: string }[];
  produitsBientotEnRupture: { id: string; nom: string; quantiteStock: string; stockMin: string }[];
  meilleursProduits: { nom: string; quantite: number; ca: number }[];
  produitsMoinsVendus: { nom: string; quantite: number; ca: number }[];
  evolutionVentesAchats: { mois: string; ventes: number; achats: number }[];
  topClients: { nom: string; total: number }[];
  topFournisseurs: { nom: string; total: number }[];
};

export default function PageDashboard() {
  const [donnees, setDonnees] = useState<DonneesDashboard | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ donnees: DonneesDashboard }>("/api/dashboard")
      .then((r) => setDonnees(r.donnees))
      .catch((e) => setErreur(e.message));
  }, []);

  if (erreur) {
    return <p className="text-danger">Impossible de charger le tableau de bord : {erreur}</p>;
  }
  if (!donnees) {
    return <p className="text-sm text-slate-400">Chargement du tableau de bord...</p>;
  }

  const { kpi } = donnees;

  return (
    <div>
      <EnTetePage titre="Tableau de bord" sousTitre="Vue d'ensemble de votre activite commerciale" />

      {/* KPI principaux */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <KPICard titre="CA du jour" valeur={formaterMontant(kpi.caJour)} icone={DollarSign} couleur="brand" />
        <KPICard titre="CA du mois" valeur={formaterMontant(kpi.caMois)} icone={TrendingUp} couleur="navy" />
        <KPICard titre="Ventes (mois)" valeur={String(kpi.nombreVentesMois)} icone={ShoppingCart} lien="/ventes" />
        <KPICard titre="Clients actifs" valeur={String(kpi.nombreClients)} icone={Users} lien="/clients" />
        <KPICard titre="Fournisseurs actifs" valeur={String(kpi.nombreFournisseurs)} icone={Truck} lien="/fournisseurs" />
        <KPICard titre="Valeur du stock" valeur={formaterMontant(kpi.valeurStock)} icone={Boxes} lien="/stock" />
        <KPICard
          titre="Produits en rupture"
          valeur={String(kpi.nombreProduitsEnRupture)}
          icone={AlertTriangle}
          couleur={kpi.nombreProduitsEnRupture > 0 ? "danger" : "success"}
          lien="/stock?filtre=rupture"
        />
        <KPICard
          titre="Stock faible bientot"
          valeur={String(kpi.nombreProduitsBientotEnRupture)}
          icone={AlertTriangle}
          couleur={kpi.nombreProduitsBientotEnRupture > 0 ? "warning" : "success"}
          lien="/stock?filtre=faible"
        />
      </div>

      {/* Graphiques */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="carte">
          <h3 className="mb-4 text-sm font-semibold">Evolution des ventes et achats (6 mois)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={donnees.evolutionVentesAchats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => formaterMontant(v)} />
              <Legend />
              <Line type="monotone" dataKey="ventes" name="Ventes" stroke="#2E5395" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="achats" name="Achats" stroke="#C55A11" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="carte">
          <h3 className="mb-4 text-sm font-semibold">Top clients (6 mois)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={donnees.topClients} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="nom" tick={{ fontSize: 12 }} width={120} />
              <Tooltip formatter={(v: number) => formaterMontant(v)} />
              <Bar dataKey="total" fill="#2E5395" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="carte">
          <h3 className="mb-4 text-sm font-semibold">Top fournisseurs (6 mois)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={donnees.topFournisseurs} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="nom" tick={{ fontSize: 12 }} width={120} />
              <Tooltip formatter={(v: number) => formaterMontant(v)} />
              <Bar dataKey="total" fill="#C55A11" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="carte">
          <h3 className="mb-4 text-sm font-semibold">Meilleurs produits vendus (6 mois, par quantite)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={donnees.meilleursProduits} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="nom" tick={{ fontSize: 12 }} width={120} />
              <Tooltip />
              <Bar dataKey="quantite" name="Quantite vendue" fill="#1E7B34" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Listes */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ListeCarte titre="Dernieres ventes" lienTout="/ventes">
          {donnees.dernieresVentes.length === 0 && <p className="text-sm text-slate-400">Aucune vente.</p>}
          {donnees.dernieresVentes.map((v) => (
            <Link
              key={v.id}
              href={`/ventes/${v.id}`}
              className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-navy-900/50"
            >
              <div>
                <p className="font-medium">{v.numeroFacture}</p>
                <p className="text-xs text-slate-500">
                  {v.client.nom} · {formaterDate(v.creeLe)}
                </p>
              </div>
              <span className="font-medium tabular-nums">{formaterMontant(v.totalTTC)}</span>
            </Link>
          ))}
        </ListeCarte>

        <ListeCarte titre="Dernieres livraisons" lienTout="/livraisons">
          {donnees.dernieresLivraisons.length === 0 && <p className="text-sm text-slate-400">Aucune livraison.</p>}
          {donnees.dernieresLivraisons.map((l) => (
            <Link
              key={l.id}
              href={`/livraisons/${l.id}`}
              className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-navy-900/50"
            >
              <div>
                <p className="font-medium">{l.numeroBon}</p>
                <p className="text-xs text-slate-500">
                  {l.fournisseur.nom} · {formaterDate(l.dateLivraison)}
                </p>
              </div>
              <span className="font-medium tabular-nums">{formaterMontant(l.totalTTC)}</span>
            </Link>
          ))}
        </ListeCarte>

        <ListeCarte titre="Clients avec solde debiteur" lienTout="/clients">
          {donnees.clientsSoldeDebiteur.length === 0 && (
            <p className="text-sm text-slate-400">Aucun solde debiteur. 👍</p>
          )}
          {donnees.clientsSoldeDebiteur.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-navy-900/50"
            >
              <span className="font-medium">{c.nom}</span>
              <span className="font-medium tabular-nums text-danger">{formaterMontant(c.solde)}</span>
            </Link>
          ))}
        </ListeCarte>
      </div>
    </div>
  );
}

function ListeCarte({
  titre,
  lienTout,
  children,
}: {
  titre: string;
  lienTout: string;
  children: React.ReactNode;
}) {
  return (
    <div className="carte">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{titre}</h3>
        <Link href={lienTout} className="text-xs font-medium text-brand-600 hover:underline">
          Voir tout
        </Link>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
