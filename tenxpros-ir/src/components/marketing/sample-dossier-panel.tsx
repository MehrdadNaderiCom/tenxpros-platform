import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft, ExternalLink, FileDown, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const sampleViews = [
  {
    src: "/samples/tenxpros-sample-dossier-cover.png",
    alt: "جلد نمونه انگلیسی Living AI Solution Dossier",
    label: "Cover"
  },
  {
    src: "/samples/tenxpros-sample-dossier-snapshot.png",
    alt: "نمایی از مسئله و راهکار در نمونه انگلیسی Dossier",
    label: "Solution Snapshot"
  },
  {
    src: "/samples/tenxpros-sample-dossier-assets-rubric.png",
    alt: "نمایی از دارایی‌ها و Review Rubric در نمونه انگلیسی Dossier",
    label: "Assets & Rubric"
  }
];

export function SampleDossierPanel({
  dark = false
}: {
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border shadow-panel",
        dark
          ? "border-white/10 bg-ink-850"
          : "border-slate-200 bg-white"
      )}
    >
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
        <div>
          <p
            lang="en"
            className={cn(
              "font-latin text-xs font-bold uppercase tracking-[0.12em]",
              dark ? "text-iris-300" : "text-iris-600"
            )}
          >
            REAL SAMPLE FILE
          </p>
          <h3
            className={cn(
              "mt-4 text-2xl font-semibold leading-10",
              dark ? "text-white" : "text-ink-950"
            )}
          >
            ساختار را در یک نمونه ۱۲ صفحه‌ای ببینید.
          </h3>
          <p
            className={cn(
              "mt-4 text-sm leading-8",
              dark ? "text-slate-300" : "text-slate-600"
            )}
          >
            این نمونه انگلیسی برای یک Participant فرضی ساخته شده است تا شکل
            Dossier، اتصال Evidence و منطق Review را نشان دهد. هیچ داده واقعی
            مشتری در آن نیست و این فایل Credential یا تضمین نتیجه محسوب نمی‌شود.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/samples/tenxpros-sample-dossier-excerpt.pdf"
              target="_blank"
              rel="noreferrer"
              className={cn(
                "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition",
                dark
                  ? "bg-white text-ink-950 hover:bg-slate-100"
                  : "bg-iris-500 text-white hover:bg-iris-400"
              )}
            >
              دریافت نمونه PDF
              <FileDown aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              href="/samples/tenxpros-sample-dossier-excerpt.html"
              target="_blank"
              rel="noreferrer"
              className={cn(
                "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-semibold transition",
                dark
                  ? "border-white/15 text-white hover:bg-white/[0.06]"
                  : "border-slate-300 text-ink-950 hover:bg-slate-50"
              )}
            >
              مشاهده نسخه HTML
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <div
            className={cn(
              "mt-6 flex items-start gap-3 rounded-lg border p-4",
              dark
                ? "border-white/10 bg-white/[0.03]"
                : "border-slate-200 bg-slate-50"
            )}
          >
            <ShieldCheck
              aria-hidden="true"
              className="mt-1 h-4 w-4 shrink-0 text-iris-500"
            />
            <p
              className={cn(
                "text-xs leading-6",
                dark ? "text-slate-400" : "text-slate-500"
              )}
            >
              نام‌ها، سازمان‌ها و شواهد این نمونه صرفاً نمایشی هستند. Participant
              واقعی باید Dossier شخصی خود را بر پایه مسئله و Evidence خودش بسازد
              و از Final Review عبور کند.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {sampleViews.map((view) => (
            <Link
              key={view.src}
              href="/samples/tenxpros-sample-dossier-excerpt.pdf"
              target="_blank"
              rel="noreferrer"
              className={cn(
                "group overflow-hidden rounded-lg border transition",
                dark
                  ? "border-white/10 bg-white/[0.03] hover:border-iris-400/50"
                  : "border-slate-200 bg-slate-50 hover:border-iris-300"
              )}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-slate-200">
                <Image
                  src={view.src}
                  alt={view.alt}
                  fill
                  sizes="(min-width: 1024px) 14vw, (min-width: 640px) 28vw, 80vw"
                  className="object-cover object-top transition duration-300 group-hover:scale-[1.02]"
                />
              </div>
              <div
                dir="ltr"
                lang="en"
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-3 text-left font-latin text-[0.68rem] font-bold",
                  dark ? "text-slate-300" : "text-slate-700"
                )}
              >
                {view.label}
                <ArrowUpLeft
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-iris-500"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
