import { PrismaClient } from "@prisma/client";

// En développement, Next.js recharge les modules à chaud (HMR), ce qui créerait
// une nouvelle instance de PrismaClient à chaque sauvegarde et finirait par
// épuiser les connexions PostgreSQL. On garde donc une instance unique sur
// l'objet global en dev, et une instance normale en production.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
