import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form-fields";
import { HintField } from "@/components/ui/hint-field";
import { ElapsedHours } from "@/components/admin/elapsed-hours";
import { dismissPostReminder, snoozePostReminder } from "@/lib/actions/marketing";
import type { PostCadence } from "@/lib/marketing/post-cadence";

/**
 * The posting-rhythm reminder. Renders only when the threshold has passed
 * for the LATEST journaled LinkedIn post and the founder has not snoozed or
 * dismissed it for that post. Journaling a new post resets everything.
 */
export function PostCadenceBanner({ cadence, showJournalLink = true }: { cadence: PostCadence; showJournalLink?: boolean }) {
  if (!cadence.notify || !cadence.lastPost || cadence.hoursSince === null) return null;
  return (
    <Card className="space-y-3 border-l-4 border-l-amber-500 bg-amber-50/50">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-navy-900">
          ⏰ <ElapsedHours atIso={cadence.lastPost.at.toISOString()} /> since your last LinkedIn post (rhythm: every{" "}
          {cadence.threshold}h)
        </p>
        <p className="text-xs leading-5 text-slate-600">
          Last post: "{cadence.lastPost.summary.slice(0, 110)}
          {cadence.lastPost.summary.length > 110 ? "…" : ""}". The clock restarts the moment you journal the next
          post (kind "Published a post", channel LinkedIn).
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {showJournalLink ? (
          <Link
            href="/admin/marketing/journal"
            className="inline-flex h-9 items-center rounded-md bg-navy-900 px-3 text-xs font-medium text-white transition hover:bg-navy-700 active:scale-[0.97]"
          >
            Posted! Log it in the Journal →
          </Link>
        ) : null}
        <form action={snoozePostReminder} className="flex items-end gap-2">
          <input type="hidden" name="postId" value={cadence.lastPost.id} />
          <HintField
            label="Hours"
            hint="Snooze: bring this reminder back after this many hours. It applies only to the current post; the next post restarts the whole cycle."
          >
            <Input name="hours" type="number" min={1} max={168} defaultValue={4} className="h-9 w-20 text-sm" />
          </HintField>
          <Button type="submit" variant="secondary" className="h-9 px-3 text-xs">
            Remind me later
          </Button>
        </form>
        <form action={dismissPostReminder}>
          <input type="hidden" name="postId" value={cadence.lastPost.id} />
          <Button type="submit" variant="secondary" className="h-9 px-3 text-xs text-slate-500">
            Hide until the next post
          </Button>
        </form>
      </div>
    </Card>
  );
}
