import "server-only";
import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).optional(),
);

const optionalEmail = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().email().optional(),
);

const publicLegalConfigSchema = z.object({
  operatorName: optionalText,
  operatorRegistration: optionalText,
  operatorAddress: optionalText,
  jurisdiction: optionalText,
  dataControllerName: optionalText,
  legalContactEmail: z.string().trim().email(),
  partnerApplicationEmail: z.string().trim().email(),
});

export type PublicLegalConfig = z.infer<typeof publicLegalConfigSchema>;

let publicLegalConfigCache: PublicLegalConfig | undefined;

export function getPublicLegalConfig(): PublicLegalConfig {
  publicLegalConfigCache ??= Object.freeze(
    publicLegalConfigSchema.parse({
      operatorName: process.env.PUBLIC_LEGAL_OPERATOR_NAME,
      operatorRegistration: process.env.PUBLIC_LEGAL_OPERATOR_REGISTRATION,
      operatorAddress: process.env.PUBLIC_LEGAL_OPERATOR_ADDRESS,
      jurisdiction: process.env.PUBLIC_LEGAL_JURISDICTION,
      dataControllerName: process.env.PUBLIC_DATA_CONTROLLER_NAME,
      legalContactEmail:
        optionalEmail.parse(process.env.PUBLIC_LEGAL_CONTACT_EMAIL) ??
        "support@tenxpros.ir",
      partnerApplicationEmail:
        optionalEmail.parse(process.env.PARTNER_APPLICATION_EMAIL) ??
        "hello@tenxpros.ir",
    }),
  );

  return publicLegalConfigCache;
}

export function formatConfiguredOperator(
  config: PublicLegalConfig,
): string | null {
  if (!config.operatorName) return null;

  return [
    config.operatorName,
    config.operatorRegistration
      ? `شناسه ثبت ${config.operatorRegistration}`
      : undefined,
    config.operatorAddress,
  ]
    .filter((value): value is string => Boolean(value))
    .join("، ");
}
