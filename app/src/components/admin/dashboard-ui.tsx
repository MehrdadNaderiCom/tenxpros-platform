import { cn } from "@/lib/utils";

/** A single horizontal progress bar (track + fill). pct is 0-100. */
export function Bar({ pct, className = "bg-navy-500" }: { pct: number; className?: string }) {
  const w = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
      <div className={cn("h-full rounded-full", className)} style={{ width: `${w}%` }} />
    </div>
  );
}

/** A horizontal stacked bar: one inline-width segment per entry. */
export function StackedBar({
  segments,
  className,
}: {
  segments: { pct: number; className: string }[];
  className?: string;
}) {
  return (
    <div className={cn("flex h-3 w-full overflow-hidden rounded-full bg-neutral-100", className)}>
      {segments.map((s, i) =>
        s.pct > 0 ? <div key={i} className={s.className} style={{ width: `${Math.min(100, s.pct)}%` }} /> : null,
      )}
    </div>
  );
}

/** A conic-gradient progress ring with a white center holding `children`. */
export function Ring({ pct, children }: { pct: number; children: React.ReactNode }) {
  const p = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (
    <div
      className="relative h-28 w-28 flex-none rounded-full"
      style={{ background: `conic-gradient(#C9A961 ${p}%, #F4EAC8 0)` }}
    >
      <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-white text-center">
        {children}
      </div>
    </div>
  );
}
