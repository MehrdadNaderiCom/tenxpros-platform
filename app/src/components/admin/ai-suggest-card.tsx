import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/form-field";
import { askAiSuggestion } from "@/lib/actions/marketing";
import { latestSuggestion, SUGGEST_AREAS, type SuggestArea } from "@/lib/marketing/ai-suggest";

/**
 * One-button AI planning card, embedded on each marketing page. Shows the
 * latest suggestion (or its error) for the page's area and a button to ask
 * again. Uses the OpenRouter key/model configured on the Command page.
 */
export async function AiSuggestCard({
  campaignId,
  area,
  hint,
  subtitle,
}: {
  campaignId: string;
  area: SuggestArea;
  hint: string;
  subtitle?: string;
}) {
  const meta = SUGGEST_AREAS[area];
  const latest = await latestSuggestion(campaignId, area);

  return (
    <Card className="space-y-3 border-l-4 border-l-violet-500">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
          {meta.title}
          {subtitle ? <span className="text-xs font-normal text-slate-400">· {subtitle}</span> : null}
          <InfoTip label={`About ${meta.title}`} text={`${hint} Data sent includes live campaign numbers (and for the pipeline, prospect names/notes), processed by OpenRouter and the selected model provider.`} />
        </h2>
        <form action={askAiSuggestion}>
          <input type="hidden" name="campaignId" value={campaignId} />
          <input type="hidden" name="area" value={area} />
          <Button type="submit" variant="secondary" className="h-8 px-3 text-xs">
            {latest ? `${meta.button} (again)` : meta.button}
          </Button>
        </form>
      </div>

      {latest ? (
        latest.status === "error" ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {latest.content}
          </p>
        ) : (
          <div className="space-y-1">
            <pre className="whitespace-pre-wrap rounded-md bg-violet-50/60 p-3 font-sans text-sm leading-6 text-slate-800">
              {latest.content}
            </pre>
            <p className="text-[11px] text-slate-400">
              {latest.model} · {latest.createdAt.toLocaleString()}
            </p>
          </div>
        )
      ) : (
        <p className="text-xs text-slate-500">
          One click and the AI reads your live numbers for this page and proposes a concrete plan. Configure the
          OpenRouter key once in the AI coach settings on the{" "}
          <Link href="/admin/marketing" className="font-medium text-navy-600 hover:underline">
            Command page
          </Link>
          .
        </p>
      )}
    </Card>
  );
}
