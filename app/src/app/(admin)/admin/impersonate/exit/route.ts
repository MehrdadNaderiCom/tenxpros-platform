import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/authz";
import { PARTNER_VIEW_COOKIE } from "@/lib/partner/auth";
import { PARTICIPANT_VIEW_COOKIE } from "@/lib/participant/view";

export const dynamic = "force-dynamic";

/** Clear any active read-only preview and return to the admin panel. */
export async function GET(req: Request) {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.email)) return new Response("Forbidden", { status: 403 });

  const to = new URL(req.url).searchParams.get("to");
  const dest = to && to.startsWith("/") ? to : "/admin";
  const res = NextResponse.redirect(new URL(dest, req.url));
  res.cookies.delete(PARTNER_VIEW_COOKIE);
  res.cookies.delete(PARTICIPANT_VIEW_COOKIE);
  return res;
}
