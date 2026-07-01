"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";
import { recordAudit } from "@/lib/partner/audit";
import { safeRevalidatePath } from "@/lib/partner/revalidate";

const groupSchema = z.object({
  name: z.string().trim().min(2, "Name the group.").max(120),
  kind: z.enum(["GENERAL", "SPECIALIZED"], { error: "Choose the group kind." }),
  description: z.string().trim().max(2000).optional(),
});

const eventSchema = z.object({
  groupId: z.string().trim().optional(),
  title: z.string().trim().min(3, "Give the event a title.").max(200),
  description: z.string().trim().max(4000).optional(),
  location: z.string().trim().max(200).optional(),
});

function parseDate(raw: FormDataEntryValue | null): Date | null {
  if (!raw) return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createAlumniGroup(formData: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the group fields.");
  const group = await prisma.alumniGroup.create({
    data: { name: parsed.data.name, kind: parsed.data.kind, description: parsed.data.description || null },
  });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "ALUMNI_GROUP_CREATED", entity: "AlumniGroup", entityId: group.id, after: { name: parsed.data.name } });
  safeRevalidatePath("/admin/alumni");
}

export async function updateAlumniGroup(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing group id.");
  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the group fields.");
  await prisma.alumniGroup.update({
    where: { id },
    data: {
      name: parsed.data.name,
      kind: parsed.data.kind,
      description: parsed.data.description || null,
      isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
    },
  });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "ALUMNI_GROUP_UPDATED", entity: "AlumniGroup", entityId: id });
  safeRevalidatePath("/admin/alumni");
  safeRevalidatePath(`/admin/alumni/${id}`);
}

export async function deleteAlumniGroup(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing group id.");
  await prisma.alumniGroup.delete({ where: { id } });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "ALUMNI_GROUP_DELETED", entity: "AlumniGroup", entityId: id });
  safeRevalidatePath("/admin/alumni");
  redirect("/admin/alumni");
}

export async function addAlumniMembership(formData: FormData) {
  const admin = await requireSuperAdmin();
  const groupId = String(formData.get("groupId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");
  if (!groupId || !participantId) throw new Error("Choose a participant to add.");
  // Idempotent: the compound unique means adding twice is a no-op.
  await prisma.alumniMembership.upsert({
    where: { groupId_participantId: { groupId, participantId } },
    create: { groupId, participantId },
    update: {},
  });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "ALUMNI_MEMBERSHIP_ADDED", entity: "AlumniGroup", entityId: groupId, after: { participantId } });
  safeRevalidatePath(`/admin/alumni/${groupId}`);
}

export async function removeAlumniMembership(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = String(formData.get("membershipId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  if (!id) throw new Error("Missing membership id.");
  await prisma.alumniMembership.delete({ where: { id } });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "ALUMNI_MEMBERSHIP_REMOVED", entity: "AlumniMembership", entityId: id });
  if (groupId) safeRevalidatePath(`/admin/alumni/${groupId}`);
}

export async function createAlumniEvent(formData: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = eventSchema.safeParse({
    groupId: formData.get("groupId") || undefined,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the event fields.");
  const startsAt = parseDate(formData.get("startsAt"));
  const event = await prisma.alumniEvent.create({
    data: {
      groupId: parsed.data.groupId || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      location: parsed.data.location || null,
      startsAt,
    },
  });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "ALUMNI_EVENT_CREATED", entity: "AlumniEvent", entityId: event.id, after: { title: parsed.data.title } });
  safeRevalidatePath("/admin/alumni");
  if (parsed.data.groupId) safeRevalidatePath(`/admin/alumni/${parsed.data.groupId}`);
}

export async function deleteAlumniEvent(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  if (!id) throw new Error("Missing event id.");
  await prisma.alumniEvent.delete({ where: { id } });
  await recordAudit({ actorId: admin.id, actorRole: admin.role, action: "ALUMNI_EVENT_DELETED", entity: "AlumniEvent", entityId: id });
  safeRevalidatePath("/admin/alumni");
  if (groupId) safeRevalidatePath(`/admin/alumni/${groupId}`);
}
