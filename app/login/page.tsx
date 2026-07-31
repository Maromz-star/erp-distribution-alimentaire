"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Package } from "lucide-react";
import { api, ErreurAPI } from "@/lib/api-client";

export default function PageConnexion() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, motDePasse }) });
      const suite = searchParams.get("suite") ?? "/dashboard";
      router.push(suite);
      router.refresh();
    } catch (e) {
      setErreur(e instanceof ErreurAPI ? e.message : "Connexion impossible. Reessayez.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600">
            <Package className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white">ERP Distribution</h1>
          <p className="mt-1 text-sm text-slate-400">Connectez-vous a votre espace de gestion</p>
        </div>

        <form onSubmit={seConnecter} className="rounded-xl border border-slate-800 bg-navy-900 p-6 shadow-card">
          <div className="mb-4">
            <label htmlFor="email" className="etiquette text-slate-300">
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="champ dark:bg-navy-950"
              placeholder="vous@entreprise.com"
            />
          </div>
          <div className="mb-5">
            <label htmlFor="motDePasse" className="etiquette text-slate-300">
              Mot de passe
            </label>
            <input
              id="motDePasse"
              type="password"
              required
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="champ dark:bg-navy-950"
              placeholder="********"
            />
          </div>

          {erreur && (
            <div className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erreur}</div>
          )}

          <button type="submit" disabled={enCours} className="bouton-principal w-full">
            {enCours ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
