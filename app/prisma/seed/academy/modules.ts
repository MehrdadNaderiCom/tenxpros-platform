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
import { m15 } from "./m15-contact";
import { m16 } from "./m16-alumni";
import { m17 } from "./m17-sharing";

/**
 * All seventeen Partner Academy modules in order. Modules 1 to 14 are exam-bearing
 * (a lesson, six exercises, and a twelve-question exam each). Modules 15 to 17 are
 * informational (Contact Us, Alumni Network, Experience Sharing): a lesson only,
 * no exam, and they never count toward the final-exam gate or the sequential
 * unlock. The engine, gating, badge, and UI read the exam-bearing count from the
 * database (isInformational = false), so the total can grow without breaking the
 * gate.
 */
export const ACADEMY_MODULES: ModuleSeed[] = [m01, m02, m03, m04, m05, m06, m07, m08, m09, m10, m11, m12, m13, m14, m15, m16, m17];
