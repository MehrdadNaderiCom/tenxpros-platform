import fs from "node:fs";
import path from "node:path";

const MODES = new Set(["production", "local"]);

const groups = [
  {
    name: "Core app",
    variables: [
      {
        key: "APP_URL",
        visibility: "public-origin",
        required: ["production", "local"],
        description: "Canonical app origin used by server-rendered metadata and links.",
        validate: validateUrl({ allowLocalhostInProduction: false }),
      },
      {
        key: "NEXT_PUBLIC_APP_URL",
        visibility: "public",
        required: ["production"],
        description: "Browser-visible app origin used by public links.",
        validate: validateUrl({ allowLocalhostInProduction: false }),
      },
      {
        key: "SESSION_SECRET",
        visibility: "secret",
        required: ["production"],
        description: "Fallback session secret kept for compatibility with existing auth config.",
        validate: validateSecret,
      },
    ],
  },
  {
    name: "Auth",
    variables: [
      {
        key: "AUTH_SECRET",
        visibility: "secret",
        required: ["production"],
        description: "Primary Auth.js secret.",
        validate: validateSecret,
      },
      {
        key: "NEXTAUTH_SECRET",
        visibility: "secret",
        required: ["production"],
        description: "Auth.js/NextAuth compatibility secret.",
        validate: validateSecret,
      },
      {
        key: "AUTH_TRUST_HOST",
        visibility: "server-config",
        required: ["production", "local"],
        description: "Allows Auth.js to trust the configured deployment host.",
        validate(value) {
          return value === "true" ? ok() : fail("must be true for the launch deployment path");
        },
      },
      {
        key: "AUTH_URL",
        visibility: "public-origin",
        required: ["production"],
        description: "Canonical Auth.js URL for the production deployment.",
        validate: validateUrl({ allowLocalhostInProduction: false }),
      },
      {
        key: "NEXTAUTH_URL",
        visibility: "public-origin",
        required: ["production"],
        description: "NextAuth compatibility URL for the production deployment.",
        validate: validateUrl({ allowLocalhostInProduction: false }),
      },
    ],
  },
  {
    name: "Database",
    variables: [
      {
        key: "DATABASE_URL",
        visibility: "secret",
        required: ["production", "local"],
        description: "PostgreSQL connection string used by Prisma.",
        validate(value, mode) {
          if (!value.startsWith("postgresql://") && !value.startsWith("postgres://")) {
            return fail("must be a PostgreSQL connection string");
          }
          if (mode === "production" && /localhost|127\.0\.0\.1|tenxpros_dev/i.test(value)) {
            return fail("must point to the production PostgreSQL database");
          }
          return ok();
        },
      },
    ],
  },
  {
    name: "Email",
    variables: [
      {
        key: "EMAIL_PROVIDER",
        visibility: "server-config",
        required: ["production"],
        description: "Email provider selector. Production launch expects resend.",
        validate(value, mode) {
          if (mode === "production" && value !== "resend") return fail("must be resend in production");
          if (!["resend", "console"].includes(value)) return fail("must be resend or console");
          return ok();
        },
      },
      {
        key: "RESEND_API_KEY",
        visibility: "secret",
        required: ["production"],
        description: "Resend API key for transactional email.",
        validate(value) {
          if (looksPlaceholder(value)) return fail("looks like a placeholder");
          return value.length >= 20 ? ok() : fail("looks too short for a production API key");
        },
      },
      {
        key: "EMAIL_FROM",
        visibility: "public-address",
        required: ["production"],
        description: "Verified sender address, for example TenXPros <hello@tenxpros.com>.",
        validate(value, mode) {
          if (!value.includes("@")) return fail("must include an email address");
          if (mode === "production" && /example|test/i.test(value)) return fail("must use a verified production sender");
          return ok();
        },
      },
    ],
  },
  {
    name: "Stripe payment links",
    variables: [
      {
        key: "STRIPE_PAYMENT_LINK_FOUNDING",
        visibility: "payment-url",
        required: ["production"],
        description: "Manual Stripe Payment Link for Founding Charter.",
        validate: validateStripeLink,
      },
      {
        key: "STRIPE_PAYMENT_LINK_EARLY",
        visibility: "payment-url",
        required: ["production"],
        description: "Manual Stripe Payment Link for Early Charter.",
        validate: validateStripeLink,
      },
      {
        key: "STRIPE_PAYMENT_LINK_LATE",
        visibility: "payment-url",
        required: ["production"],
        description: "Manual Stripe Payment Link for Late Charter.",
        validate: validateStripeLink,
      },
      {
        key: "STRIPE_PAYMENT_LINK_FINAL",
        visibility: "payment-url",
        required: ["production"],
        description: "Manual Stripe Payment Link for Final Charter.",
        validate: validateStripeLink,
      },
      {
        key: "STRIPE_PAYMENT_LINK_STANDARD",
        visibility: "payment-url",
        required: ["production"],
        description: "Manual Stripe Payment Link for Standard pricing.",
        validate: validateStripeLink,
      },
    ],
  },
  {
    name: "Admin bootstrap",
    variables: [
      {
        key: "ADMIN_EMAIL",
        visibility: "secret-operational",
        required: [],
        description:
          "Optional admin identity for an explicitly invoked bootstrap; it is not a runtime dependency.",
        validate(value, mode) {
          if (!value.includes("@")) return fail("must be an email address");
          if (mode === "production" && /test|example/i.test(value)) return fail("must use a real production admin email");
          return ok();
        },
      },
      {
        key: "ADMIN_PASSWORD",
        visibility: "secret",
        required: [],
        description:
          "Optional input for an explicitly invoked bootstrap; do not keep it in the runtime environment.",
        validate(value) {
          if (looksPlaceholder(value)) return fail("looks like a placeholder");
          return value.length >= 16 ? ok() : fail("must be at least 16 characters");
        },
      },
    ],
  },
];

function ok() {
  return { ok: true };
}

function fail(reason) {
  return { ok: false, reason };
}

function validateUrl({ allowLocalhostInProduction }) {
  return (value, mode) => {
    try {
      const parsed = new URL(value);
      if (!["http:", "https:"].includes(parsed.protocol)) return fail("must be http or https");
      if (mode === "production" && parsed.protocol !== "https:") return fail("must use https in production");
      if (mode === "production" && !allowLocalhostInProduction && ["localhost", "127.0.0.1"].includes(parsed.hostname)) {
        return fail("must not use localhost in production");
      }
      return ok();
    } catch {
      return fail("must be a valid URL");
    }
  };
}

function validateSecret(value) {
  if (looksPlaceholder(value)) return fail("looks like a placeholder");
  return value.length >= 32 ? ok() : fail("must be at least 32 characters");
}

function validateStripeLink(value) {
  if (looksPlaceholder(value)) return fail("looks like a placeholder");
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return fail("must use https");
    if (!/stripe\.com$/i.test(parsed.hostname) && !/stripe\.com/i.test(parsed.hostname)) {
      return fail("must point to Stripe");
    }
    return ok();
  } catch {
    return fail("must be a valid Stripe URL");
  }
}

function looksPlaceholder(value) {
  return /change-me|changeme|replace-me|placeholder|example|your-|todo|test_secret|sk_test/i.test(value);
}

function parseEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  const values = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsAt = line.indexOf("=");
    if (equalsAt === -1) continue;
    const key = line.slice(0, equalsAt).trim();
    let value = line.slice(equalsAt + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function argValue(name) {
  const exactIndex = process.argv.indexOf(name);
  if (exactIndex !== -1) return process.argv[exactIndex + 1];

  const prefixed = process.argv.find((argument) => argument.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : undefined;
}

function defaultEnvFiles(selectedMode) {
  const candidates =
    selectedMode === "production"
      ? [".env", ".env.production", "../.env.production"]
      : ["../.env.production", ".env.production", ".env"];

  return candidates.filter((filePath) =>
    fs.existsSync(path.resolve(process.cwd(), filePath)),
  );
}

function valueStatus(value) {
  return value ? "PRESENT" : "MISSING";
}

const mode = argValue("--mode") ?? "production";
if (!MODES.has(mode)) {
  console.error(`Unknown mode: ${mode}`);
  console.error("Use --mode production or --mode local.");
  process.exit(2);
}

const envFile = argValue("--file");
const envFiles = envFile ? [envFile] : defaultEnvFiles(mode);
const fileValues = envFiles.reduce(
  (values, filePath) => ({ ...values, ...parseEnvFile(path.resolve(process.cwd(), filePath)) }),
  {},
);
const env = { ...fileValues, ...process.env };
const failures = [];
const warnings = [];

console.log("TenXPros launch environment check");
console.log(`Mode: ${mode}`);
console.log(`Env files: ${envFiles.length ? envFiles.join(", ") : "process environment only"}`);
console.log("Secret values are never printed.");

for (const group of groups) {
  console.log("");
  console.log(`[${group.name}]`);

  for (const variable of group.variables) {
    const isRequired = variable.required.includes(mode);
    const rawValue = env[variable.key];
    const status = valueStatus(rawValue);
    let result = ok();

    if (status === "MISSING" && isRequired) {
      result = fail("required value is missing");
    } else if (status === "PRESENT" && variable.validate) {
      result = variable.validate(rawValue, mode, env);
    }

    const requiredLabel = isRequired ? "required" : "optional";
    const resultLabel = result.ok ? status : "INVALID";
    const line = `  ${variable.key.padEnd(32)} ${resultLabel.padEnd(8)} ${requiredLabel.padEnd(8)} ${variable.visibility}`;
    console.log(line);

    if (!result.ok && isRequired) {
      failures.push({ group: group.name, key: variable.key, reason: result.reason });
    } else if (!result.ok) {
      warnings.push({ group: group.name, key: variable.key, reason: result.reason });
    }
  }
}

if (mode === "local") {
  if (!env.AUTH_SECRET && !env.NEXTAUTH_SECRET && !env.SESSION_SECRET) {
    failures.push({
      group: "Auth",
      key: "AUTH_SECRET | NEXTAUTH_SECRET | SESSION_SECRET",
      reason: "local mode needs at least one auth secret",
    });
  }

  warnings.push({
    group: "Local mode",
    key: "mode",
    reason: "local mode is for Docker/development acceptance only; production launch requires --mode production",
  });
}

if (warnings.length) {
  console.log("");
  console.log("Warnings:");
  for (const warning of warnings) {
    console.log(`  - ${warning.group}: ${warning.key} (${warning.reason})`);
  }
}

if (failures.length) {
  console.log("");
  console.log("FAIL: launch environment check failed.");
  console.log("Missing or invalid required values:");
  for (const failure of failures) {
    console.log(`  - ${failure.group}: ${failure.key} (${failure.reason})`);
  }
  console.log("");
  console.log("Configure the missing values in the hosting provider or pass --file <env-file>, then rerun:");
  console.log("  npm run launch:env-check");
  process.exit(1);
}

console.log("");
console.log("PASS: launch environment check passed.");
