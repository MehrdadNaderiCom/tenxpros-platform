/**
 * Pure pricing helpers shared by the public page, the admin update action, and
 * tests. No prisma / no network so they can be unit-tested in isolation.
 */

export type PricingTierView = {
  tier: string;
  name: string;
  price: number;
  isActive: boolean;
};

export const MAX_PRICE = 100000;
export const MAX_MEMBERS = 100000;

/**
 * Validate an admin pricing-tier update. Throws a clear error on invalid input.
 * `price` and `membersLimit` must be positive whole numbers below a sanity ceiling.
 */
export function parsePricingUpdate(input: { price: unknown; membersLimit: unknown }): {
  price: number;
  membersLimit: number;
} {
  const price = Number(input.price);
  const membersLimit = Number(input.membersLimit);
  if (!Number.isInteger(price) || price <= 0 || price >= MAX_PRICE) {
    throw new Error(`Price must be a positive whole number under ${MAX_PRICE}.`);
  }
  if (!Number.isInteger(membersLimit) || membersLimit <= 0 || membersLimit >= MAX_MEMBERS) {
    throw new Error(`Member limit must be a positive whole number under ${MAX_MEMBERS}.`);
  }
  return { price, membersLimit };
}

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Plain USD label, e.g. 997 -> "$997". */
export function usdPlain(amount: number): string {
  return fmt.format(amount);
}

/** Marketing-style USD label, e.g. 997 -> "$997 USD". */
export function usd(amount: number): string {
  return `${fmt.format(amount)} USD`;
}

/** Marketing description per charter tier (copy is not stored in the DB). */
export const LADDER_DESC: Record<string, string> = {
  FOUNDING: "Open while founding review capacity remains.",
  EARLY: "Opens after Founding Charter closes.",
  LATE: "Opens after Early Charter closes.",
  FINAL: "Opens after Late Charter closes.",
  STANDARD: "Ongoing entry point after the charter windows close.",
};
