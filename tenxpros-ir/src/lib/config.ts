import path from "node:path";
import { z } from "zod";

export const IRAN_TIME_ZONE = "Asia/Tehran" as const;

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).optional(),
);

const optionalUrl = z.preprocess(
  emptyStringToUndefined,
  z.string().url().optional(),
);

const integerFromEnv = (fallback: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === "") return fallback;
      return typeof value === "string" ? Number(value) : value;
    },
    z.number().int(),
  );

const booleanFromEnv = (fallback: boolean) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === "") return fallback;
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;
      }
      return value;
    },
    z.boolean(),
  );

export const programConfigSchema = z.object({
  listPriceToman: z.number().int().positive(),
  foundingCharterPriceToman: z.number().int().positive(),
  coachingHourlyPriceToman: z.number().int().positive(),
  officeHourMinutes: z.literal(30),
  weeklyGatheringMinutes: z.literal(90),
  timeZone: z.literal(IRAN_TIME_ZONE),
});

export type ProgramConfig = z.infer<typeof programConfigSchema>;

const PROGRAM_CONFIG: ProgramConfig = Object.freeze({
  listPriceToman: 90_000_000,
  foundingCharterPriceToman: 60_000_000,
  coachingHourlyPriceToman: 5_000_000,
  officeHourMinutes: 30,
  weeklyGatheringMinutes: 90,
  timeZone: IRAN_TIME_ZONE,
});

export function getProgramConfig(): ProgramConfig {
  return PROGRAM_CONFIG;
}

const appConfigSchema = z.object({
  appUrl: z.string().url(),
  nodeEnv: z.enum(["development", "test", "production"]),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

let appConfigCache: AppConfig | undefined;

export function getAppConfig(): AppConfig {
  appConfigCache ??= appConfigSchema.parse({
    appUrl: process.env.APP_URL ?? "http://localhost:3100",
    nodeEnv: process.env.NODE_ENV ?? "development",
  });
  return appConfigCache;
}

const authConfigSchema = z.object({
  adminSessionHours: z.number().int().min(1).max(168),
  applicantSessionDays: z.number().int().min(1).max(90),
});

export type AuthConfig = z.infer<typeof authConfigSchema>;

let authConfigCache: AuthConfig | undefined;

export function getAuthConfig(): AuthConfig {
  authConfigCache ??= authConfigSchema.parse({
    adminSessionHours: integerFromEnv(12).parse(
      process.env.ADMIN_SESSION_HOURS,
    ),
    applicantSessionDays: integerFromEnv(30).parse(
      process.env.APPLICANT_SESSION_DAYS,
    ),
  });
  return authConfigCache;
}

const uploadConfigSchema = z.object({
  directory: z.string().min(1),
  maximumBytes: z.number().int().min(1_024).max(25 * 1024 * 1024),
});

export type UploadConfig = z.infer<typeof uploadConfigSchema>;

let uploadConfigCache: UploadConfig | undefined;

export function getUploadConfig(): UploadConfig {
  const configuredDirectory =
    optionalString.parse(process.env.UPLOAD_DIR) ?? "storage/receipts";

  uploadConfigCache ??= uploadConfigSchema.parse({
    directory: path.resolve(process.cwd(), configuredDirectory),
    maximumBytes: integerFromEnv(8 * 1024 * 1024).parse(
      process.env.MAX_RECEIPT_UPLOAD_BYTES,
    ),
  });
  return uploadConfigCache;
}

const zoomConfigSchema = z
  .object({
    mode: z.enum(["zoom", "mock"]),
    accountId: optionalString,
    clientId: optionalString,
    clientSecret: optionalString,
    userId: optionalString,
  })
  .superRefine((value, context) => {
    if (value.mode !== "zoom") return;

    for (const [field, configured] of [
      ["accountId", value.accountId],
      ["clientId", value.clientId],
      ["clientSecret", value.clientSecret],
      ["userId", value.userId],
    ] as const) {
      if (!configured) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `ZOOM_${field.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()} is required when ZOOM_MODE=zoom.`,
        });
      }
    }
  });

export type ZoomConfig = z.infer<typeof zoomConfigSchema>;

let zoomConfigCache: ZoomConfig | undefined;

export function getZoomConfig(): ZoomConfig {
  zoomConfigCache ??= zoomConfigSchema.parse({
    mode: process.env.ZOOM_MODE ?? "zoom",
    accountId: process.env.ZOOM_ACCOUNT_ID,
    clientId: process.env.ZOOM_CLIENT_ID,
    clientSecret: process.env.ZOOM_CLIENT_SECRET,
    userId: process.env.ZOOM_USER_ID,
  });
  return zoomConfigCache;
}

const mailConfigSchema = z
  .object({
    host: optionalString,
    port: z.number().int().min(1).max(65_535),
    secure: z.boolean(),
    user: optionalString,
    password: optionalString,
    from: optionalString,
    adminEmail: optionalString,
  })
  .superRefine((value, context) => {
    const hasAnySmtpValue = Boolean(
      value.host || value.user || value.password || value.from,
    );

    if (hasAnySmtpValue && (!value.host || !value.from)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SMTP_HOST and EMAIL_FROM are both required to enable email.",
      });
    }

    if (Boolean(value.user) !== Boolean(value.password)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SMTP_USER and SMTP_PASSWORD must be configured together.",
      });
    }
  });

export type MailConfig = z.infer<typeof mailConfigSchema>;

let mailConfigCache: MailConfig | undefined;

export function getMailConfig(): MailConfig {
  mailConfigCache ??= mailConfigSchema.parse({
    host: process.env.SMTP_HOST,
    port: integerFromEnv(587).parse(process.env.SMTP_PORT),
    secure: booleanFromEnv(false).parse(process.env.SMTP_SECURE),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM ?? process.env.MAIL_FROM,
    adminEmail: process.env.ADMIN_EMAIL,
  });
  return mailConfigCache;
}

const bankTransferConfigSchema = z.object({
  accountHolder: z.string().trim().min(2),
  bankName: z.string().trim().min(2),
  cardNumber: z.string().regex(/^\d{16}$/),
  iban: z.string().regex(/^IR\d{24}$/i),
  accountNumber: z.string().trim().min(5),
});

export type BankTransferConfig = z.infer<typeof bankTransferConfigSchema>;

export function getBankTransferConfig(): BankTransferConfig | null {
  const candidate = {
    accountHolder: process.env.BANK_ACCOUNT_HOLDER,
    bankName: process.env.BANK_NAME,
    cardNumber: process.env.BANK_CARD_NUMBER,
    iban: process.env.BANK_IBAN,
    accountNumber: process.env.BANK_ACCOUNT_NUMBER,
  };

  if (Object.values(candidate).every((value) => !value)) return null;
  return bankTransferConfigSchema.parse(candidate);
}

// Useful for deployment health checks without exposing the parsed values.
export function validateServerConfiguration() {
  const app = getAppConfig();
  getAuthConfig();
  getUploadConfig();
  const zoom = getZoomConfig();
  const mail = getMailConfig();
  const bank = getBankTransferConfig();

  if (app.nodeEnv === "production") {
    if (zoom.mode !== "zoom") {
      throw new Error("ZOOM_MODE must be zoom in production.");
    }
    if (process.env.EMAIL_MODE !== "smtp" || !mail.host || !mail.from) {
      throw new Error("SMTP email delivery must be configured in production.");
    }
    if (!bank) {
      throw new Error("Bank transfer details must be configured in production.");
    }
    if ((process.env.RATE_LIMIT_SALT?.trim().length ?? 0) < 32) {
      throw new Error(
        "RATE_LIMIT_SALT must contain at least 32 characters in production.",
      );
    }
  }
}

export const configSchemas = {
  app: appConfigSchema,
  auth: authConfigSchema,
  upload: uploadConfigSchema,
  zoom: zoomConfigSchema,
  mail: mailConfigSchema,
  bankTransfer: bankTransferConfigSchema,
  program: programConfigSchema,
} as const;
