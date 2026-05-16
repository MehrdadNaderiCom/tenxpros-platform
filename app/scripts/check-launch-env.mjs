import fs from "node:fs";
import path from "node:path";

const requiredKeys = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "SESSION_SECRET",
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "EMAIL_PROVIDER",
  "EMAIL_FROM",
  "STRIPE_PAYMENT_LINK_FOUNDING",
  "STRIPE_PAYMENT_LINK_EARLY",
  "STRIPE_PAYMENT_LINK_LATE",
  "STRIPE_PAYMENT_LINK_FINAL",
  "STRIPE_PAYMENT_LINK_STANDARD",
];

const optionalDomainKeys = ["AUTH_URL", "NEXTAUTH_URL"];

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
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function defaultEnvFiles() {
  return ["../.env.production", ".env.production", ".env"].filter((filePath) =>
    fs.existsSync(path.resolve(process.cwd(), filePath)),
  );
}

const envFile = argValue("--file");
const envFiles = envFile ? [envFile] : defaultEnvFiles();
const fileValues = envFiles.reduce(
  (values, filePath) => ({ ...values, ...parseEnvFile(path.resolve(process.cwd(), filePath)) }),
  {},
);
const env = { ...fileValues, ...process.env };

function statusFor(value) {
  return value ? "PRESENT" : "MISSING";
}

let hasFailure = false;

console.log("TenXPros launch environment check");
console.log(`Env files: ${envFiles.length ? envFiles.join(", ") : "process environment only"}`);
console.log("");

for (const key of requiredKeys) {
  const status = statusFor(env[key]);
  if (status !== "PRESENT") hasFailure = true;
  console.log(`${key}: ${status}`);
}

console.log("");
for (const key of optionalDomainKeys) {
  console.log(`${key}: ${statusFor(env[key])}`);
}

if (hasFailure) {
  console.error("");
  console.error("Launch environment check failed. Missing values must be configured before production.");
  process.exit(1);
}

console.log("");
console.log("Launch environment check passed.");
