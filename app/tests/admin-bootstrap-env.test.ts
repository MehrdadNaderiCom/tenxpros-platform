import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = process.cwd();

function productionEnvironmentWithoutBootstrapSecrets(): NodeJS.ProcessEnv {
  const stripeLink = "https://buy.stripe.com/synthetic";

  return {
    NODE_ENV: "test",
    APP_URL: "https://tenxpros.com",
    NEXT_PUBLIC_APP_URL: "https://tenxpros.com",
    SESSION_SECRET: "s".repeat(40),
    AUTH_SECRET: "a".repeat(40),
    NEXTAUTH_SECRET: "n".repeat(40),
    AUTH_TRUST_HOST: "true",
    AUTH_URL: "https://tenxpros.com",
    NEXTAUTH_URL: "https://tenxpros.com",
    DATABASE_URL: "postgresql://launch_check:synthetic@db:5432/tenxpros",
    EMAIL_PROVIDER: "resend",
    RESEND_API_KEY: `re_${"r".repeat(32)}`,
    EMAIL_FROM: "TenXPros <noreply@tenxpros.invalid>",
    STRIPE_PAYMENT_LINK_FOUNDING: stripeLink,
    STRIPE_PAYMENT_LINK_EARLY: stripeLink,
    STRIPE_PAYMENT_LINK_LATE: stripeLink,
    STRIPE_PAYMENT_LINK_FINAL: stripeLink,
    STRIPE_PAYMENT_LINK_STANDARD: stripeLink,
  };
}

describe("manual admin bootstrap environment", () => {
  it("does not make bootstrap credentials a Production runtime dependency", () => {
    const result = spawnSync(
      process.execPath,
      [
        join(appRoot, "scripts/check-launch-env.mjs"),
        "--mode",
        "production",
        "--file",
        join(appRoot, ".nonexistent-admin-bootstrap-env"),
      ],
      {
        cwd: appRoot,
        encoding: "utf8",
        env: productionEnvironmentWithoutBootstrapSecrets(),
      },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("PASS: launch environment check passed.");
    expect(result.stdout).toMatch(/ADMIN_EMAIL\s+MISSING\s+optional/);
    expect(result.stdout).toMatch(/ADMIN_PASSWORD\s+MISSING\s+optional/);
  });

  it("still refuses a manual bootstrap without an explicit password", () => {
    const result = spawnSync(
      process.execPath,
      [join(appRoot, "scripts/bootstrap-admin.mjs")],
      {
        cwd: appRoot,
        encoding: "utf8",
        env: {
          NODE_ENV: "production",
          ADMIN_EMAIL: "bootstrap-admin@tenxpros.invalid",
        },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "ADMIN_EMAIL and ADMIN_PASSWORD (or --password-stdin) are required.",
    );
  });
});
