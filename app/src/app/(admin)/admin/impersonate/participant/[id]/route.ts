import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/authz";
import { PARTNER_VIEW_COOKIE } from "@/lib/partner/auth";
import { PARTICIPANT_VIEW_COOKIE } from "@/lib/participant/view";

export const dynamic = "force-dynamic";

/** Super-admin only: start a read-only preview of a participant's portal (new tab). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.email)) return new Response("Forbidden", { status: 403 });

  // Relative Location (proxy-safe, see the partner impersonate route).
  const res = new NextResponse(null, { status: 307, headers: { Location: "/portal" } });
  res.cookies.set(PARTICIPANT_VIEW_COOKIE, params.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 7200 });
  res.cookies.delete(PARTNER_VIEW_COOKIE);
  return res;
}
