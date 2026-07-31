import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routeApi, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";

function debutJournee(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function debutMois(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// GET /api/dashboard - un seul appel qui rassemble tous les indicateurs et
// donnees de graphiques du tableau de bord. Regrouper en un endpoint plutot
// que d'en faire 15 evite 15 aller-retours reseau au chargement de la page.
export const GET = routeApi(async (request) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "rapports.lire");

  const maintenant = new Date();
  const debutAujourdhui = debutJournee(maintenant);
  const debutMoisCourant = debutMois(maintenant);
  const ilYA6Mois = new Date(maintenant.getFullYear(), maintenant.getMonth() - 5, 1);

  const [
    ventesAujourdhui,
    ventesDuMois,
    nombreVentesTotal,
    nombreClients,
    nombreFournisseurs,
    produits,
    dernieresVentes,
    dernieresLivraisons,
    ventes6Mois,
    livraisons6Mois,
    lignesVenteRecentes,
  ] = await Promise.all([
    db.vente.aggregate({
      where: { creeLe: { gte: debutAujourdhui }, statut: "VALIDEE" },
      _sum: { totalTTC: true },
      _count: true,
    }),
    db.vente.aggregate({
      where: { creeLe: { gte: debutMoisCourant }, statut: "VALIDEE" },
      _sum: { totalTTC: true },
      _count: true,
    }),
    db.vente.count({ where: { statut: "VALIDEE" } }),
    db.client.count({ where: { actif: true } }),
    db.fournisseur.count({ where: { actif: true } }),
    db.produit.findMany({
      where: { statut: "ACTIF" },
      select: { id: true, nom: true, quantiteStock: true, stockMin: true, prixAchat: true },
    }),
    db.vente.findMany({
      orderBy: { creeLe: "desc" },
      take: 8,
      include: { client: { select: { nom: true } } },
    }),
    db.livraison.findMany({
      orderBy: { dateLivraison: "desc" },
      take: 8,
      include: { fournisseur: { select: { nom: true } } },
    }),
    db.vente.findMany({
      where: { creeLe: { gte: ilYA6Mois }, statut: "VALIDEE" },
      select: { creeLe: true, totalTTC: true },
    }),
    db.livraison.findMany({
      where: { dateLivraison: { gte: ilYA6Mois } },
      select: { dateLivraison: true, totalTTC: true },
    }),
    db.ligneVente.findMany({
      where: { vente: { creeLe: { gte: ilYA6Mois }, statut: "VALIDEE" } },
      select: { quantite: true, totalLigneTTC: true, produit: { select: { id: true, nom: true } } },
    }),
  ]);

  // Clients avec solde debiteur (calcule en memoire : le volume de clients
  // actifs reste raisonnable pour une PME, cf. limite documentee dans le README).
  const clientsAvecVentes = await db.client.findMany({
    where: { actif: true },
    select: {
      id: true,
      nom: true,
      ventes: { select: { totalTTC: true, montantPaye: true } },
    },
  });
  const clientsSoldeDebiteur = clientsAvecVentes
    .map((c) => {
      const totalAchete = c.ventes.reduce((s, v) => s + Number(v.totalTTC), 0);
      const totalPaye = c.ventes.reduce((s, v) => s + Number(v.montantPaye), 0);
      return { id: c.id, nom: c.nom, solde: totalAchete - totalPaye };
    })
    .filter((c) => c.solde > 0)
    .sort((a, b) => b.solde - a.solde)
    .slice(0, 10);

  // Valeur totale du stock = somme(quantite * prix d'achat) sur tous les produits actifs
  const valeurStock = produits.reduce(
    (s, p) => s + Number(p.quantiteStock) * Number(p.prixAchat),
    0
  );
  const produitsEnRupture = produits.filter((p) => Number(p.quantiteStock) <= 0);
  const produitsBientotEnRupture = produits.filter(
    (p) => Number(p.quantiteStock) > 0 && Number(p.quantiteStock) <= Number(p.stockMin)
  );

  // Evolution des ventes / achats par mois (6 derniers mois)
  const cleMois = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const moisSeries: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    moisSeries.push(cleMois(d));
  }
  const ventesParMois = Object.fromEntries(moisSeries.map((m) => [m, 0]));
  for (const v of ventes6Mois) {
    const cle = cleMois(new Date(v.creeLe));
    if (cle in ventesParMois) ventesParMois[cle] += Number(v.totalTTC);
  }
  const achatsParMois = Object.fromEntries(moisSeries.map((m) => [m, 0]));
  for (const l of livraisons6Mois) {
    const cle = cleMois(new Date(l.dateLivraison));
    if (cle in achatsParMois) achatsParMois[cle] += Number(l.totalTTC);
  }
  const evolutionVentesAchats = moisSeries.map((m) => ({
    mois: m,
    ventes: Math.round(ventesParMois[m] * 100) / 100,
    achats: Math.round(achatsParMois[m] * 100) / 100,
  }));

  // Meilleurs / moins bons produits vendus (par quantite cumulee, 6 derniers mois)
  const statsParProduit = new Map<string, { nom: string; quantite: number; ca: number }>();
  for (const ligne of lignesVenteRecentes) {
    const cle = ligne.produit.id;
    const entree = statsParProduit.get(cle) ?? { nom: ligne.produit.nom, quantite: 0, ca: 0 };
    entree.quantite += Number(ligne.quantite);
    entree.ca += Number(ligne.totalLigneTTC);
    statsParProduit.set(cle, entree);
  }
  const produitsTries = [...statsParProduit.values()].sort((a, b) => b.quantite - a.quantite);
  const meilleursProduits = produitsTries.slice(0, 5);
  const produitsMoinsVendus = produitsTries.slice(-5).reverse();

  // Top clients / fournisseurs (par CA, 6 derniers mois)
  const ventesParClient = await db.vente.groupBy({
    by: ["clientId"],
    where: { creeLe: { gte: ilYA6Mois }, statut: "VALIDEE" },
    _sum: { totalTTC: true },
    orderBy: { _sum: { totalTTC: "desc" } },
    take: 5,
  });
  const clientsIds = ventesParClient.map((v) => v.clientId);
  const clientsInfos = await db.client.findMany({ where: { id: { in: clientsIds } } });
  const topClients = ventesParClient.map((v) => ({
    nom: clientsInfos.find((c) => c.id === v.clientId)?.nom ?? "?",
    total: Number(v._sum.totalTTC ?? 0),
  }));

  const achatsParFournisseur = await db.livraison.groupBy({
    by: ["fournisseurId"],
    where: { dateLivraison: { gte: ilYA6Mois } },
    _sum: { totalTTC: true },
    orderBy: { _sum: { totalTTC: "desc" } },
    take: 5,
  });
  const fournisseursIds = achatsParFournisseur.map((f) => f.fournisseurId);
  const fournisseursInfos = await db.fournisseur.findMany({ where: { id: { in: fournisseursIds } } });
  const topFournisseurs = achatsParFournisseur.map((f) => ({
    nom: fournisseursInfos.find((x) => x.id === f.fournisseurId)?.nom ?? "?",
    total: Number(f._sum.totalTTC ?? 0),
  }));

  return NextResponse.json({
    donnees: {
      kpi: {
        caJour: Number(ventesAujourdhui._sum.totalTTC ?? 0),
        caMois: Number(ventesDuMois._sum.totalTTC ?? 0),
        nombreVentesJour: ventesAujourdhui._count,
        nombreVentesMois: ventesDuMois._count,
        nombreVentesTotal,
        nombreClients,
        nombreFournisseurs,
        valeurStock: Math.round(valeurStock * 100) / 100,
        nombreProduitsEnRupture: produitsEnRupture.length,
        nombreProduitsBientotEnRupture: produitsBientotEnRupture.length,
      },
      dernieresVentes,
      dernieresLivraisons,
      clientsSoldeDebiteur,
      produitsEnRupture: produitsEnRupture.slice(0, 10),
      produitsBientotEnRupture: produitsBientotEnRupture.slice(0, 10),
      meilleursProduits,
      produitsMoinsVendus,
      evolutionVentesAchats,
      topClients,
      topFournisseurs,
    },
  });
});
