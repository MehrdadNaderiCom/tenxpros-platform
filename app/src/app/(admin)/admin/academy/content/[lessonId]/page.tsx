import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";
import { saveLessonContent } from "@/lib/actions/academy-content";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-fields";
import { Timeline } from "@/components/ui/timeline";
import { LessonEditor } from "@/components/admin/academy/lesson-editor";

export const dynamic = "force-dynamic";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default async function EditLessonPage({ params }: { params: { lessonId: string } }) {
  await requireSuperAdmin();

  const lesson = await prisma.academyLesson.findUnique({
    where: { id: params.lessonId },
    include: {
      module: { select: { id: true, title: true, slug: true, order: true, contentVersion: true } },
      versions: { orderBy: { version: "desc" }, take: 20 },
    },
  });
  if (!lesson) notFound();

  const passedStale = await prisma.academyProgress.count({
    where: { moduleId: lesson.module.id, examPassed: true, passedContentVersion: { lt: lesson.module.contentVersion } },
  });

  const initialHtml =
    lesson.bodyHtml && lesson.bodyHtml.trim().length > 0
      ? lesson.bodyHtml
      : lesson.body
          .split("\n\n")
          .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
          .join("\n");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          eyebrow={`Module ${lesson.module.order}`}
          title={`Edit lesson: ${lesson.module.title}`}
          description="Make your changes, add a short note, and save. The change is versioned and partners are notified."
        />
        <ButtonLink href={`/partner/academy/${lesson.module.slug}?preview=1`} variant="ghost" size="sm">
          Preview as partner
        </ButtonLink>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <Badge status={lesson.module.contentVersion > 1 ? "REVISED" : "DRAFT"}>Current version v{lesson.module.contentVersion}</Badge>
        {lesson.updatedByEmail ? <span>Last edited by {lesson.updatedByEmail}</span> : <span>Not yet edited</span>}
      </div>

      {passedStale > 0 ? (
        <Alert tone="info">
          {passedStale} partner{passedStale === 1 ? "" : "s"} passed an earlier version. Their certificate stays valid through December 31; saving notifies them of the update without resetting their pass.
        </Alert>
      ) : null}

      <Card>
        <form action={saveLessonContent} className="space-y-5">
          <input type="hidden" name="lessonId" value={lesson.id} />
          <Field label="Lesson title">
            <Input name="title" defaultValue={lesson.title} required />
          </Field>

          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-900">Lesson content</span>
            <LessonEditor name="bodyHtml" initialHtml={initialHtml} />
            <p className="text-xs text-slate-500">
              Use headings, lists, callouts, links, and images. Add form previews with a callout labelled clearly (for example, "Form preview, placeholder"). Content is the partner-facing lesson; do not paste the paid program material.
            </p>
          </div>

          <Field label="What changed? (kept in history and shown to partners as context)">
            <Input name="note" placeholder="e.g. Updated the objection on pricing and added the discovery-call checklist." />
          </Field>

          <div className="flex items-center gap-3">
            <Button type="submit">Save and publish</Button>
            <Link href="/admin/academy/content" className="text-sm text-slate-500 hover:text-slate-700">
              Back to all lessons
            </Link>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Change history</h2>
        {lesson.versions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No edits yet. The first save will appear here as version 2.</p>
        ) : (
          <div className="mt-4">
            <Timeline
              items={lesson.versions.map((v, i) => ({
                title: `Version ${v.version}`,
                meta: v.createdAt.toLocaleString(),
                state: i === 0 ? "current" : "done",
                body: (
                  <div className="text-sm text-slate-600">
                    {v.note ? <p>{v.note}</p> : <p className="text-slate-400">No note.</p>}
                    {v.editedByEmail ? <p className="text-xs text-slate-400">by {v.editedByEmail}</p> : null}
                  </div>
                ),
              }))}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
