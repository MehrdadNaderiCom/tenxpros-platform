import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, isSuperAdmin } from "@/lib/authz";
import { createAlumniGroup, createAlumniEvent, deleteAlumniEvent } from "@/lib/actions/alumni";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Table, THead, Th, TBody, TR, Td, TableEmpty } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = { GENERAL: "General", SPECIALIZED: "Specialized" };

export default async function AdminAlumniPage() {
  const admin = await requireAdminUser();
  if (!isSuperAdmin(admin.email)) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Managing the alumni network is restricted to the primary admin.</p>
      </Card>
    );
  }

  const [groups, events, publicIntro, b2bIntro] = await Promise.all([
    prisma.alumniGroup.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: { _count: { select: { memberships: true, events: true } } },
    }),
    prisma.alumniEvent.findMany({ orderBy: { createdAt: "desc" }, take: 40, include: { group: { select: { name: true } } } }),
    prisma.participantProfile.findMany({
      where: { alumniPublicIntroOptIn: true },
      include: { user: { select: { name: true, email: true, directoryProfile: { select: { domain: true, title: true } } } } },
      orderBy: { enrolledAt: "desc" },
    }),
    prisma.participantProfile.findMany({
      where: { alumniB2bIntroOptIn: true },
      include: { user: { select: { name: true, email: true, directoryProfile: { select: { domain: true, title: true } } } } },
      orderBy: { enrolledAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Alumni Network"
        description="General and specialized groups for program graduates: manage groups, members, and events, and see who has opted in to be introduced."
      />

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Create a group</h2>
        <form action={createAlumniGroup} className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-slate-600">Name</span>
            <Input name="name" placeholder="e.g. All graduates, or Legal specialists" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Kind</span>
            <Select name="kind" defaultValue="GENERAL">
              <option value="GENERAL">General</option>
              <option value="SPECIALIZED">Specialized</option>
            </Select>
          </label>
          <div className="flex items-end">
            <Button type="submit" size="sm">Create</Button>
          </div>
          <label className="space-y-1 md:col-span-4">
            <span className="text-xs font-medium text-slate-600">Description (optional)</span>
            <Textarea name="description" rows={2} />
          </label>
        </form>
      </Card>

      <Card className="p-0">
        <Table minWidth="min-w-[640px]">
          <THead>
            <Th>Group</Th>
            <Th>Kind</Th>
            <Th>Members</Th>
            <Th>Events</Th>
            <Th>State</Th>
          </THead>
          <TBody>
            {groups.map((g) => (
              <TR key={g.id}>
                <Td>
                  <Link href={`/admin/alumni/${g.id}`} className="font-medium text-navy-900 hover:underline">{g.name}</Link>
                </Td>
                <Td>{KIND_LABEL[g.kind]}</Td>
                <Td>{g._count.memberships}</Td>
                <Td>{g._count.events}</Td>
                <Td>
                  <Badge status={g.isActive ? "ACTIVE" : "CLOSED"}>{g.isActive ? "Active" : "Inactive"}</Badge>
                </Td>
              </TR>
            ))}
            {groups.length === 0 ? <TableEmpty colSpan={5}>No groups yet. Create the first above.</TableEmpty> : null}
          </TBody>
        </Table>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Create an event</h2>
        <form action={createAlumniEvent} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Title</span>
            <Input name="title" placeholder="e.g. Quarterly alumni meetup" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Group (optional)</span>
            <Select name="groupId" defaultValue="">
              <option value="">All alumni (no specific group)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Starts at (optional)</span>
            <Input name="startsAt" type="datetime-local" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Location (optional)</span>
            <Input name="location" placeholder="e.g. Online, or a city" />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-slate-600">Description (optional)</span>
            <Textarea name="description" rows={2} />
          </label>
          <div className="md:col-span-2">
            <Button type="submit" size="sm">Create event</Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">Events</h2>
        {events.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-3">
            <div>
              <p className="text-sm font-medium text-navy-900">{e.title}</p>
              <p className="text-xs text-slate-500">
                {e.group?.name ?? "All alumni"}
                {e.startsAt ? ` , ${e.startsAt.toLocaleString()}` : ""}
                {e.location ? ` , ${e.location}` : ""}
              </p>
            </div>
            <form action={deleteAlumniEvent}>
              <input type="hidden" name="id" value={e.id} />
              {e.groupId ? <input type="hidden" name="groupId" value={e.groupId} /> : null}
              <Button type="submit" variant="ghost" size="sm">Delete</Button>
            </form>
          </div>
        ))}
        {events.length === 0 ? <p className="text-sm text-slate-500">No events yet.</p> : null}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-navy-900">Opted in: public introduction ({publicIntro.length})</h2>
          <p className="mt-1 text-xs text-slate-500">These graduates agreed to be introduced publicly for networking and finding work.</p>
          <ul className="mt-3 space-y-2">
            {publicIntro.map((p) => (
              <li key={p.id} className="rounded-md border border-neutral-200 p-2 text-sm">
                <span className="font-medium text-navy-900">{p.user.name ?? p.user.email}</span>
                {p.user.directoryProfile?.domain ? <span className="text-slate-500"> , {p.user.directoryProfile.domain}</span> : null}
              </li>
            ))}
            {publicIntro.length === 0 ? <li className="text-sm text-slate-500">No one yet.</li> : null}
          </ul>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-navy-900">Opted in: B2B client introduction ({b2bIntro.length})</h2>
          <p className="mt-1 text-xs text-slate-500">These graduates agreed to be introduced to our B2B clients at tenxops.org.</p>
          <ul className="mt-3 space-y-2">
            {b2bIntro.map((p) => (
              <li key={p.id} className="rounded-md border border-neutral-200 p-2 text-sm">
                <span className="font-medium text-navy-900">{p.user.name ?? p.user.email}</span>
                {p.user.directoryProfile?.domain ? <span className="text-slate-500"> , {p.user.directoryProfile.domain}</span> : null}
              </li>
            ))}
            {b2bIntro.length === 0 ? <li className="text-sm text-slate-500">No one yet.</li> : null}
          </ul>
        </Card>
      </div>
    </div>
  );
}
