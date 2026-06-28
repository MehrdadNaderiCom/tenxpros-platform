"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { PARTNER_TERMS_LEAD, PARTNER_TERMS_SECTIONS } from "@/lib/partner/terms";
import { cn } from "@/lib/utils";

function TermsModal({ onClose }: { onClose: () => void }) {
  // Lock body scroll and close on Escape while the modal is open.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="partner-terms-title">
      <button aria-label="Close" className="absolute inset-0 cursor-default bg-navy-900/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-800">Partner Program</p>
            <h2 id="partner-terms-title" className="mt-1 text-lg font-semibold text-navy-900">
              How the program works
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            autoFocus
            className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-md border border-neutral-200 text-slate-500 transition hover:bg-neutral-50 hover:text-navy-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <p className="text-sm leading-7 text-slate-600">{PARTNER_TERMS_LEAD}</p>
          <div className="mt-6 space-y-7">
            {PARTNER_TERMS_SECTIONS.map((section, index) => (
              <section key={section.title}>
                <h3 className="text-sm font-semibold text-navy-900">
                  {index + 1}. {section.title}
                </h3>
                {section.body?.map((paragraph, i) => (
                  <p key={i} className="mt-2 text-sm leading-7 text-slate-600">
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-3 space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2.5 text-sm leading-6 text-slate-600">
                        <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold-500" aria-hidden="true" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-neutral-200 bg-neutral-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-md bg-navy-900 px-5 text-sm font-medium text-white transition hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2"
          >
            Done reading
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Inline trigger that opens the full Partner Program terms in a modal. Used on
 * the marketing page and inside the application form's acknowledgement.
 */
export function PartnerTermsDialog({ children, className }: { children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500", className)}
      >
        {children}
      </button>
      {open ? <TermsModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}
