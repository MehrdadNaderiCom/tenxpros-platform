import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";
import { prisma } from "@/lib/prisma";
import { PLAYBOOK_SEED } from "@/lib/marketing/playbook-seed";
import { updateTemplate } from "@/lib/actions/marketing";

const CATEGORY_META: Array<{ value: string; title: string; note: string }> = [
  { value: "outreach", title: "Initial messages", note: "The first line MUST be rewritten per prospect before sending." },
  { value: "follow_up", title: "Follow-ups (FU1 +3d, FU2 +7d, FU3 +7d)", note: "Sent on the cadence the pipeline tracks." },
  { value: "objection", title: "Objections & reframes", note: "Find the real objection before answering the stated one." },
  { value: "asset", title: "Trust assets (in priority order)", note: "What to prepare and lead with." },
  { value: "question", title: "Discovery questions", note: "For the 20-minute call." },
  { value: "principle", title: "Operating principles", note: "The rules of this operating system." },
];

/** Seed default playbook content once; afterwards templates are fully editable. */
async function ensureSeeded() {
  const count = await prisma.marketingTemplate.count();
  if (count > 0) return;
  await prisma.marketingTemplate.createMany({
    data: PLAYBOOK_SEED.map((t) => ({
      key: t.key,
      category: t.category,
      title: t.title,
      body: t.body,
      sortOrder: t.sortOrder,
    })),
    skipDuplicates: true,
  });
}

export default async function PlaybookPage() {
  await ensureSeeded();
  const templates = await prisma.marketingTemplate.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Playbook"
        description="Editable message templates, objection reframes, trust assets, and operating principles. {placeholders} are replaced by hand when sending."
      />
      <Link href="/admin/marketing" className="text-sm font-medium text-navy-600 hover:underline">
        ← Back to Command
      </Link>

      {CATEGORY_META.map((category) => {
        const items = templates.filter((t) => t.category === category.value);
        if (items.length === 0) return null;
        return (
          <section key={category.value} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-navy-900">{category.title}</h2>
              <p className="text-xs text-slate-500">{category.note}</p>
            </div>
            <div className="grid gap-3">
              {items.map((template) => (
                <Card key={template.id} className="space-y-2">
                  <details>
                    <summary className="cursor-pointer">
                      <span className="text-sm font-semibold text-navy-900">{template.title}</span>
                    </summary>
                    <form action={updateTemplate} className="mt-3 space-y-3">
                      <input type="hidden" name="templateId" value={template.id} />
                      <Field label="Title">
                        <Input name="title" defaultValue={template.title} />
                      </Field>
                      <Field label="Body">
                        <Textarea name="body" className="min-h-40 font-mono text-xs" defaultValue={template.body} />
                      </Field>
                      <Button type="submit" variant="secondary">
                        Save template
                      </Button>
                    </form>
                  </details>
                  <pre className="whitespace-pre-wrap rounded-md bg-neutral-50 p-3 text-xs leading-5 text-slate-700">
                    {template.body}
                  </pre>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
