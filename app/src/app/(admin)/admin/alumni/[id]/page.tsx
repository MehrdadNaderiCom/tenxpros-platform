import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, isSuperAdmin } from "@/lib/authz";
import {
  updateAlumniGroup,
  deleteAlumniGroup,
  addAlumniMembership,
  removeAlumniMembership,
  createAlumniEvent,
  deleteAlumniEvent,
} from "@/lib/actions/alumni";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function AdminAlumniGroupPage({ params }: { params: { id: string } }) {
  const admin = await requireAdminUser();
  if (!isSuperAdmin(admin.email)) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Managing the alumni network is restricted to the primary admin.</p>
      </Card>
    );
  }

  const group = await prisma.alumniGroup.findUnique({
    where: { id: params.id },
    include: {
      memberships: {
        orderBy: { joinedAt: "desc" },
        include: { participant: { include: { user: { select: { name: true, email: true } } } } },
      },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!group) notFound();

  const memberIds = new Set(group.memberships.map((m) => m.participantId));
  const participants = await prisma.participantProfile.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { enrolledAt: "desc" },
  });
  const addable = participants.filter((p) => !memberIds.has(p.id));

  return (
    <div className="space-y-8">
      <PageHeader title={group.name} description={`${group.kind === "GENERAL" ? "General" : "Specialized"} group`} />

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Group settings</h2>
        <form action={updateAlumniGroup} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={group.id} />
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Name</span>
            <Input name="name" defaultValue={group.name} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Kind</span>
            <Select name="kind" defaultValue={group.kind}>
              <option value="GENERAL">General</option>
              <option value="SPECIALIZED">Specialized</option>
            </Select>
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-slate-600">Description</span>
            <Textarea name="description" rows={2} defaultValue={group.description ?? ""} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="isActive" defaultChecked={group.isActive} className="h-4 w-4" />
            Active
          </label>
          <div className="md:col-span-2">
            <Button type="submit" size="sm">Save group</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Members ({group.memberships.length})</h2>
        <div className="mt-3 space-y-2">
          {group.memberships.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-3">
              <span className="text-sm text-navy-900">{m.participant.user.name ?? m.participant.user.email}</span>
              <form action={removeAlumniMembership}>
                <input type="hidden" name="membershipId" value={m.id} />
                <input type="hidden" name="groupId" value={group.id} />
                <Button type="submit" variant="ghost" size="sm">Remove</Button>
              </form>
            </div>
          ))}
          {group.memberships.length === 0 ? <p className="text-sm text-slate-500">No members yet.</p> : null}
        </div>
        <form action={addAlumniMembership} className="mt-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="groupId" value={group.id} />
          <label className="flex-1 space-y-1">
            <span className="text-xs font-medium text-slate-600">Add a participant</span>
            <Select name="participantId" defaultValue="">
              <option value="" disabled>Choose a participant</option>
              {addable.map((p) => (
                <option key={p.id} value={p.id}>{p.user.name ?? p.user.email}</option>
              ))}
            </Select>
          </label>
          <Button type="submit" size="sm">Add member</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Events ({group.events.length})</h2>
        <div className="mt-3 space-y-2">
          {group.events.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-3">
              <div>
                <p className="text-sm font-medium text-navy-900">{e.title}</p>
                <p className="text-xs text-slate-500">
                  {e.startsAt ? e.startsAt.toLocaleString() : "No date set"}
                  {e.location ? ` , ${e.location}` : ""}
                </p>
              </div>
              <form action={deleteAlumniEvent}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="groupId" value={group.id} />
                <Button type="submit" variant="ghost" size="sm">Delete</Button>
              </form>
            </div>
          ))}
          {group.events.length === 0 ? <p className="text-sm text-slate-500">No events yet.</p> : null}
        </div>
        <form action={createAlumniEvent} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="groupId" value={group.id} />
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Title</span>
            <Input name="title" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Starts at (optional)</span>
            <Input name="startsAt" type="datetime-local" />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-slate-600">Location (optional)</span>
            <Input name="location" />
          </label>
          <div className="md:col-span-2">
            <Button type="submit" size="sm">Add event</Button>
          </div>
        </form>
      </Card>

      <Card className="border-amber-200">
        <h2 className="text-lg font-semibold text-navy-900">Delete this group</h2>
        <p className="mt-1 text-sm text-slate-600">This removes the group, its memberships, and detaches its events.</p>
        <div className="mt-3">
          <ConfirmDialog
            action={deleteAlumniGroup}
            hidden={{ id: group.id }}
            triggerLabel="Delete group"
            title="Delete this alumni group?"
            description="Memberships are removed and events are detached. This cannot be undone."
            confirmLabel="Delete"
          />
        </div>
      </Card>

      <p className="text-sm">
        <Link href="/admin/alumni" className="text-navy-700 hover:underline">Back to the alumni network</Link>
      </p>
    </div>
  );
}
