"use client";

import { useEffect, useState } from "react";

/**
 * Live "27h 40m" counter since a timestamp, refreshed every minute. Turns
 * amber once warnAfterHours is crossed (emerald before). suppressHydrationWarning
 * because the server-rendered value can be a minute older than the client's.
 */
export function ElapsedHours({
  atIso,
  warnAfterHours,
  className = "",
}: {
  atIso: string;
  warnAfterHours?: number;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  // The tone class is applied only after mount: a hydration mismatch right at
  // the threshold boundary would otherwise leave a stale color forever (React
  // never re-patches suppressed attributes).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.max(0, Math.floor((now - new Date(atIso).getTime()) / 60_000));
  const hours = Math.floor(mins / 60);
  const text = hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;
  const warn = warnAfterHours !== undefined && mins >= warnAfterHours * 60;
  const tone =
    !mounted || warnAfterHours === undefined
      ? "font-semibold"
      : warn
        ? "font-semibold text-amber-600"
        : "font-semibold text-emerald-600";
  return (
    <span suppressHydrationWarning className={`${tone} ${className}`.trim()}>
      {text}
    </span>
  );
}
