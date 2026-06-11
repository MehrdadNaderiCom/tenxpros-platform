import type { ReactNode } from "react";

/**
 * Lightweight server-rendered charts for the marketing Insights dashboard:
 * pure SVG/HTML, no client JS and no chart library. Each bar carries a
 * <title> so hovering shows the exact value.
 */

export type ColumnPoint = { label: string; value: number };

/**
 * Daily columns with an optional dashed target line. Columns at or above the
 * target turn green. Scales to the container width.
 */
export function ColumnChart({
  points,
  target,
  height = 112,
  unit = "",
  label,
}: {
  points: ColumnPoint[];
  target?: number;
  height?: number;
  unit?: string;
  label?: string;
}) {
  if (points.length === 0) return <p className="text-sm text-slate-500">No data yet.</p>;
  const max = Math.max(1, target ?? 0, ...points.map((p) => p.value));
  const W = points.length * 12;
  const H = 100;
  const y = (value: number) => H - (value / max) * (H - 8);
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={label ?? `Column chart, ${points.length} days`}
      >
        {points.map((p, i) => (
          <rect
            key={`${p.label}-${i}`}
            x={i * 12 + 2}
            y={y(p.value)}
            width={8}
            height={Math.max(H - y(p.value), p.value > 0 ? 2 : 0)}
            rx={1}
            className={target !== undefined && p.value >= target && target > 0 ? "fill-emerald-500" : "fill-navy-600"}
          >
            <title>{`${p.label}: ${p.value}${unit}`}</title>
          </rect>
        ))}
        {target !== undefined && target > 0 ? (
          <line
            x1={0}
            x2={W}
            y1={y(target)}
            y2={y(target)}
            className="stroke-amber-500"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          >
            <title>{`Target: ${target}${unit}`}</title>
          </line>
        ) : null}
      </svg>
      <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
        <span>{points[0].label}</span>
        {target !== undefined && target > 0 ? <span className="text-amber-600">target {target}{unit}</span> : null}
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}

export type HBarRow = { label: string; value: number; display?: string; sub?: ReactNode };

/** Horizontal comparison bars, scaled to the largest row (or an explicit max). */
export function HBarList({ rows, max }: { rows: HBarRow[]; max?: number }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">No data yet.</p>;
  const top = Math.max(1, max ?? 0, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => (
        <div key={`${row.label}-${i}`}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-slate-700">{row.label}</span>
            <span className="flex-none font-semibold text-navy-900">{row.display ?? row.value}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-navy-600"
              style={{ width: `${Math.min(100, (row.value / top) * 100)}%` }}
            />
          </div>
          {row.sub ? <p className="mt-0.5 text-[11px] text-slate-400">{row.sub}</p> : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Goal progress vs time: the bar fills with done%, the vertical marker shows
 * where "today" sits in the campaign window. Bar ahead of the marker = ahead
 * of schedule.
 */
export function PaceBar({ donePct, timePct }: { donePct: number; timePct: number }) {
  const done = Math.max(0, Math.min(100, donePct));
  const time = Math.max(0, Math.min(100, timePct));
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-neutral-100">
      <div className={`h-full rounded-full ${done >= time ? "bg-emerald-500" : "bg-navy-600"}`} style={{ width: `${done}%` }} />
      {/* min() keeps the marker visible when time reaches 100% */}
      <div
        className="absolute inset-y-0 w-0.5 bg-amber-500"
        style={{ left: `min(${time}%, calc(100% - 0.125rem))` }}
        title={`Today: ${Math.round(time)}% of the campaign window`}
      />
    </div>
  );
}
