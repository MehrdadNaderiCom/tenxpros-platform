import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/authz";
import { PARTNER_VIEW_COOKIE } from "@/lib/partner/auth";
import { PARTICIPANT_VIEW_COOKIE } from "@/lib/participant/view";

export const dynamic = "force-dynamic";

/** Super-admin only: start a read-only preview of a partner's panel (new tab). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  // Relative Location so the browser resolves it against the public origin (the
  // app sits behind a proxy, so an absolute URL from req.url would be wrong).
  const res = new NextResponse(null, { status: 307, headers: { Location: "/partner" } });
  res.cookies.set(PARTNER_VIEW_COOKIE, params.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 7200 });
  res.cookies.delete(PARTICIPANT_VIEW_COOKIE);
  return res;
}
