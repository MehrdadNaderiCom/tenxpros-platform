import { checkConfigDrift, type ConfigDriftReport } from "@/lib/partner/config-server";

export const dynamic = "force-dynamic";

/**
 * Liveness plus the config drift alarm.
 *
 * The commission engine pays from the live ProgramConfig row, while the
 * public partners page, the plain-language terms, and the reference generator
 * render the compile-time defaults. The owner's rule is that any config
 * change ships with a redeploy so the two move together; `configDrift`
 * surfaces any divergence between them, field by field.
 *
 * Drift deliberately does NOT flip `ok` to false: a deliberate DB-side change
 * must not page anyone, kill the container (Docker healthchecks curl this
 * endpoint), or fail a deploy gate. It just has to be impossible to miss here
 * until the accompanying redeploy ships. The check is one indexed singleton
 * read; if it fails outright (for example the database is briefly down), the
 * endpoint still answers ok with status "check_failed", because container
 * liveness must never depend on this extra signal.
 */
export async function GET() {
  let configDrift: ConfigDriftReport | { status: "check_failed"; differences: [] };
  try {
    configDrift = await checkConfigDrift();
  } catch {
    configDrift = { status: "check_failed", differences: [] };
  }
  return Response.json({ ok: true, configDrift });
}
