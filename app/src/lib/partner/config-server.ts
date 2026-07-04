import type { ProgramConfig } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { type ConfigDriftDifference, type EffectiveConfig, diffConfigFromDefaults, mergeConfig } from "./config";

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

/** The drift check result: in sync, diverging fields, or no row to compare. */
export interface ConfigDriftReport {
  status: "in_sync" | "drift" | "row_missing";
  differences: ConfigDriftDifference[];
}

/**
 * Compare the live ProgramConfig row (what the engine pays from) against the
 * compile-time defaults (what the public page, the terms, and the reference
 * generator render). One indexed singleton read; a missing row is reported as
 * its own status rather than thrown (the resolver self-heals the row on first
 * use, so missing simply means the app has not served yet). Database errors
 * are left to the caller, so a health endpoint can degrade gracefully.
 */
export async function checkConfigDrift(): Promise<ConfigDriftReport> {
  const row = await prisma.programConfig.findUnique({ where: { id: "singleton" } });
  if (!row) return { status: "row_missing", differences: [] };
  const differences = diffConfigFromDefaults(row as unknown as Record<string, unknown>);
  return differences.length === 0
    ? { status: "in_sync", differences: [] }
    : { status: "drift", differences };
}
