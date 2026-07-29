import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";
import { PageHeader } from "@/components/shared/page-shell";
import { Alert } from "@/components/ui/alert";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { Table, THead, Th, TBody, TR, Td, TableEmpty } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { academyNarrationAttention } from "@/lib/academy/narration-release";

export const dynamic = "force-dynamic";

export default async function AcademyContentPage() {
  await requireSuperAdmin();

  const [modules, audioAttention] =
    await Promise.all([
      prisma.academyModule.findMany({
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
          },
          _count: {
            select: {
              progress: {
                where: {
                  examPassed: true,
                },
              },
            },
          },
        },
      }),
      academyNarrationAttention(),
    ]);
  const audioByLesson = new Map(
    audioAttention.rows.map((row) => [
      row.lessonId,
      row,
    ]),
  );

  // How many passed partners are on an older content version per module.
  const passedProgress = await prisma.academyProgress.findMany({
    where: { examPassed: true },
    select: { moduleId: true, passedContentVersion: true },
  });
  const staleByModule = new Map<string, number>();
  for (const p of passedProgress) {
    const mod = modules.find((m) => m.id === p.moduleId);
    if (mod && (p.passedContentVersion ?? 1) < mod.contentVersion) {
      staleByModule.set(p.moduleId, (staleByModule.get(p.moduleId) ?? 0) + 1);
    }
  }

  const totalEdits = modules.reduce((n, m) => n + (m.contentVersion - 1), 0);
  const totalStale = [...staleByModule.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Lesson content"
        description="Edit any partner-facing lesson live. Every save is versioned, kept in history, and notifies partners. Partners who already passed keep their certificate until December 31; partners who have not passed take the latest version."
      />

      <StatGrid cols={3}>
        <StatCard label="Modules" value={modules.length} />
        <StatCard label="Edits published" value={totalEdits} hint="across all modules" />
        <StatCard
          label="Passed on an older version"
          value={totalStale}
          tone={totalStale ? "warning" : "default"}
          hint="certificate still valid to Dec 31"
        />
      </StatGrid>

      <Alert tone="info" title="How editing works">
        Open a lesson, make your changes, and save with a short note describing what changed. The module content version bumps, a snapshot is kept in history, and every partner with progress on that module gets a portal notification.
      </Alert>
      {audioAttention.attention.length > 0 ? (
        <Alert
          tone="warning"
          title={`Academy audio requires attention: ${audioAttention.attention.length} lessons changed after audio generation.`}
        >
          Existing audio remains available and no
          regeneration is started by a content save.
        </Alert>
      ) : null}

      <Table minWidth="min-w-[820px]">
        <THead>
          <Th>#</Th>
          <Th>Module</Th>
          <Th>Lesson</Th>
          <Th>Version</Th>
          <Th>Passed</Th>
          <Th>Last edited</Th>
          <Th>Audio</Th>
          <Th className="text-right">Action</Th>
        </THead>
        <TBody>
          {modules.flatMap((m) =>
            (m.lessons.length ? m.lessons : [null]).map((lesson, i) => (
              <TR key={lesson?.id ?? `${m.id}-empty`}>
                <Td>{i === 0 ? m.order : ""}</Td>
                <Td className="font-medium text-navy-900">{i === 0 ? m.title : ""}</Td>
                <Td>{lesson ? lesson.title : <span className="text-slate-400">No lesson</span>}</Td>
                <Td>
                  <Badge status={m.contentVersion > 1 ? "REVISED" : "DRAFT"}>v{m.contentVersion}</Badge>
                </Td>
                <Td>
                  {m._count.progress}
                  {staleByModule.get(m.id) ? (
                    <span className="ml-1 text-xs text-amber-700">({staleByModule.get(m.id)} older)</span>
                  ) : null}
                </Td>
                <Td className="text-xs text-slate-500">
                  {lesson?.updatedAt ? (
                    <>
                      {lesson.updatedAt.toLocaleDateString()}
                      {lesson.updatedByEmail ? <div className="text-slate-400">{lesson.updatedByEmail}</div> : null}
                    </>
                  ) : (
                    <span className="text-slate-400">Original</span>
                  )}
                </Td>
                <Td>
                  {lesson ? (
                    <Badge
                      status={
                        audioByLesson.get(
                          lesson.id,
                        )?.status ??
                        "MISSING"
                      }
                    >
                      {audioByLesson.get(
                        lesson.id,
                      )?.status ??
                        "MISSING"}
                    </Badge>
                  ) : null}
                </Td>
                <Td className="text-right">
                  {lesson ? (
                    <ButtonLink href={`/admin/academy/content/${lesson.id}`} variant="secondary" size="sm">
                      Edit
                    </ButtonLink>
                  ) : null}
                </Td>
              </TR>
            )),
          )}
          {modules.length === 0 ? <TableEmpty colSpan={8}>No academy modules are seeded.</TableEmpty> : null}
        </TBody>
      </Table>
    </div>
  );
}
