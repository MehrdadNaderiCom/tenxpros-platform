import { Prisma, PrismaClient } from "@prisma/client";

const globalForDatabase = globalThis as unknown as {
  tenxprosIrDatabase?: PrismaClient;
};

function createDatabaseClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const db =
  globalForDatabase.tenxprosIrDatabase ??
  createDatabaseClient();

// Compatibility alias for server modules that use the conventional name.
export const prisma = db;

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.tenxprosIrDatabase = db;
}

export type DatabaseTransaction = Prisma.TransactionClient;
