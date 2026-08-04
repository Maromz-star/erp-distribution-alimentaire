-- CreateEnum
CREATE TYPE "PlateformeAppareil" AS ENUM ('ANDROID', 'IOS');

-- CreateEnum
CREATE TYPE "CibleNotification" AS ENUM ('UTILISATEUR', 'ROLE', 'TOUS');

-- CreateEnum
CREATE TYPE "StatutEnvoiNotification" AS ENUM ('ENVOYE', 'ECHEC', 'TOKEN_INVALIDE');

-- CreateTable
CREATE TABLE "appareils" (
  "id" TEXT NOT NULL,
  "utilisateurId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "plateforme" "PlateformeAppareil" NOT NULL,
  "actif" BOOLEAN NOT NULL DEFAULT true,
  "derniereActiviteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "appareils_pkey" PRIMARY KEY ("id")
  );

-- CreateTable
CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "titre" TEXT NOT NULL,
  "corps" TEXT NOT NULL,
  "donnees" JSONB,
  "cible" "CibleNotification" NOT NULL,
  "cibleValeur" TEXT,
  "envoyeParId" TEXT NOT NULL,
  "totalEnvoyes" INTEGER NOT NULL DEFAULT 0,
  "totalEchecs" INTEGER NOT NULL DEFAULT 0,
  "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
  );

-- CreateTable
CREATE TABLE "envois_notifications" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "appareilId" TEXT NOT NULL,
  "statut" "StatutEnvoiNotification" NOT NULL,
  "erreur" TEXT,
  "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "envois_notifications_pkey" PRIMARY KEY ("id")
  );

-- CreateIndex
CREATE UNIQUE INDEX "appareils_token_key" ON "appareils"("token");

-- CreateIndex
CREATE INDEX "appareils_utilisateurId_idx" ON "appareils"("utilisateurId");

-- CreateIndex
CREATE INDEX "notifications_creeLe_idx" ON "notifications"("creeLe");

-- CreateIndex
CREATE INDEX "envois_notifications_notificationId_idx" ON "envois_notifications"("notificationId");

-- CreateIndex
CREATE INDEX "envois_notifications_appareilId_idx" ON "envois_notifications"("appareilId");

-- AddForeignKey
ALTER TABLE "appareils" ADD CONSTRAINT "appareils_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_envoyeParId_fkey" FOREIGN KEY ("envoyeParId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envois_notifications" ADD CONSTRAINT "envois_notifications_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envois_notifications" ADD CONSTRAINT "envois_notifications_appareilId_fkey" FOREIGN KEY ("appareilId") REFERENCES "appareils"("id") ON DELETE CASCADE ON UPDATE CASCADE;
