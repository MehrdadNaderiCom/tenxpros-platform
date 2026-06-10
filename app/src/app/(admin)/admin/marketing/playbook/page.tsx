import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { HintField } from "@/components/ui/hint-field";
import { CopyButton } from "@/components/admin/copy-button";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHeader } from "@/components/shared/page-shell";
import { prisma } from "@/lib/prisma";
import { PLAYBOOK_SEED } from "@/lib/marketing/playbook-seed";
import {
  createPlaybookCategory,
  createTemplate,
  deletePlaybookCategory,
  deleteTemplate,
  updatePlaybookCategory,
  updateTemplate,
} from "@/lib/actions/marketing";
import { AiSuggestCard } from "@/components/admin/ai-suggest-card";
import { getActiveCampaign } from "@/lib/marketing/data";

// Original section set; seeds MarketingTemplateCategory on first use, after
// which categories are fully managed in the UI.
const CATEGORY_SEED = [
  { key: "outreach", title: "Initial messages", note: "The first line MUST be rewritten per prospect before sending.", sortOrder: 1 },
  { key: "follow_up", title: "Follow-ups (FU1 +3d, FU2 +7d, FU3 +7d)", note: "Sent on the cadence the pipeline tracks.", sortOrder: 2 },
  { key: "objection", title: "Objections & reframes", note: "Find the real objection before answering the stated one.", sortOrder: 3 },
  { key: "asset", title: "Trust assets (in priority order)", note: "What to prepare and lead with.", sortOrder: 4 },
  { key: "question", title: "Discovery questions", note: "For the 20-minute call.", sortOrder: 5 },
  { key: "principle", title: "Operating principles", note: "The rules of this operating system.", sortOrder: 6 },
];

const TIPS = {
  search: "Filters templates by title and body text as you submit. Combine with a category chip to narrow further.",
  newTitle: "Short, scannable name. For ordered sets (FU1/FU2, ranked assets) keep the number in the title.",
  newCategory: "Which section it belongs to. You can move it later from the item's edit form.",
  newBody:
    "The reusable content. Use {placeholders} like {first_name} and replace them by hand when sending. Rule: rewrite the FIRST LINE per prospect.",
  sortOrder: "Position inside its section (0-1000): lower numbers appear first. New items default to 100 (the end).",
  catTitle: "Section heading shown on this page.",
  catNote: "One line under the heading explaining how to use the section.",
  catSort: "Order of the section on the page: lower numbers appear first.",
};

// Seeds exactly once (tracked by a settings marker), so intentionally deleted
// seed content never silently reappears.
const SEED_MARKER_KEY = "marketing_playbook_seeded";

async function ensureSeeded() {
  const marker = await prisma.adminSetting.findUnique({ where: { key: SEED_MARKER_KEY } });
  if (marker) return;
  const [templateCount, categoryCount] = await Promise.all([
    prisma.marketingTemplate.count(),
    prisma.marketingTemplateCategory.count(),
  ]);
  if (templateCount === 0) {
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
  if (categoryCount === 0) {
    await prisma.marketingTemplateCategory.createMany({ data: CATEGORY_SEED, skipDuplicates: true });
  }
  await prisma.adminSetting.upsert({
    where: { key: SEED_MARKER_KEY },
    update: { value: "1" },
    create: {
      key: SEED_MARKER_KEY,
      value: "1",
      category: "FEATURE_FLAGS",
      label: "Marketing playbook defaults seeded",
    },
  });
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PlaybookPage({
  searchParams,
}: {
  searchParams: { q?: string | string[]; cat?: string | string[] };
}) {
  // The layout also gates this, but the page does seed writes — never run them
  // for a non-super admin.
  const session = await auth();
  if (session?.user?.role !== "ADMIN" || !isSuperAdmin(session.user.email)) notFound();

  await ensureSeeded();
  const [categories, templates, activeCampaign] = await Promise.all([
    prisma.marketingTemplateCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { title: "asc" }] }),
    prisma.marketingTemplate.findMany({ orderBy: [{ sortOrder: "asc" }, { title: "asc" }] }),
    getActiveCampaign(),
  ]);

  const rawQ = first(searchParams.q) ?? "";
  const rawCat = first(searchParams.cat);
  const q = rawQ.trim().toLowerCase();
  const cat = categories.some((c) => c.key === rawCat) ? rawCat : undefined;

  const matches = templates.filter(
    (t) =>
      (!cat || t.category === cat) &&
      (!q || t.title.toLowerCase().includes(q) || t.body.toLowerCase().includes(q)),
  );
  const countByCategory = templates.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + 1;
    return acc;
  }, {});

  // Resilience: surface templates whose category key has no section row.
  const knownKeys = new Set(categories.map((c) => c.key));
  const orphans = matches.filter((t) => !knownKeys.has(t.category));

  const chipClass = (active: boolean) =>
    active
      ? "rounded-full bg-navy-900 px-3 py-1 text-xs font-semibold text-white"
      : "rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-neutral-50";

  const filterHref = (nextCat?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", rawQ);
    if (nextCat) params.set("cat", nextCat);
    const qs = params.toString();
    return `/admin/marketing/playbook${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Playbook"
        description="Your editable outreach library: messages, objection reframes, assets, questions, and principles. Add, edit, move, and remove items and sections; use Copy when sending."
      />
      <Link href="/admin/marketing" className="text-sm font-medium text-navy-600 hover:underline">
        ← Back to Command
      </Link>

      {activeCampaign ? (
        <AiSuggestCard
          campaignId={activeCampaign.id}
          area="playbook"
          hint="Compares your real funnel numbers with these templates, diagnoses where the funnel leaks, and proposes first-line A/B variants plus concrete template improvements."
        />
      ) : null}

      {/* Search + category filter */}
      <Card className="space-y-3">
        <form method="GET" action="/admin/marketing/playbook" className="flex flex-wrap items-end gap-3">
          {cat ? <input type="hidden" name="cat" value={cat} /> : null}
          <div className="min-w-64 flex-1">
            <HintField label="Search" hint={TIPS.search}>
              <Input name="q" type="search" defaultValue={rawQ} placeholder="Search titles and bodies…" />
            </HintField>
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
          {q || cat ? (
            <Link href="/admin/marketing/playbook" className="text-sm font-medium text-navy-600 hover:underline">
              Clear
            </Link>
          ) : null}
        </form>
        <div className="flex flex-wrap gap-2">
          <Link href={filterHref(undefined)} className={chipClass(!cat)}>
            All ({templates.length})
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={filterHref(c.key)} className={chipClass(cat === c.key)}>
              {c.title} ({countByCategory[c.key] ?? 0})
            </Link>
          ))}
        </div>
        {q || cat ? (
          <p className="text-xs text-slate-500">
            {matches.length} result{matches.length === 1 ? "" : "s"}
            {q ? ` for “${rawQ}”` : ""}
            {cat ? ` in ${categories.find((c) => c.key === cat)?.title ?? cat}` : ""}.
          </p>
        ) : null}
        {(q || cat) && matches.length === 0 ? (
          <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-slate-600">
            Nothing here yet — add an item with “+ Add item” below, or{" "}
            <Link href="/admin/marketing/playbook" className="font-medium text-navy-600 hover:underline">
              clear the filters
            </Link>
            .
          </p>
        ) : null}
      </Card>

      {/* Add item */}
      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-navy-900">+ Add item</summary>
          <form action={createTemplate} className="mt-4 grid gap-3 md:grid-cols-4">
            <HintField label="Title" hint={TIPS.newTitle}>
              <Input name="title" required />
            </HintField>
            <HintField label="Section" hint={TIPS.newCategory}>
              <Select name="category" defaultValue={cat ?? categories[0]?.key}>
                {categories.map((c) => (
                  <option key={c.id} value={c.key}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </HintField>
            <HintField label="Sort order" hint={TIPS.sortOrder}>
              <Input name="sortOrder" type="number" min={0} max={1000} defaultValue={100} />
            </HintField>
            <div className="md:col-span-4">
              <HintField label="Body" hint={TIPS.newBody}>
                <Textarea name="body" className="min-h-32 font-mono text-xs" required />
              </HintField>
            </div>
            <div>
              <Button type="submit">Add item</Button>
            </div>
          </form>
        </details>
      </Card>

      {/* Manage sections */}
      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-navy-900">Manage sections</summary>
          <div className="mt-4 space-y-3">
            {categories.map((c) => {
              const inUse = countByCategory[c.key] ?? 0;
              return (
                <form key={c.id} action={updatePlaybookCategory} className="grid items-end gap-3 rounded-md border border-neutral-200 p-3 md:grid-cols-6">
                  <input type="hidden" name="categoryId" value={c.id} />
                  <div className="md:col-span-2">
                    <HintField label="Title" hint={TIPS.catTitle}>
                      <Input name="title" defaultValue={c.title} required />
                    </HintField>
                  </div>
                  <div className="md:col-span-2">
                    <HintField label="Note" hint={TIPS.catNote}>
                      <Input name="note" defaultValue={c.note ?? ""} />
                    </HintField>
                  </div>
                  <HintField label="Sort" hint={TIPS.catSort}>
                    <Input name="sortOrder" type="number" min={0} max={1000} defaultValue={c.sortOrder} />
                  </HintField>
                  <div className="flex items-center gap-2">
                    <Button type="submit" variant="secondary" className="text-xs">
                      Save
                    </Button>
                    {inUse === 0 ? (
                      <ConfirmButton
                        action={deletePlaybookCategory}
                        message={`Delete the empty section "${c.title}"?`}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </ConfirmButton>
                    ) : (
                      <span
                        className="text-[11px] text-slate-400"
                        title="Move or delete this section's items first to enable deleting the section."
                      >
                        {inUse} item{inUse === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </form>
              );
            })}
            <form action={createPlaybookCategory} className="grid items-end gap-3 rounded-md border border-dashed border-neutral-300 p-3 md:grid-cols-6">
              <div className="md:col-span-2">
                <HintField label="New section title" hint={TIPS.catTitle}>
                  <Input name="title" placeholder="e.g. Voice-note scripts" required />
                </HintField>
              </div>
              <div className="md:col-span-2">
                <HintField label="Note" hint={TIPS.catNote}>
                  <Input name="note" placeholder="How to use this section" />
                </HintField>
              </div>
              <HintField label="Sort" hint={TIPS.catSort}>
                <Input name="sortOrder" type="number" min={0} max={1000} defaultValue={100} />
              </HintField>
              <div>
                <Button type="submit" variant="secondary" className="text-xs">
                  Add section
                </Button>
              </div>
            </form>
          </div>
        </details>
      </Card>

      {/* Sections */}
      {categories.map((category) => {
        const items = matches.filter((t) => t.category === category.key);
        if (items.length === 0 && (q || cat)) return null;
        return (
          <section key={category.id} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-navy-900">
                {category.title} <span className="text-sm font-normal text-slate-400">({items.length})</span>
              </h2>
              {category.note ? <p className="text-xs text-slate-500">{category.note}</p> : null}
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-slate-400">No items yet — add one with “+ Add item” above.</p>
            ) : (
              <div className="grid gap-3">
                {items.map((template) => (
                  <Card key={template.id} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-navy-900">{template.title}</span>
                      <CopyButton text={template.body} />
                    </div>
                    <pre className="whitespace-pre-wrap rounded-md bg-neutral-50 p-3 text-xs leading-5 text-slate-700">
                      {template.body}
                    </pre>
                    <details>
                      <summary className="cursor-pointer text-xs font-medium text-slate-500">Edit / move / delete</summary>
                      <form action={updateTemplate} className="mt-3 grid gap-3 md:grid-cols-3">
                        <input type="hidden" name="templateId" value={template.id} />
                        <HintField label="Title" hint={TIPS.newTitle}>
                          <Input name="title" defaultValue={template.title} required />
                        </HintField>
                        <HintField label="Section" hint={TIPS.newCategory}>
                          <Select name="category" defaultValue={template.category}>
                            {categories.map((c) => (
                              <option key={c.id} value={c.key}>
                                {c.title}
                              </option>
                            ))}
                          </Select>
                        </HintField>
                        <HintField label="Sort order" hint={TIPS.sortOrder}>
                          <Input name="sortOrder" type="number" min={0} max={1000} defaultValue={template.sortOrder} />
                        </HintField>
                        <div className="md:col-span-3">
                          <HintField label="Body" hint={TIPS.newBody}>
                            <Textarea name="body" className="min-h-40 font-mono text-xs" defaultValue={template.body} required />
                          </HintField>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button type="submit" variant="secondary">
                            Save
                          </Button>
                          <ConfirmButton
                            action={deleteTemplate}
                            message={`Delete "${template.title}"? The text stays recoverable from the audit log, but the item disappears from the playbook.`}
                          >
                            Delete
                          </ConfirmButton>
                        </div>
                      </form>
                    </details>
                  </Card>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {orphans.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-navy-900">Uncategorized ({orphans.length})</h2>
          <p className="text-xs text-slate-500">These items reference a removed section. Move them from their edit form.</p>
          <div className="grid gap-3">
            {orphans.map((template) => (
              <Card key={template.id} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-navy-900">{template.title}</span>
                  <CopyButton text={template.body} />
                </div>
                <details>
                  <summary className="cursor-pointer text-xs font-medium text-slate-500">Edit / move / delete</summary>
                  <form action={updateTemplate} className="mt-3 grid gap-3 md:grid-cols-3">
                    <input type="hidden" name="templateId" value={template.id} />
                    <HintField label="Title" hint={TIPS.newTitle}>
                      <Input name="title" defaultValue={template.title} required />
                    </HintField>
                    <HintField label="Section" hint={TIPS.newCategory}>
                      <Select name="category" defaultValue={categories[0]?.key}>
                        {categories.map((c) => (
                          <option key={c.id} value={c.key}>
                            {c.title}
                          </option>
                        ))}
                      </Select>
                    </HintField>
                    <HintField label="Sort order" hint={TIPS.sortOrder}>
                      <Input name="sortOrder" type="number" min={0} max={1000} defaultValue={template.sortOrder} />
                    </HintField>
                    <div className="md:col-span-3">
                      <HintField label="Body" hint={TIPS.newBody}>
                        <Textarea name="body" className="min-h-40 font-mono text-xs" defaultValue={template.body} required />
                      </HintField>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="submit" variant="secondary">
                        Save
                      </Button>
                      <ConfirmButton
                        action={deleteTemplate}
                        message={`Delete "${template.title}"? The text stays recoverable from the audit log, but the item disappears from the playbook.`}
                      >
                        Delete
                      </ConfirmButton>
                    </div>
                  </form>
                </details>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
