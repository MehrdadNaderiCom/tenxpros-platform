"use client";

import { Printer } from "lucide-react";

/** Print or save the certificate as a PDF via the browser print dialog. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-navy-900 transition hover:bg-neutral-50 print:hidden"
    >
      <Printer className="h-4 w-4" aria-hidden="true" /> Download or print
    </button>
  );
}
