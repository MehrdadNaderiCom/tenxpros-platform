import { processPaymentReminders } from "@/lib/services/payment-reminders";

export const dynamic = "force-dynamic";

/**
 * Scheduled trigger for the accepted-but-unpaid payment reminders. Protected by a
 * shared secret (CRON_SECRET): accepts either an `Authorization: Bearer <secret>`
 * header or a `?key=<secret>` query parameter. If CRON_SECRET is unset, the route
 * refuses every call, so it is never an open trigger. Intended to be called on a
 * schedule (for example, an hourly host cron job hitting this endpoint).
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  const key = new URL(req.url).searchParams.get("key");
  return header === `Bearer ${secret}` || key === secret;
}

async function run(req: Request): Promise<Response> {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  const result = await processPaymentReminders(new Date());
  return Response.json({ ok: true, ...result });
}

export const GET = run;
export const POST = run;
