import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routeApi, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";

type Ligne = Record<string, string | number>;

function versCSV(lignes: Ligne[]): string {
  if (lignes.length === 0) return "";
  const entetes = Object.keys(lignes[0]);
  const echapper = (v: string | number) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lignesTexte = lignes.map((l) => entetes.map((e) => echapper(l[e])).join(";"));
  // BOM UTF-8 en tete : garantit que les caracteres accentues s'affichent
  // correctement a l'ouverture du CSV dans Excel (comportement par defaut
  // sinon: Excel suppose du Windows-1252 et casse les caracteres UTF-8).
  return "\uFEFF" + [entetes.join(";"), ...lignesTexte].join("\n");
}

function reponseCSV(nomFichier: string, lignes: Ligne[]) {
  return new NextResponse(versCSV(lignes), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
    },
  });
}

// GET /api/rapports?type=ventes|achats|stock|clients|fournisseurs|reglements|benefices
//                    &format=json|csv&du=YYYY-MM-DD&au=YYYY-MM-DD
//
// NOTE SUR L'EXPORT PDF : ce module genere du CSV (compatible Excel/Sheets),
// suffisant pour l'analyse et la comptabilite. Un export PDF mis en forme
// (logo, en-tete d'entreprise) necessite une lib de rendu HTML->PDF cote
// serveur (ex: puppeteer ou @react-pdf/renderer) - volontairement laisse
// pour une iteration suivante, voir README section "Prochaines etapes".
export const GET = routeApi(async (request: NextRequest) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "rapports.lire");

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "ventes";
  const format = searchParams.get("format") ?? "json";
  const du = searchParams.get("du") ? new Date(searchParams.get("du")!) : undefined;
  const au = searchParams.get("au") ? new Date(searchParams.get("au")!) : undefined;
  const plage = du || au ? { gte: du, lte: au } : undefined;

  switch (type) {
    case "ventes": {
      const ventes = await db.vente.findMany({
        where: plage ? { creeLe: plage } : {},
        include: { client: { select: { nom: true } } },
        orderBy: { creeLe: "desc" },
      });
      const lignes: Ligne[] = ventes.map((v) => ({
        Facture: v.numeroFacture,
        Date: v.creeLe.toISOString().slice(0, 10),
        Client: v.client.nom,
        "Total HT": Number(v.sousTotalHT),
        TVA: Number(v.totalTVA),
        "Total TTC": Number(v.totalTTC),
        Paye: Number(v.montantPaye),
        Solde: Number(v.totalTTC) - Number(v.montantPaye),
        Statut: v.statut,
      }));
      return format === "csv"
        ? reponseCSV("rapport_ventes.csv", lignes)
        : NextResponse.json({ donnees: lignes });
    }

    case "achats": {
      const livraisons = await db.livraison.findMany({
        where: plage ? { dateLivraison: plage } : {},
        include: { fournisseur: { select: { nom: true } } },
        orderBy: { dateLivraison: "desc" },
      });
      const lignes: Ligne[] = livraisons.map((l) => ({
        Bon: l.numeroBon,
        Date: l.dateLivraison.toISOString().slice(0, 10),
        Fournisseur: l.fournisseur.nom,
        "Total HT": Number(l.totalHT),
        "Total TTC": Number(l.totalTTC),
        Paye: Number(l.montantPaye),
        Solde: Number(l.totalTTC) - Number(l.montantPaye),
      }));
      return format === "csv"
        ? reponseCSV("rapport_achats.csv", lignes)
        : NextResponse.json({ donnees: lignes });
    }

    case "stock": {
      const produits = await db.produit.findMany({
        where: { statut: "ACTIF" },
        orderBy: { nom: "asc" },
      });
      const lignes: Ligne[] = produits.map((p) => ({
        Code: p.codeProduit,
        Nom: p.nom,
        "Stock actuel": Number(p.quantiteStock),
        "Stock min": Number(p.stockMin),
        Unite: p.unite,
        "Prix d'achat": Number(p.prixAchat),
        "Valeur stock": Number(p.quantiteStock) * Number(p.prixAchat),
        Statut: Number(p.quantiteStock) <= 0 ? "RUPTURE" : Number(p.quantiteStock) <= Number(p.stockMin) ? "FAIBLE" : "OK",
      }));
      return format === "csv"
        ? reponseCSV("rapport_stock.csv", lignes)
        : NextResponse.json({ donnees: lignes });
    }

    case "clients": {
      const clients = await db.client.findMany({
        include: { ventes: { select: { totalTTC: true, montantPaye: true } } },
        orderBy: { nom: "asc" },
      });
      const lignes: Ligne[] = clients.map((c) => {
        const totalAchete = c.ventes.reduce((s, v) => s + Number(v.totalTTC), 0);
        const totalPaye = c.ventes.reduce((s, v) => s + Number(v.montantPaye), 0);
        return {
          Nom: c.nom,
          Societe: c.societe ?? "",
          Ville: c.ville ?? "",
          Telephone: c.telephone ?? "",
          "Total achete": totalAchete,
          "Total paye": totalPaye,
          Solde: totalAchete - totalPaye,
        };
      });
      return format === "csv"
        ? reponseCSV("rapport_clients.csv", lignes)
        : NextResponse.json({ donnees: lignes });
    }

    case "fournisseurs": {
      const fournisseurs = await db.fournisseur.findMany({
        include: { livraisons: { select: { totalTTC: true, montantPaye: true } } },
        orderBy: { nom: "asc" },
      });
      const lignes: Ligne[] = fournisseurs.map((f) => {
        const totalAchete = f.livraisons.reduce((s, l) => s + Number(l.totalTTC), 0);
        const totalPaye = f.livraisons.reduce((s, l) => s + Number(l.montantPaye), 0);
        return {
          Nom: f.nom,
          Societe: f.societe ?? "",
          Ville: f.ville ?? "",
          Telephone: f.telephone ?? "",
          "Total achete": totalAchete,
          "Total paye": totalPaye,
          "Reste a payer": totalAchete - totalPaye,
        };
      });
      return format === "csv"
        ? reponseCSV("rapport_fournisseurs.csv", lignes)
        : NextResponse.json({ donnees: lignes });
    }

    case "reglements": {
      const reglements = await db.reglement.findMany({
        where: plage ? { dateReglement: plage } : {},
        include: { client: { select: { nom: true } }, vente: { select: { numeroFacture: true } } },
        orderBy: { dateReglement: "desc" },
      });
      const lignes: Ligne[] = reglements.map((r) => ({
        Date: r.dateReglement.toISOString().slice(0, 10),
        Client: r.client.nom,
        Facture: r.vente?.numeroFacture ?? "",
        Montant: Number(r.montant),
        Mode: r.mode,
        Reference: r.reference ?? "",
      }));
      return format === "csv"
        ? reponseCSV("rapport_reglements.csv", lignes)
        : NextResponse.json({ donnees: lignes });
    }

    case "benefices": {
      // Benefice par produit vendu = (prix de vente - prix d'achat au moment
      // de la vente) x quantite. On utilise le prixUnitaire historise sur la
      // ligne de vente (le prix reel facture) contre le prixAchat ACTUEL du
      // produit, faute d'historiser aussi le cout d'achat par ligne - limite
      // connue documentee dans le README (le cout d'achat peut avoir change
      // entre la vente et aujourd'hui pour les ventes anciennes).
      const lignesVente = await db.ligneVente.findMany({
        where: plage ? { vente: { creeLe: plage } } : {},
        include: { produit: { select: { nom: true, prixAchat: true } }, vente: { select: { numeroFacture: true, creeLe: true } } },
      });
      const lignes: Ligne[] = lignesVente.map((l) => {
        const cout = Number(l.produit.prixAchat) * Number(l.quantite);
        const revenu = Number(l.totalLigneHT);
        return {
          Facture: l.vente.numeroFacture,
          Date: l.vente.creeLe.toISOString().slice(0, 10),
          Produit: l.produit.nom,
          Quantite: Number(l.quantite),
          "CA (HT)": revenu,
          "Cout estime": Math.round(cout * 100) / 100,
          "Marge estimee": Math.round((revenu - cout) * 100) / 100,
        };
      });
      return format === "csv"
        ? reponseCSV("rapport_benefices.csv", lignes)
        : NextResponse.json({ donnees: lignes });
    }

    default:
      return NextResponse.json({ erreur: `Type de rapport inconnu : ${type}` }, { status: 400 });
  }
});
