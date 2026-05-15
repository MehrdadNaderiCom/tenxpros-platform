"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  diagnosticSchema,
  dossierSectionSchema,
  finalDiagnosticSchema,
  moduleArtifactSchema,
  ticketMessageSchema,
  ticketSchema,
} from "@/lib/validations/participant";

async function requireParticipant() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const profile = await prisma.participantProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: true },
  });
  if (!profile) throw new Error("Participant profile not found.");
  return profile;
}

export async function completeStarterPack() {
  const profile = await requireParticipant();
  await prisma.participantProfile.update({
    where: { id: profile.id },
    data: {
      starterPackCompletedAt: new Date(),
      status: profile.status === "ONBOARDING" ? "DIAGNOSTIC_PENDING" : profile.status,
    },
  });
  safeRevalidatePath("/portal");
  safeRevalidatePath("/portal/starter-pack");
}

export async function saveDiagnostic(formData: FormData) {
  const profile = await requireParticipant();
  const parsed = diagnosticSchema.parse(Object.fromEntries(formData));
  await prisma.diagnosticIntake.upsert({
    where: { participantId: profile.id },
    update: { ...parsed, isComplete: false },
    create: { participantId: profile.id, ...parsed, isComplete: false },
  });
  safeRevalidatePath("/portal/diagnostic");
}

export async function submitDiagnostic(formData: FormData) {
  const profile = await requireParticipant();
  const parsed = finalDiagnosticSchema.parse(Object.fromEntries(formData));
  await prisma.$transaction([
    prisma.diagnosticIntake.upsert({
      where: { participantId: profile.id },
      update: { ...parsed, isComplete: true, submittedAt: new Date() },
      create: { participantId: profile.id, ...parsed, isComplete: true, submittedAt: new Date() },
    }),
    prisma.participantProfile.update({
      where: { id: profile.id },
      data: { status: "ACTIVE" },
    }),
  ]);
  safeRevalidatePath("/portal");
  safeRevalidatePath("/portal/diagnostic");
}

export async function startModule(formData: FormData) {
  const profile = await requireParticipant();
  const participantModuleId = String(formData.get("participantModuleId") ?? "");
  await prisma.participantModule.update({
    where: { id: participantModuleId, participantId: profile.id },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  });
  safeRevalidatePath("/portal/modules");
}

export async function submitModuleArtifact(formData: FormData) {
  const profile = await requireParticipant();
  const parsed = moduleArtifactSchema.parse(Object.fromEntries(formData));
  await prisma.participantModule.update({
    where: { id: parsed.participantModuleId, participantId: profile.id },
    data: {
      artifactContent: parsed.artifactContent,
      artifactUrl: parsed.artifactUrl || null,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });
  safeRevalidatePath("/portal/modules");
  safeRevalidatePath(`/portal/modules/${parsed.participantModuleId}`);
}

export async function saveDossierSection(formData: FormData) {
  const profile = await requireParticipant();
  const parsed = dossierSectionSchema.parse(Object.fromEntries(formData));
  await prisma.dossierSection.update({
    where: { id: parsed.sectionId, dossier: { participantId: profile.id } },
    data: { content: parsed.content, lastEditedAt: new Date(), status: "DRAFT" },
  });
  safeRevalidatePath("/portal/dossier");
}

export async function submitDossierSection(formData: FormData) {
  const profile = await requireParticipant();
  const parsed = dossierSectionSchema.parse(Object.fromEntries(formData));
  await prisma.dossierSection.update({
    where: { id: parsed.sectionId, dossier: { participantId: profile.id } },
    data: { content: parsed.content, lastEditedAt: new Date(), status: "SUBMITTED" },
  });
  safeRevalidatePath("/portal/dossier");
}

export async function createTicket(formData: FormData) {
  const profile = await requireParticipant();
  const parsed = ticketSchema.parse(Object.fromEntries(formData));
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyCount = await prisma.ticket.count({
    where: { userId: profile.userId, createdAt: { gte: monthStart } },
  });
  const limit = Number(
    (await prisma.adminSetting.findUnique({ where: { key: "support_ticket_monthly_limit" } }))?.value ?? "4",
  );
  if (monthlyCount >= limit) throw new Error("Monthly fair-use ticket limit reached.");

  const ticket = await prisma.ticket.create({
    data: {
      userId: profile.userId,
      subject: parsed.subject,
      category: parsed.category,
      messages: {
        create: {
          userId: profile.userId,
          body: parsed.body,
        },
      },
    },
  });
  safeRevalidatePath("/portal/tickets");
  redirect(`/portal/tickets/${ticket.id}`);
}

export async function addTicketMessage(formData: FormData) {
  const profile = await requireParticipant();
  const parsed = ticketMessageSchema.parse(Object.fromEntries(formData));
  await prisma.ticketMessage.create({
    data: { ticketId: parsed.ticketId, userId: profile.userId, body: parsed.body },
  });
  await prisma.ticket.update({
    where: { id: parsed.ticketId, userId: profile.userId },
    data: { status: "WAITING_RESPONSE" },
  });
  safeRevalidatePath(`/portal/tickets/${parsed.ticketId}`);
}

export async function updateDirectoryProfile(formData: FormData) {
  const profile = await requireParticipant();
  const displayName = String(formData.get("displayName") ?? profile.user.name ?? "TenXPro");
  const slug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  await prisma.directoryProfile.upsert({
    where: { userId: profile.userId },
    update: {
      displayName,
      title: String(formData.get("title") ?? ""),
      domain: String(formData.get("domain") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      location: String(formData.get("location") ?? ""),
      linkedinUrl: String(formData.get("linkedinUrl") ?? "") || null,
      websiteUrl: String(formData.get("websiteUrl") ?? "") || null,
      isPublic: formData.get("isPublic") === "on",
    },
    create: {
      userId: profile.userId,
      slug: `${slug}-${profile.id.slice(0, 6)}`,
      displayName,
      title: String(formData.get("title") ?? ""),
      domain: String(formData.get("domain") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      location: String(formData.get("location") ?? ""),
      linkedinUrl: String(formData.get("linkedinUrl") ?? "") || null,
      websiteUrl: String(formData.get("websiteUrl") ?? "") || null,
      isPublic: formData.get("isPublic") === "on",
    },
  });
  safeRevalidatePath("/portal/profile");
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    if (error instanceof Error && error.message.includes("static generation store missing")) return;
    throw error;
  }
}
