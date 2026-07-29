import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { readPaymentReceipt } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;

  const receipt = await db.paymentReceipt.findUnique({
    where: { id },
    select: {
      storageKey: true,
      mimeType: true,
      originalName: true,
    },
  });
  if (!receipt) return new Response("Not found", { status: 404 });

  try {
    const file = await readPaymentReceipt(receipt.storageKey);
    const safeName = receipt.originalName.replace(/["\r\n]/g, "_");
    return new Response(file, {
      headers: {
        "Content-Type": receipt.mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    console.error("Private receipt read failed", error);
    return new Response("Not found", { status: 404 });
  }
}
