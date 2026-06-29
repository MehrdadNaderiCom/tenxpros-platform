import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribeByToken } from "@/lib/newsletter/service";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Unsubscribe from the TenXPros newsletter" };

/**
 * One-click unsubscribe. Visiting the per-recipient link flips the status to
 * unsubscribed and keeps the email on file. It never deletes the record, so a
 * later resubscribe reuses the same row.
 */
export default async function UnsubscribePage({ params }: { params: { token: string } }) {
  const { result, email } = await unsubscribeByToken(params.token);

  const copy =
    result === "unsubscribed"
      ? { title: "You have been unsubscribed", body: `${email ?? "Your email"} will no longer receive the TenXPros newsletter.` }
      : result === "already"
        ? { title: "Already unsubscribed", body: `${email ?? "This email"} is already unsubscribed from the newsletter.` }
        : { title: "Link not recognized", body: "This unsubscribe link is not valid. If you keep receiving messages, contact support@tenxpros.com." };

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-xl px-6 py-20 text-center md:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-800">TenXPros newsletter</p>
        <h1 className="mt-3 text-3xl font-semibold text-navy-900">{copy.title}</h1>
        <Card className="mt-6 text-left">
          <p className="text-sm leading-7 text-slate-600">{copy.body}</p>
          <p className="mt-3 text-sm text-slate-600">
            Changed your mind? You can subscribe again any time from the{" "}
            <Link href="/" className="font-medium text-navy-900 hover:underline">homepage</Link>.
          </p>
        </Card>
      </div>
    </main>
  );
}
