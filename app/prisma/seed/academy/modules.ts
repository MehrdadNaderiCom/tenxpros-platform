import type { ModuleSeed } from "./content-types";
import { m01 } from "./m01-mission";
import { m02 } from "./m02-identity";
import { m03 } from "./m03-rules";
import { m04 } from "./m04-product";
import { m05 } from "./m05-journey";
import { m06 } from "./m06-ranks";
import { m07 } from "./m07-coach";
import { m08 } from "./m08-selling";
import { m09 } from "./m09-prospecting";
import { m10 } from "./m10-conversation";
import { m11 } from "./m11-operations";
import { m12 } from "./m12-mechanics";
import { m13 } from "./m13-motions";
import { m14 } from "./m14-customize";

/**
 * All fourteen Partner Academy modules in order, transcribed verbatim from the
 * build specification. The engine, gating, badge, and UI are content-count
 * agnostic; the badge gate uses the count of published modules.
 */
export const ACADEMY_MODULES: ModuleSeed[] = [m01, m02, m03, m04, m05, m06, m07, m08, m09, m10, m11, m12, m13, m14];
