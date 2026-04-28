import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export const runtime = "nodejs";

async function handle() {
  await destroySession();
  return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "http://localhost:3000"));
}

export { handle as GET, handle as POST };
