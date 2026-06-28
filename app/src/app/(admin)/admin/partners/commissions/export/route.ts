import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/authz";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  await requireAdminUser();

  const entries = await prisma.commissionEntry.findMany({
    orderBy: { createdAt: "desc" },
    include: { partner: { select: { displayName: true } }, closedDeal: { include: { registeredAccount: true } } },
  });

  const header = [
    "createdAt",
    "partner",
    "account",
    "function",
    "isFlat",
    "rateBp",
    "baseAmountCents",
    "amountCents",
    "reversedCents",
    "netCents",
    "currency",
    "dealConversionRate",
    "payoutCurrency",
    "status",
    "payableOn",
    "paidOn",
  ];
  const rows = entries.map((e) =>
    [
      e.createdAt.toISOString(),
      e.partner.displayName,
      e.closedDeal.registeredAccount?.legalEntity ?? "",
      e.function,
      e.isFlat,
      e.rateBp,
      e.baseAmountCents,
      e.amountCents,
      e.reversedCents,
      e.amountCents - e.reversedCents,
      e.currency,
      e.closedDeal.conversionRate ?? 1,
      e.closedDeal.currency,
      e.status,
      e.payableOn?.toISOString() ?? "",
      e.paidOn?.toISOString() ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="partner-commissions.csv"`,
    },
  });
}
