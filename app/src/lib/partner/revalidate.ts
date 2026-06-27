import { revalidatePath } from "next/cache";

/**
 * revalidatePath throws when called outside a request's static-generation store
 * (e.g. from a script). Swallow only that specific case, matching the existing
 * helper in lib/actions/applications.ts.
 */
export function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    if (error instanceof Error && error.message.includes("static generation store missing")) return;
    throw error;
  }
}
