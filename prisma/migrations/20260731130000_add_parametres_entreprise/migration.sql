-- CreateTable
CREATE TABLE "parametres_entreprise" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL DEFAULT 'Mon Entreprise',
    "adresse" TEXT,
    "ville" TEXT,
    "pays" TEXT DEFAULT 'Maroc',
    "telephone" TEXT,
    "email" TEXT,
    "ice" TEXT,
    "identifiantFiscal" TEXT,
    "registreCommerce" TEXT,
    "logoUrl" TEXT,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametres_entreprise_pkey" PRIMARY KEY ("id")
);
