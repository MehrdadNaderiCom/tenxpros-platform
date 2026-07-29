import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-ink-950 bg-cover bg-[position:18%_25%] px-4 py-8 text-slate-100 sm:py-12"
      style={{ backgroundImage: "url('/images/dossier-cover.png')" }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-ink-950/95"
        aria-hidden="true"
      />
      <div className="relative mx-auto w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-iris-500 text-lg font-black text-white shadow-lg shadow-iris-500/25">
            X
          </span>
          <span>
            <span className="block text-lg font-black text-white">TenXPros</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-credential">
              Iran
            </span>
          </span>
        </Link>
        {children}
      </div>
    </main>
  );
}
