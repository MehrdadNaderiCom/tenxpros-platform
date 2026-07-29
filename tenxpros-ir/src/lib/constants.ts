import "server-only";
import { getProgramConfig } from "@/lib/config";

export const BRAND_NAME = "TenXPros";
export const IRAN_TIME_ZONE = "Asia/Tehran";

const program = getProgramConfig();

export const OFFER = {
  standardPriceToman: program.listPriceToman,
  foundingPriceToman: program.foundingCharterPriceToman,
  coachingPriceToman: program.coachingHourlyPriceToman,
  officeHourMinutes: program.officeHourMinutes,
  roundtableMinutes: program.weeklyGatheringMinutes,
} as const;

export const BANK_DETAILS = {
  holder: process.env.BANK_ACCOUNT_HOLDER ?? "مهرداد نادری",
  bank: process.env.BANK_NAME ?? "بانک سامان",
  card: process.env.BANK_CARD_NUMBER ?? "6219861043222503",
  iban: process.env.BANK_IBAN ?? "IR350560085980002210941001",
  account: process.env.BANK_ACCOUNT_NUMBER ?? "859-800-2210941-1",
} as const;
