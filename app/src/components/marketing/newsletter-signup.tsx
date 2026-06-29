"use client";

import { useState, useTransition } from "react";
import { subscribeNewsletter } from "@/lib/actions/newsletter";

/**
 * Homepage newsletter subscribe block. Dup-safe: the server distinguishes a new
 * subscribe, a reactivation, and an already-subscribed email, and we show the
 * matching message. The unique email column backs this at the database level.
 */
export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const r = await subscribeNewsletter(email);
      setMessage({ ok: r.ok, text: r.message });
      if (r.result === "subscribed" || r.result === "resubscribed") setEmail("");
    });
  };

  return (
    <section className="border-t border-neutral-200 bg-navy-50">
      <div className="mx-auto max-w-3xl px-6 py-14 text-center md:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-800">Stay in the loop</p>
        <h2 className="mt-3 text-2xl font-semibold text-navy-900 md:text-3xl">The TenXPros newsletter</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
          Once a month we share the findings of our own research on putting AI to work across many fields. Just one
          carefully made email, never spam, and genuinely worth the read. You can unsubscribe with one click at any time.
        </p>
        <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
          <label htmlFor="newsletter-email" className="sr-only">Email address</label>
          <input
            id="newsletter-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 flex-1 rounded-md border border-neutral-300 bg-white px-4 text-sm text-navy-900 outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center rounded-md bg-navy-900 px-6 text-sm font-medium text-white transition hover:bg-navy-700 focus-visible:ring-2 focus-visible:ring-navy-500 disabled:opacity-50"
          >
            {pending ? "Subscribing..." : "Subscribe"}
          </button>
        </form>
        <p aria-live="polite" className={`mt-3 min-h-[1.25rem] text-sm ${message ? (message.ok ? "text-emerald-700" : "text-red-600") : ""}`}>
          {message?.text ?? ""}
        </p>
      </div>
    </section>
  );
}
