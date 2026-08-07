import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/authz";
import { PARTNER_VIEW_COOKIE } from "@/lib/partner/auth";
import { PARTICIPANT_VIEW_COOKIE } from "@/lib/participant/view";

export const dynamic = "force-dynamic";

/** Clear any active read-only preview and return to the admin panel. */
export async function GET(req: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const to = new URL(req.url).searchParams.get("to");
  const dest = to && to.startsWith("/") && !to.startsWith("//") ? to : "/admin";
  // Relative Location (proxy-safe).
  const res = new NextResponse(null, { status: 307, headers: { Location: dest } });
  res.cookies.delete(PARTNER_VIEW_COOKIE);
  res.cookies.delete(PARTICIPANT_VIEW_COOKIE);
  return res;
}
