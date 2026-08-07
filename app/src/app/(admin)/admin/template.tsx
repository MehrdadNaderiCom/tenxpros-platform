import { notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/authz";

/** Re-runs on every client navigation, unlike a persistent App Router layout. */
export default async function AdminAuthorizationTemplate({ children }: { children: React.ReactNode }) {
  try {
    await requireAdminUser();
  } catch {
    notFound();
  }
  return children;
}
