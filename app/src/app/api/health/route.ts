import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "ok", time: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { status: "degraded", db: "error", error: err instanceof Error ? err.message : String(err) },
      { status: 503 },
    );
  }
}
