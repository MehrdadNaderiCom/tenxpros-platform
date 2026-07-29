import { constants as fsConstants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { NextResponse } from "next/server";

import { getUploadConfig, validateServerConfiguration } from "@/lib/config";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    validateServerConfiguration();
    await db.$queryRaw`SELECT 1`;
    const upload = getUploadConfig();
    await mkdir(upload.directory, { recursive: true, mode: 0o700 });
    await access(upload.directory, fsConstants.R_OK | fsConstants.W_OK);

    return NextResponse.json({
      ok: true,
      service: "tenxpros-ir",
      database: "ready",
      privateStorage: "ready",
      configuration: "ready",
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "tenxpros-ir",
        status: "unavailable",
      },
      { status: 503 }
    );
  }
}
