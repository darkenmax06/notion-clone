// lib/prisma.ts — Singleton de PrismaClient para Server Components y Server Actions
// NUNCA importar en Client Components ("use client")

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// En desarrollo, reusar la instancia entre hot-reloads para evitar
// "too many connections" con el pool de Prisma
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
