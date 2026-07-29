"use client";

import { Printer } from "lucide-react";

export function CertificatePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-black text-white print:hidden"
    >
      <Printer className="size-4" />
      چاپ یا ذخیره PDF
    </button>
  );
}
