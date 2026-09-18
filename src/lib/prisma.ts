/**
 * Prisma Client — singleton para Next.js
 *
 * Em desenvolvimento o hot-reload recria módulos a cada alteração,
 * o que causaria múltiplas conexões ao banco. O padrão abaixo
 * reutiliza a instância existente armazenada em `globalThis`.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
