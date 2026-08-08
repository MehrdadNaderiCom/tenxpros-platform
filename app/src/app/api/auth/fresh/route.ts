import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireAdminUser, isSuperAdmin } from "@/lib/authz";
import { getCurrentPartner } from "@/lib/partner/auth";
import { getPortalPreview } from "@/lib/participant/view";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  const surface = new URL(request.url).searchParams.get("surface");
  try {
    if (surface === "admin") {
      await requireAdminUser();
    } else if (surface === "partner") {
      if (!(await getCurrentPartner())) throw new Error("Partner access required.");
    } else if (surface === "portal") {
      const session = await auth();
      if (!session?.user?.id) throw new Error("Authentication required.");
      if (session.user.role === "ADMIN") {
        if (!isSuperAdmin(session.user.email) || !(await getPortalPreview())) {
          throw new Error("Portal preview required.");
        }
      } else if (!(["PARTICIPANT", "COACH"] as const).includes(session.user.role as "PARTICIPANT" | "COACH")) {
        throw new Error("Portal access required.");
      }
    } else {
      return NextResponse.json({ ok: false }, { status: 400, headers: noStoreHeaders });
    }
    return new NextResponse(null, { status: 204, headers: noStoreHeaders });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401, headers: noStoreHeaders });
  }
}
