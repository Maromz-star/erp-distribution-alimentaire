// Script d'amorçage de la base de données : cree un compte administrateur
// et un jeu de donnees de demonstration realiste (produits alimentaires,
// clients, fournisseurs, quelques ventes et livraisons) pour pouvoir tester
// l'application immediatement apres installation.
//
// Execution : npm run db:seed  (voir package.json)

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Amorçage de la base de donnees...");

  // ------------------------------------------------------------------
  // Utilisateurs
  // ------------------------------------------------------------------
  const motDePasseHache = await bcrypt.hash("admin1234", 12);
  const admin = await db.user.upsert({
    where: { email: "admin@distribution.local" },
    update: {},
    create: {
      nom: "Administrateur",
      email: "admin@distribution.local",
      motDePasse: motDePasseHache,
      role: "ADMIN",
    },
  });

  const motDePasseEmploye = await bcrypt.hash("employe1234", 12);
  await db.user.upsert({
    where: { email: "employe@distribution.local" },
    update: {},
    create: {
      nom: "Amine Alaoui",
      email: "employe@distribution.local",
      motDePasse: motDePasseEmploye,
      role: "EMPLOYE",
    },
  });

  // ------------------------------------------------------------------
  // Categories / marques
  // ------------------------------------------------------------------
  const epicerie = await db.categorie.create({ data: { nom: "Epicerie" } });
  const boissons = await db.categorie.create({ data: { nom: "Boissons" } });
  const laitier = await db.categorie.create({ data: { nom: "Produits laitiers" } });

  const sousCatHuiles = await db.sousCategorie.create({ data: { nom: "Huiles & condiments", categorieId: epicerie.id } });
  const sousCatEaux = await db.sousCategorie.create({ data: { nom: "Eaux & sodas", categorieId: boissons.id } });

  const marqueA = await db.marque.create({ data: { nom: "Marque Atlas" } });
  const marqueB = await db.marque.create({ data: { nom: "Marque Oasis" } });

  // ------------------------------------------------------------------
  // Fournisseurs
  // ------------------------------------------------------------------
  const fournisseur1 = await db.fournisseur.create({
    data: {
      nom: "Grossiste Atlas Alimentaire",
      societe: "Atlas Distribution SARL",
      telephone: "05 22 00 00 01",
      email: "contact@atlas-distrib.example",
      ville: "Casablanca",
      pays: "Maroc",
      ice: "001234567000012",
      conditionsPaiement: "30 jours net",
    },
  });
  const fournisseur2 = await db.fournisseur.create({
    data: {
      nom: "Boissons du Sud",
      societe: "BDS Import Export",
      telephone: "05 22 00 00 02",
      email: "contact@bds.example",
      ville: "Agadir",
      pays: "Maroc",
      conditionsPaiement: "Comptant",
    },
  });

  // ------------------------------------------------------------------
  // Produits
  // ------------------------------------------------------------------
  const produitsData = [
    {
      codeProduit: "EPI-001",
      nom: "Huile d'olive extra vierge 1L",
      categorieId: epicerie.id,
      sousCategorieId: sousCatHuiles.id,
      marqueId: marqueA.id,
      prixAchat: 45,
      prixVente: 62,
      tauxTVA: 20,
      unite: "unite",
      quantiteStock: 120,
      stockMin: 20,
      fournisseurPrincipalId: fournisseur1.id,
    },
    {
      codeProduit: "EPI-002",
      nom: "Farine de ble type 55 - sac 10kg",
      categorieId: epicerie.id,
      marqueId: marqueA.id,
      prixAchat: 55,
      prixVente: 72,
      tauxTVA: 10,
      unite: "sac",
      quantiteStock: 8,
      stockMin: 10,
      fournisseurPrincipalId: fournisseur1.id,
    },
    {
      codeProduit: "BOI-001",
      nom: "Eau minerale 1.5L (pack de 6)",
      categorieId: boissons.id,
      sousCategorieId: sousCatEaux.id,
      marqueId: marqueB.id,
      prixAchat: 18,
      prixVente: 26,
      tauxTVA: 20,
      unite: "pack",
      quantiteStock: 200,
      stockMin: 40,
      fournisseurPrincipalId: fournisseur2.id,
    },
    {
      codeProduit: "BOI-002",
      nom: "Soda orange 33cl (pack de 24)",
      categorieId: boissons.id,
      marqueId: marqueB.id,
      prixAchat: 60,
      prixVente: 84,
      tauxTVA: 20,
      unite: "pack",
      quantiteStock: 0,
      stockMin: 15,
      fournisseurPrincipalId: fournisseur2.id,
    },
    {
      codeProduit: "LAI-001",
      nom: "Lait UHT demi-ecreme 1L",
      categorieId: laitier.id,
      prixAchat: 6.5,
      prixVente: 8.5,
      tauxTVA: 10,
      unite: "unite",
      quantiteStock: 300,
      stockMin: 50,
      fournisseurPrincipalId: fournisseur1.id,
    },
  ];

  const produits = [];
  for (const p of produitsData) {
    const produit = await db.produit.create({ data: p });
    produits.push(produit);
    if (Number(p.quantiteStock) > 0) {
      await db.mouvementStock.create({
        data: {
          produitId: produit.id,
          type: "INVENTAIRE",
          quantite: p.quantiteStock,
          stockApres: p.quantiteStock,
          motif: "Stock initial (donnees de demonstration)",
          utilisateurId: admin.id,
        },
      });
    }
  }

  // ------------------------------------------------------------------
  // Clients
  // ------------------------------------------------------------------
  const client1 = await db.client.create({
    data: {
      nom: "Epicerie Chez Karim",
      societe: "Karim Commerce",
      telephone: "06 61 00 00 01",
      email: "karim@example.com",
      ville: "Casablanca",
      pays: "Maroc",
    },
  });
  const client2 = await db.client.create({
    data: {
      nom: "Superette Al Amal",
      telephone: "06 61 00 00 02",
      ville: "Rabat",
      pays: "Maroc",
    },
  });

  // ------------------------------------------------------------------
  // Une vente de demonstration (decremente le stock, comme en production)
  // ------------------------------------------------------------------
  const ligneVente1 = { produit: produits[0], quantite: 10 };
  const ligneVente2 = { produit: produits[4], quantite: 24 };

  const totalLigne1HT = Number(ligneVente1.produit.prixVente) * ligneVente1.quantite;
  const totalLigne1TVA = totalLigne1HT * (Number(ligneVente1.produit.tauxTVA) / 100);
  const totalLigne2HT = Number(ligneVente2.produit.prixVente) * ligneVente2.quantite;
  const totalLigne2TVA = totalLigne2HT * (Number(ligneVente2.produit.tauxTVA) / 100);

  const vente = await db.vente.create({
    data: {
      numeroFacture: `FV-${new Date().getFullYear()}-00001`,
      clientId: client1.id,
      utilisateurId: admin.id,
      sousTotalHT: totalLigne1HT + totalLigne2HT,
      totalRemise: 0,
      totalTVA: totalLigne1TVA + totalLigne2TVA,
      totalTTC: totalLigne1HT + totalLigne1TVA + totalLigne2HT + totalLigne2TVA,
      montantPaye: totalLigne1HT + totalLigne1TVA, // paiement partiel de demonstration
      statut: "VALIDEE",
      lignes: {
        create: [
          {
            produitId: ligneVente1.produit.id,
            quantite: ligneVente1.quantite,
            prixUnitaire: ligneVente1.produit.prixVente,
            remisePct: 0,
            tauxTVA: ligneVente1.produit.tauxTVA,
            totalLigneHT: totalLigne1HT,
            totalLigneTTC: totalLigne1HT + totalLigne1TVA,
          },
          {
            produitId: ligneVente2.produit.id,
            quantite: ligneVente2.quantite,
            prixUnitaire: ligneVente2.produit.prixVente,
            remisePct: 0,
            tauxTVA: ligneVente2.produit.tauxTVA,
            totalLigneHT: totalLigne2HT,
            totalLigneTTC: totalLigne2HT + totalLigne2TVA,
          },
        ],
      },
    },
  });

  for (const l of [ligneVente1, ligneVente2]) {
    const nouveauStock = Number(l.produit.quantiteStock) - l.quantite;
    await db.produit.update({ where: { id: l.produit.id }, data: { quantiteStock: nouveauStock } });
    await db.mouvementStock.create({
      data: {
        produitId: l.produit.id,
        type: "SORTIE_VENTE",
        quantite: l.quantite,
        stockApres: nouveauStock,
        reference: vente.numeroFacture,
        utilisateurId: admin.id,
      },
    });
  }

  await db.reglement.create({
    data: {
      clientId: client1.id,
      venteId: vente.id,
      utilisateurId: admin.id,
      montant: totalLigne1HT + totalLigne1TVA,
      mode: "VIREMENT",
      reference: "VIR-DEMO-001",
    },
  });

  console.log("Amorçage termine.");
  console.log("");
  console.log("Comptes crees :");
  console.log("  Admin    : admin@distribution.local / admin1234");
  console.log("  Employe  : employe@distribution.local / employe1234");
  console.log("");
  console.log("Pensez a changer ces mots de passe avant toute mise en production.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
