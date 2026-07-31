-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYE', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "StatutProduit" AS ENUM ('ACTIF', 'INACTIF', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "StatutVente" AS ENUM ('BROUILLON', 'VALIDEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "StatutLivraison" AS ENUM ('BROUILLON', 'VALIDEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "TypeMouvement" AS ENUM ('ENTREE_LIVRAISON', 'SORTIE_VENTE', 'AJUSTEMENT_POSITIF', 'AJUSTEMENT_NEGATIF', 'INVENTAIRE');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('ESPECES', 'VIREMENT', 'CHEQUE', 'TRAITE', 'CARTE_BANCAIRE');

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYE',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_actions" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "cible" TEXT,
    "details" JSONB,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sous_categories" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "categorieId" TEXT NOT NULL,

    CONSTRAINT "sous_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marques" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "marques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produits" (
    "id" TEXT NOT NULL,
    "codeProduit" TEXT NOT NULL,
    "codeBarre" TEXT,
    "nom" TEXT NOT NULL,
    "categorieId" TEXT,
    "sousCategorieId" TEXT,
    "marqueId" TEXT,
    "description" TEXT,
    "photoPrincipale" TEXT,
    "prixAchat" DECIMAL(12,2) NOT NULL,
    "prixVente" DECIMAL(12,2) NOT NULL,
    "prixPromo" DECIMAL(12,2),
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "unite" TEXT NOT NULL DEFAULT 'unite',
    "quantiteStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "quantiteReservee" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "stockMin" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "stockMax" DECIMAL(12,3),
    "emplacement" TEXT,
    "fournisseurPrincipalId" TEXT,
    "datePeremption" TIMESTAMP(3),
    "statut" "StatutProduit" NOT NULL DEFAULT 'ACTIF',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produit_photos" (
    "id" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "produit_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fournisseurs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "societe" TEXT,
    "telephone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "pays" TEXT DEFAULT 'Maroc',
    "ice" TEXT,
    "identifiantFiscal" TEXT,
    "registreCommerce" TEXT,
    "personneContact" TEXT,
    "conditionsPaiement" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fournisseurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "societe" TEXT,
    "telephone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "pays" TEXT DEFAULT 'Maroc',
    "ice" TEXT,
    "identifiantFiscal" TEXT,
    "registreCommerce" TEXT,
    "personneContact" TEXT,
    "plafondCredit" DECIMAL(12,2),
    "commentaires" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventes" (
    "id" TEXT NOT NULL,
    "numeroFacture" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "sousTotalHT" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalRemise" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalTVA" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalTTC" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montantPaye" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "statut" "StatutVente" NOT NULL DEFAULT 'VALIDEE',
    "commentaires" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_vente" (
    "id" TEXT NOT NULL,
    "venteId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "quantite" DECIMAL(12,3) NOT NULL,
    "prixUnitaire" DECIMAL(12,2) NOT NULL,
    "remisePct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tauxTVA" DECIMAL(5,2) NOT NULL,
    "totalLigneHT" DECIMAL(12,2) NOT NULL,
    "totalLigneTTC" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "lignes_vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livraisons" (
    "id" TEXT NOT NULL,
    "numeroBon" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "totalHT" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalTTC" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montantPaye" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "statut" "StatutLivraison" NOT NULL DEFAULT 'VALIDEE',
    "dateLivraison" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentaires" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "livraisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_livraison" (
    "id" TEXT NOT NULL,
    "livraisonId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "quantite" DECIMAL(12,3) NOT NULL,
    "prixAchat" DECIMAL(12,2) NOT NULL,
    "totalLigne" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "lignes_livraison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements_stock" (
    "id" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "type" "TypeMouvement" NOT NULL,
    "quantite" DECIMAL(12,3) NOT NULL,
    "stockApres" DECIMAL(12,3) NOT NULL,
    "reference" TEXT,
    "utilisateurId" TEXT,
    "motif" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mouvements_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reglements" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "venteId" TEXT,
    "utilisateurId" TEXT NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "mode" "ModePaiement" NOT NULL,
    "reference" TEXT,
    "dateReglement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentaires" TEXT,

    CONSTRAINT "reglements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements_fournisseurs" (
    "id" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "livraisonId" TEXT,
    "utilisateurId" TEXT NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "mode" "ModePaiement" NOT NULL,
    "reference" TEXT,
    "datePaiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentaires" TEXT,

    CONSTRAINT "paiements_fournisseurs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE INDEX "journal_actions_utilisateurId_idx" ON "journal_actions"("utilisateurId");

-- CreateIndex
CREATE INDEX "journal_actions_creeLe_idx" ON "journal_actions"("creeLe");

-- CreateIndex
CREATE UNIQUE INDEX "marques_nom_key" ON "marques"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "produits_codeProduit_key" ON "produits"("codeProduit");

-- CreateIndex
CREATE UNIQUE INDEX "produits_codeBarre_key" ON "produits"("codeBarre");

-- CreateIndex
CREATE INDEX "produits_nom_idx" ON "produits"("nom");

-- CreateIndex
CREATE INDEX "produits_statut_idx" ON "produits"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "ventes_numeroFacture_key" ON "ventes"("numeroFacture");

-- CreateIndex
CREATE INDEX "ventes_clientId_idx" ON "ventes"("clientId");

-- CreateIndex
CREATE INDEX "ventes_creeLe_idx" ON "ventes"("creeLe");

-- CreateIndex
CREATE UNIQUE INDEX "livraisons_numeroBon_key" ON "livraisons"("numeroBon");

-- CreateIndex
CREATE INDEX "livraisons_fournisseurId_idx" ON "livraisons"("fournisseurId");

-- CreateIndex
CREATE INDEX "livraisons_dateLivraison_idx" ON "livraisons"("dateLivraison");

-- CreateIndex
CREATE INDEX "mouvements_stock_produitId_idx" ON "mouvements_stock"("produitId");

-- CreateIndex
CREATE INDEX "mouvements_stock_creeLe_idx" ON "mouvements_stock"("creeLe");

-- CreateIndex
CREATE INDEX "reglements_clientId_idx" ON "reglements"("clientId");

-- CreateIndex
CREATE INDEX "paiements_fournisseurs_fournisseurId_idx" ON "paiements_fournisseurs"("fournisseurId");

-- AddForeignKey
ALTER TABLE "journal_actions" ADD CONSTRAINT "journal_actions_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sous_categories" ADD CONSTRAINT "sous_categories_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_sousCategorieId_fkey" FOREIGN KEY ("sousCategorieId") REFERENCES "sous_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_marqueId_fkey" FOREIGN KEY ("marqueId") REFERENCES "marques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_fournisseurPrincipalId_fkey" FOREIGN KEY ("fournisseurPrincipalId") REFERENCES "fournisseurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produit_photos" ADD CONSTRAINT "produit_photos_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventes" ADD CONSTRAINT "ventes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventes" ADD CONSTRAINT "ventes_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_vente" ADD CONSTRAINT "lignes_vente_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "ventes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_vente" ADD CONSTRAINT "lignes_vente_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livraisons" ADD CONSTRAINT "livraisons_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "fournisseurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livraisons" ADD CONSTRAINT "livraisons_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_livraison" ADD CONSTRAINT "lignes_livraison_livraisonId_fkey" FOREIGN KEY ("livraisonId") REFERENCES "livraisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_livraison" ADD CONSTRAINT "lignes_livraison_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglements" ADD CONSTRAINT "reglements_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglements" ADD CONSTRAINT "reglements_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "ventes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglements" ADD CONSTRAINT "reglements_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_fournisseurs" ADD CONSTRAINT "paiements_fournisseurs_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "fournisseurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_fournisseurs" ADD CONSTRAINT "paiements_fournisseurs_livraisonId_fkey" FOREIGN KEY ("livraisonId") REFERENCES "livraisons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_fournisseurs" ADD CONSTRAINT "paiements_fournisseurs_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
