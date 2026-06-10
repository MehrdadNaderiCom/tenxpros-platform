"use client";

import { useState } from "react";
import { Input } from "@/components/ui/form-fields";
import { HintField } from "@/components/ui/hint-field";

const MS_PER_DAY = 86_400_000;

function parseDay(value: string): number | null {
  if (!value) return null;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isNaN(time) ? null : time;
}

/**
 * Start/end date pair for campaign forms with a LIVE day counter. Counts
 * inclusively (start and end day both count), matching the Command page's
 * "day X/Y" clock. Renders as two grid cells via `contents`, so it drops into
 * the existing form grids unchanged; inputs keep their names for the server
 * action.
 */
export function CampaignDateRange({
  defaultStart,
  defaultEnd,
  startHint,
  endHint,
  required,
}: {
  defaultStart?: string;
  defaultEnd?: string;
  startHint: string;
  endHint: string;
  required?: boolean;
}) {
  const [start, setStart] = useState(defaultStart ?? "");
  const [end, setEnd] = useState(defaultEnd ?? "");

  const startMs = parseDay(start);
  const endMs = parseDay(end);
  let counter: { text: string; tone: "ok" | "bad" } | null = null;
  if (startMs !== null && endMs !== null) {
    const days = Math.round((endMs - startMs) / MS_PER_DAY) + 1;
    if (days <= 1) {
      counter = { text: "End date must be after the start date.", tone: "bad" };
    } else {
      const weeks = days / 7;
      const weeksLabel =
        Number.isInteger(weeks) ? `${weeks} weeks` : `~${Math.round(weeks * 10) / 10} weeks`;
      counter = { text: `Campaign length: ${days} days (${weeksLabel})`, tone: "ok" };
    }
  }

  return (
    <div className="contents">
      <HintField label="Start date" hint={startHint}>
        <Input
          name="startDate"
          type="date"
          value={start}
          onChange={(event) => setStart(event.target.value)}
          required={required}
        />
      </HintField>
      <HintField label="End date" hint={endHint}>
        <div className="space-y-1">
          <Input
            name="endDate"
            type="date"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            required={required}
          />
          {counter ? (
            <p
              className={
                counter.tone === "ok" ? "text-xs font-medium text-emerald-700" : "text-xs font-medium text-red-600"
              }
            >
              {counter.text}
            </p>
          ) : null}
        </div>
      </HintField>
    </div>
  );
}
