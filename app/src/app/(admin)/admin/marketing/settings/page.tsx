import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/form-fields";
import { HintField } from "@/components/ui/hint-field";
import { PageHeader } from "@/components/shared/page-shell";
import { getCoachSettings, getOperatorProfile } from "@/lib/marketing/ai-coach";
import { getPostCadenceHours } from "@/lib/marketing/post-cadence";
import { saveCoachSettings, saveOperatorProfile, savePostCadence } from "@/lib/actions/marketing";
import { superAdminEmail } from "@/lib/authz";

export default async function MarketingSettingsPage() {
  const [coach, operator, cadenceHours] = await Promise.all([
    getCoachSettings(),
    getOperatorProfile(),
    getPostCadenceHours(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Marketing settings"
        description="One place for everything the marketing section needs to run. Only the primary admin can see or change these."
      />
      <Link href="/admin/marketing" className="text-sm font-medium text-navy-600 hover:underline">
        ← Back to Command
      </Link>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">
            AI (OpenRouter) {coach.hasKey ? <span className="text-sm font-medium text-emerald-600">· connected ✓</span> : <span className="text-sm font-medium text-amber-600">· key required</span>}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Powers the AI coach on Command and the four “suggest a plan” buttons (Campaigns, Today, Prospects,
            Playbook). Create a key at{" "}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-navy-600 underline-offset-2 hover:underline">
              openrouter.ai/keys
            </a>
            , paste it once here.
          </p>
        </div>
        <form action={saveCoachSettings} className="grid items-end gap-3 md:grid-cols-3">
          <HintField
            label="OpenRouter API key"
            hint="Stored privately; never displayed again anywhere. Leave empty to keep the current key when only changing the model."
          >
            <Input
              name="apiKey"
              type="password"
              autoComplete="off"
              placeholder={coach.hasKey ? "•••••••• (configured)" : "sk-or-…"}
            />
          </HintField>
          <HintField
            label="Model"
            hint="Any OpenRouter model id. The default anthropic/claude-sonnet-4.5 is a strong coach; switch anytime to a newer Claude/GPT id."
          >
            <Input name="model" defaultValue={coach.model} />
          </HintField>
          <div>
            <Button type="submit" variant="secondary">
              Save AI settings
            </Button>
          </div>
        </form>
        <p className="text-xs leading-5 text-slate-500">
          What gets sent: live campaign numbers, channel plans, recent activity logs, journal entries, your "how I
          work" profile, and (for pipeline suggestions) prospect names, context, and short notes. It is processed by
          OpenRouter and the model provider you select. No applicant or payment data is ever included.
        </p>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">
            How I work{" "}
            <span className={`text-sm font-medium ${operator.isCustom ? "text-emerald-600" : "text-slate-400"}`}>
              · {operator.isCustom ? "customized ✓" : "using the default"}
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Sent with every AI request (the coach and all "suggest" buttons) as hard rules, so plans fit how you
            really work: which channels you use, what you refuse to do (cold email, phone calls…), and how much
            time you have. Edit it like you'd brief a new assistant.
          </p>
        </div>
        <form action={saveOperatorProfile} className="space-y-3">
          <HintField
            label="My constraints & style"
            hint="Plain sentences or bullets, any language the model reads (English keeps it sharpest). Save EMPTY to go back to the built-in default."
          >
            <Textarea name="profile" defaultValue={operator.profile} className="min-h-48 font-mono text-xs leading-5" />
          </HintField>
          <Button type="submit" variant="secondary">
            Save profile
          </Button>
        </form>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">LinkedIn posting rhythm</h2>
          <p className="mt-1 text-sm text-slate-600">
            When this many hours pass since your latest journaled LinkedIn post, Command and the Journal show a
            reminder with snooze and hide options. Each new post restarts the clock; only the latest post counts.
          </p>
        </div>
        <form action={savePostCadence} className="flex items-end gap-3">
          <HintField
            label="Hours between posts"
            hint="The rhythm you want to hold. 28 hours keeps a daily presence while slowly rotating the posting time across the day."
          >
            <Input name="hours" type="number" min={1} max={720} defaultValue={cadenceHours} className="w-32" />
          </HintField>
          <Button type="submit" variant="secondary">
            Save rhythm
          </Button>
        </form>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-lg font-semibold text-navy-900">Access</h2>
        <p className="text-sm leading-6 text-slate-600">
          The entire Marketing section is visible only to <span className="font-medium text-navy-900">{superAdminEmail()}</span>.
          Other admin accounts cannot see the menu, the pages, or these settings.
        </p>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-lg font-semibold text-navy-900">Data & history</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
          <li>AI coach keeps the last 20 advice entries per campaign; each “suggest” area keeps its last 10.</li>
          <li>Deleted playbook items, channels, and prospects are recorded in the Audit log and recoverable from there.</li>
          <li>Goal progress counts real paid/enrolled applications plus the off-platform wins you record in Campaigns.</li>
        </ul>
      </Card>
    </div>
  );
}
