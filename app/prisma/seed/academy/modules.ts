import type { ModuleSeed } from "./content-types";
import { m01 } from "./m01-mission";
import { m02 } from "./m02-identity";
import { m03 } from "./m03-rules";

/**
 * All Partner Academy modules in order. The full programme is fourteen modules;
 * they are seeded as their verbatim content is wired in. The engine, gating,
 * badge, and UI are content-count agnostic, so the badge gate uses the count of
 * published modules.
 */
export const ACADEMY_MODULES: ModuleSeed[] = [m01, m02, m03];
