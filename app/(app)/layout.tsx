import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/AppShell";

// Layout serveur pour toutes les pages authentifiees (dashboard, produits,
// clients...). Le middleware garantit deja qu'on n'arrive pas ici sans
// session valide, mais on revalide cote serveur par defense en profondeur
// et pour recuperer les infos d'affichage (nom, role).
export default async function LayoutApplication({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Nombre de produits en rupture ou stock faible, pour la pastille de
  // notification dans la barre du haut - calcule ici (server component,
  // pas de cout reseau supplementaire pour le client).
  const produits = await db.produit.findMany({
    where: { statut: "ACTIF" },
    select: { quantiteStock: true, stockMin: true },
  });
  const alertesStock = produits.filter(
    (p) => Number(p.quantiteStock) <= Number(p.stockMin)
  ).length;

  return (
    <AppShell nomUtilisateur={session.nom} role={session.role} alertesStock={alertesStock}>
      {children}
    </AppShell>
  );
}
