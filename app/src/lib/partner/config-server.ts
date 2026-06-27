import type { ProgramConfig } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { type EffectiveConfig, mergeConfig } from "./config";

/**
 * DB-backed config resolvers. Kept separate from the pure `config.ts` so the
 * commission engine, rules and unit tests never transitively import Prisma.
 */

/** Load the singleton ProgramConfig, creating it with defaults if missing. */
export async function getOrCreateProgramConfig(): Promise<ProgramConfig> {
  const existing = await prisma.programConfig.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return prisma.programConfig.create({ data: { id: "singleton" } });
}

/** Global defaults, resolved from the DB singleton (no partner overrides). */
export async function resolveGlobalConfig(): Promise<EffectiveConfig> {
  const global = await getOrCreateProgramConfig();
  return mergeConfig(global, null);
}

/**
 * Effective config for a partner: global defaults merged with this partner's
 * overrides. Pass no id (or null) for the global view. This is the ONLY entry
 * point the commission engine and rules read commercial numbers through.
 */
export async function resolvePartnerConfig(partnerId?: string | null): Promise<EffectiveConfig> {
  const global = await getOrCreateProgramConfig();
  const override = partnerId
    ? await prisma.partnerConfig.findUnique({ where: { partnerId } })
    : null;
  return mergeConfig(global, override);
}
