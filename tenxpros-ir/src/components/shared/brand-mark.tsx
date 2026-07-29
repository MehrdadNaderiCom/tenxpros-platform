import { cn } from "@/lib/utils";

export function BrandMark({
  inverse = false,
  compact = false,
  className
}: {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-3", className)}
      aria-label="TenXPros ایران"
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative grid h-10 w-10 place-items-center overflow-hidden rounded-lg border font-latin text-[0.64rem] font-black",
          inverse
            ? "border-white/15 bg-white text-ink-950"
            : "border-ink-950/10 bg-ink-950 text-white"
        )}
      >
        <span className="absolute inset-x-1.5 top-1.5 h-px bg-iris-400" />
        TXP
      </span>
      {compact ? null : (
        <span className="flex flex-col">
          <span
            dir="ltr"
            lang="en"
            className={cn(
              "font-latin text-base font-semibold leading-none",
              inverse ? "text-white" : "text-ink-950"
            )}
          >
            TenXPros
          </span>
          <span
            className={cn(
              "mt-1 text-[0.64rem] font-medium leading-none",
              inverse ? "text-slate-400" : "text-slate-500"
            )}
          >
            نسخه ایران
          </span>
        </span>
      )}
    </span>
  );
}
