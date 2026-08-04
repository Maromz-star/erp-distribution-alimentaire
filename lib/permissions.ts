import type { Role } from "@prisma/client";

// ----------------------------------------------------------------------------
// Modele de permissions
//
// ADMIN       : acces total, y compris gestion des utilisateurs et parametres.
// EMPLOYE     : toutes les operations metier (produits, stock, ventes, achats,
//               clients, fournisseurs, reglements) sauf gestion des utilisateurs.
// COMMERCIAL  : ventes et fiche client en lecture/ecriture ; le reste en
//               lecture seule (pas de creation/modification produits, stock,
//               fournisseurs, et pas d'acces aux paiements fournisseurs).
// ----------------------------------------------------------------------------

export type Permission =
  | "utilisateurs.gerer"
    | "notifications.gerer"
  | "parametresEntreprise.gerer"
  | "produits.ecrire"
  | "produits.lire"
  | "stock.ecrire"
  | "stock.lire"
  | "clients.ecrire"
  | "clients.lire"
  | "fournisseurs.ecrire"
  | "fournisseurs.lire"
  | "ventes.ecrire"
  | "ventes.lire"
  | "livraisons.ecrire"
  | "livraisons.lire"
  | "bonsLivraisonClient.ecrire"
  | "bonsLivraisonClient.lire"
  | "facturesFournisseurs.ecrire"
  | "facturesFournisseurs.lire"
  | "reglements.ecrire"
  | "paiementsFournisseurs.ecrire"
  | "rapports.lire";

const PERMISSIONS_PAR_ROLE: Record<Role, Permission[]> = {
  ADMIN: [
    "utilisateurs.gerer",
        "notifications.gerer",
    "parametresEntreprise.gerer",
    "produits.ecrire",
    "produits.lire",
    "stock.ecrire",
    "stock.lire",
    "clients.ecrire",
    "clients.lire",
    "fournisseurs.ecrire",
    "fournisseurs.lire",
    "ventes.ecrire",
    "ventes.lire",
    "livraisons.ecrire",
    "livraisons.lire",
    "bonsLivraisonClient.ecrire",
    "bonsLivraisonClient.lire",
    "facturesFournisseurs.ecrire",
    "facturesFournisseurs.lire",
    "reglements.ecrire",
    "paiementsFournisseurs.ecrire",
    "rapports.lire",
  ],
  EMPLOYE: [
    "produits.ecrire",
    "produits.lire",
    "stock.ecrire",
    "stock.lire",
    "clients.ecrire",
    "clients.lire",
    "fournisseurs.ecrire",
    "fournisseurs.lire",
    "ventes.ecrire",
    "ventes.lire",
    "livraisons.ecrire",
    "livraisons.lire",
    "bonsLivraisonClient.ecrire",
    "bonsLivraisonClient.lire",
    "facturesFournisseurs.ecrire",
    "facturesFournisseurs.lire",
    "reglements.ecrire",
    "paiementsFournisseurs.ecrire",
    "rapports.lire",
  ],
  COMMERCIAL: [
    "produits.lire",
    "stock.lire",
    "clients.ecrire",
    "clients.lire",
    "fournisseurs.lire",
    "ventes.ecrire",
    "ventes.lire",
    "livraisons.lire",
    "bonsLivraisonClient.ecrire",
    "bonsLivraisonClient.lire",
    "facturesFournisseurs.lire",
    "reglements.ecrire",
    "rapports.lire",
  ],
};

export function peut(role: Role, permission: Permission): boolean {
  return PERMISSIONS_PAR_ROLE[role]?.includes(permission) ?? false;
}

/** Leve une erreur si le role n'a pas la permission - a utiliser en tete d'API route. */
export function exigerPermission(role: Role, permission: Permission) {
  if (!peut(role, permission)) {
    throw new PermissionRefusee(permission);
  }
}

export class PermissionRefusee extends Error {
  constructor(permission: Permission) {
    super(`Action non autorisee pour ce role : ${permission}`);
    this.name = "PermissionRefusee";
  }
}
