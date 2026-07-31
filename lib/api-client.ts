"use client";

// Petit wrapper fetch commun a tous les composants client : ajoute les
// credentials (cookie de session), parse le JSON, et transforme une reponse
// d'erreur ({ erreur: "..." }) en exception JS lisible pour un try/catch simple.

export class ErreurAPI extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function traiterReponse<T>(reponse: Response): Promise<T> {
  const corpsTexte = await reponse.text();
  const corps = corpsTexte ? JSON.parse(corpsTexte) : {};

  if (!reponse.ok) {
    throw new ErreurAPI(corps.erreur ?? "Une erreur est survenue", reponse.status, corps.details);
  }
  return corps as T;
}

export async function api<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const reponse = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  return traiterReponse<T>(reponse);
}

export const apiGet = <T = unknown>(url: string) => api<T>(url, { method: "GET" });

export const apiPost = <T = unknown>(url: string, corps: unknown) =>
  api<T>(url, { method: "POST", body: corps instanceof FormData ? corps : JSON.stringify(corps) });

export const apiPut = <T = unknown>(url: string, corps: unknown) =>
  api<T>(url, { method: "PUT", body: JSON.stringify(corps) });

export const apiDelete = <T = unknown>(url: string) => api<T>(url, { method: "DELETE" });

/** Formatte un nombre en devise MAD pour l'affichage (2 decimales, separateur milliers). */
export function formaterMontant(valeur: number | string): string {
  const n = typeof valeur === "string" ? Number(valeur) : valeur;
  return new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " MAD";
}

export function formaterDate(valeur: string | Date): string {
  const d = typeof valeur === "string" ? new Date(valeur) : valeur;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}
