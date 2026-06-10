import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED = ["applications", "participants", "payments"] as const;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  return [headers.join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n");
}

export async function GET(_req: Request, { params }: { params: { type: string } }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return new Response("Unauthorized", { status: 401 });

  const type = params.type;
  if (!(ALLOWED as readonly string[]).includes(type)) return new Response("Not found", { status: 404 });

  let headers: string[] = [];
  let rows: Array<Array<unknown>> = [];

  if (type === "applications") {
    const apps = await prisma.application.findMany({ orderBy: { createdAt: "desc" } });
    headers = [
      "id", "fullName", "email", "phone", "country", "role", "field", "aiExperience", "dataSensitivity",
      "timeAvailability", "status", "tier", "utmSource", "utmMedium", "createdAt",
    ];
    rows = apps.map((a) => [
      a.id, a.fullName, a.email, a.phone ?? "", a.country, a.professionalRole, a.domain, a.aiExperience, a.dataSensitivity,
      a.timeAvailability, a.status, a.pricingTierAtApply ?? "", a.utmSource ?? "", a.utmMedium ?? "", a.createdAt,
    ]);
  } else if (type === "participants") {
    const participants = await prisma.participantProfile.findMany({
      include: { user: true, participantModules: true },
      orderBy: { enrolledAt: "desc" },
    });
    headers = ["id", "name", "email", "tier", "status", "modulesPassed", "enrolledAt"];
    rows = participants.map((p) => [
      p.id, p.user.name ?? "", p.user.email, p.tier, p.status,
      p.participantModules.filter((m) => m.status === "PASSED").length, p.enrolledAt,
    ]);
  } else {
    const payments = await prisma.paymentRecord.findMany({
      include: { application: true, participant: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    });
    headers = ["id", "person", "amount", "currency", "method", "status", "dueAt", "paidAt", "createdAt"];
    rows = payments.map((p) => [
      p.id, p.participant?.user.email ?? p.application?.email ?? "", p.amount, p.currency,
      p.method ?? "", p.status, p.dueAt ?? "", p.paidAt ?? "", p.createdAt,
    ]);
  }

  return new Response(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tenxpros-${type}-export.csv"`,
    },
  });
}
