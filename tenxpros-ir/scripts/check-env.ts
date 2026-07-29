import "dotenv/config";
import path from "node:path";
import {
  getAppConfig,
  getBankTransferConfig,
  getMailConfig,
  getProgramConfig,
  getUploadConfig,
  getZoomConfig,
  validateServerConfiguration,
} from "../src/lib/config";

const placeholderPattern =
  /(replace|change[-_ ]?me|example\.com|your-domain|local-test|password-here)/i;

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  if (/[\r\n]/.test(value)) {
    throw new Error(`${name} must not contain line breaks.`);
  }
  if (placeholderPattern.test(value)) {
    throw new Error(`${name} still contains a placeholder value.`);
  }
  return value;
}

function main() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Production environment check skipped outside NODE_ENV=production.");
    return;
  }

  validateServerConfiguration();

  const app = getAppConfig();
  const appUrl = new URL(app.appUrl);
  if (appUrl.protocol !== "https:") {
    throw new Error("APP_URL must use HTTPS in production.");
  }
  if (
    appUrl.origin !== "https://tenxpros.ir" ||
    appUrl.pathname !== "/" ||
    appUrl.search ||
    appUrl.hash ||
    appUrl.username ||
    appUrl.password
  ) {
    throw new Error("APP_URL must be the canonical origin https://tenxpros.ir.");
  }

  const database = new URL(required("DATABASE_URL"));
  if (!["postgresql:", "postgres:"].includes(database.protocol)) {
    throw new Error("DATABASE_URL must use PostgreSQL.");
  }
  if (!database.username || !database.password || database.password.length < 16) {
    throw new Error(
      "DATABASE_URL must include a database user and a password of at least 16 characters.",
    );
  }

  const rateLimitSalt = required("RATE_LIMIT_SALT");
  if (rateLimitSalt.length < 32) {
    throw new Error("RATE_LIMIT_SALT must contain at least 32 characters.");
  }

  const adminEmail = required("ADMIN_EMAIL");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) {
    throw new Error("ADMIN_EMAIL is invalid.");
  }

  for (const name of [
    "PUBLIC_LEGAL_OPERATOR_NAME",
    "PUBLIC_LEGAL_JURISDICTION",
    "PUBLIC_DATA_CONTROLLER_NAME",
  ]) {
    required(name);
  }
  for (const name of [
    "PUBLIC_LEGAL_CONTACT_EMAIL",
    "PARTNER_APPLICATION_EMAIL",
  ]) {
    const email = required(name);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error(`${name} is invalid.`);
    }
  }

  if (process.argv.includes("--seed")) {
    const adminSecret =
      process.env.ADMIN_PASSWORD_HASH?.trim() ||
      process.env.ADMIN_INITIAL_PASSWORD?.trim() ||
      process.env.ADMIN_PASSWORD?.trim();
    if (!adminSecret || placeholderPattern.test(adminSecret)) {
      throw new Error(
        "A non-placeholder ADMIN_PASSWORD_HASH or ADMIN_INITIAL_PASSWORD is required for the initial seed.",
      );
    }
    if (!process.env.ADMIN_PASSWORD_HASH && adminSecret.length < 14) {
      throw new Error(
        "ADMIN_INITIAL_PASSWORD must contain at least 14 characters.",
      );
    }
  }

  const program = getProgramConfig();
  const configuredStandardPrice = Number(
    process.env.FOUNDING_STANDARD_PRICE_TOMAN ?? program.listPriceToman,
  );
  const configuredFoundingPrice = Number(
    process.env.FOUNDING_CHARTER_PRICE_TOMAN ??
      program.foundingCharterPriceToman,
  );
  if (
    configuredStandardPrice !== program.listPriceToman ||
    configuredFoundingPrice !== program.foundingCharterPriceToman
  ) {
    throw new Error(
      "Program prices must remain 90000000 and 60000000 toman for this edition.",
    );
  }

  const uploads = getUploadConfig();
  const configuredUploadDirectory = required("UPLOAD_DIR");
  if (
    process.env.TENXPROS_DEPLOYMENT_MODE === "docker" &&
    uploads.directory !== "/app/uploads"
  ) {
    throw new Error("UPLOAD_DIR must be /app/uploads in the supplied Docker setup.");
  }
  if (!path.isAbsolute(configuredUploadDirectory)) {
    throw new Error("UPLOAD_DIR must be an absolute path in production.");
  }
  const publicDirectory = path.resolve(process.cwd(), "public");
  const nextDirectory = path.resolve(process.cwd(), ".next");
  if (
    uploads.directory === publicDirectory ||
    uploads.directory.startsWith(`${publicDirectory}${path.sep}`) ||
    uploads.directory === nextDirectory ||
    uploads.directory.startsWith(`${nextDirectory}${path.sep}`)
  ) {
    throw new Error("UPLOAD_DIR must not be inside public or .next.");
  }
  if (uploads.maximumBytes !== 8 * 1024 * 1024) {
    throw new Error("MAX_RECEIPT_UPLOAD_BYTES must be 8388608.");
  }

  const bank = getBankTransferConfig();
  if (!bank) {
    throw new Error("Bank transfer details are required.");
  }
  const expectedBank = {
    accountHolder: "مهرداد نادری",
    bankName: "بانک سامان",
    cardNumber: "6219861043222503",
    iban: "IR350560085980002210941001",
    accountNumber: "859-800-2210941-1",
  };
  for (const [key, expected] of Object.entries(expectedBank)) {
    if (bank[key as keyof typeof bank] !== expected) {
      throw new Error(
        `Configured bank detail ${key} does not match the approved value.`,
      );
    }
  }

  if (process.env.EMAIL_MODE !== "smtp") {
    throw new Error("EMAIL_MODE must be smtp in production.");
  }
  required("SMTP_HOST");
  required("EMAIL_FROM");
  if (process.env.SMTP_USER || process.env.SMTP_PASSWORD) {
    required("SMTP_USER");
    required("SMTP_PASSWORD");
  }
  const mail = getMailConfig();
  if (!mail.host || !mail.from) {
    throw new Error("SMTP_HOST and EMAIL_FROM are required.");
  }

  if (process.env.ZOOM_MODE !== "zoom") {
    throw new Error("ZOOM_MODE must be zoom in production.");
  }
  for (const name of [
    "ZOOM_ACCOUNT_ID",
    "ZOOM_CLIENT_ID",
    "ZOOM_CLIENT_SECRET",
    "ZOOM_USER_ID",
  ]) {
    required(name);
  }
  getZoomConfig();

  console.log("Production environment configuration is valid.");
}

try {
  main();
} catch (error) {
  console.error(
    error instanceof Error
      ? `Production environment check failed: ${error.message}`
      : "Production environment check failed.",
  );
  process.exitCode = 1;
}
