"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/partner/auth";
import { requireSuperAdmin } from "@/lib/authz";
import { absoluteUrl } from "@/lib/utils";
import { sanitizeLessonHtml } from "@/lib/academy/lesson-html";
import { safeSendEmail } from "@/lib/services/email";
import { notifyOwner } from "@/lib/services/owner-notify";
import {
  discussionCommentSchema,
  discussionPostSchema,
  moderateDiscussionSchema,
} from "@/lib/validations/partner";
import { recordAudit } from "@/lib/partner/audit";
import { safeRevalidatePath } from "@/lib/partner/revalidate";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Convert partner-entered plain text into safe paragraph HTML, then sanitize. */
function textToSafeHtml(text: string): string {
  const paras = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("");
  return sanitizeLessonHtml(paras || "<p></p>");
}

/** A partner submits an experience post. It stays PENDING_REVIEW until published. */
export async function submitDiscussionPost(formData: FormData) {
  const { user, partner } = await requirePartner();
  const parsed = discussionPostSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    category: formData.get("category") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const data = parsed.data;

  const post = await prisma.discussionPost.create({
    data: {
      authorUserId: user.id,
      authorName: partner.displayName,
      authorPartnerId: partner.id,
      title: data.title,
      bodyHtml: textToSafeHtml(data.body),
      category: data.category || null,
    },
  });
  await prisma.partner.update({ where: { id: partner.id }, data: { lastActivityAt: new Date() } });
  await recordAudit({
    actorId: partner.userId,
    actorRole: "PARTNER",
    action: "DISCUSSION_POST_SUBMITTED",
    entity: "DiscussionPost",
    entityId: post.id,
    after: { title: data.title },
  });
  await notifyOwner({
    subject: `New experience post to review: ${partner.displayName}`,
    template: "owner_discussion_submitted",
    body: `${partner.displayName} submitted an experience post ("${data.title}") for your review before it publishes.`,
    href: "/admin/partners/discussions",
  });
  safeRevalidatePath("/partner/discussions");
  safeRevalidatePath("/admin/partners/discussions");
  return { ok: true };
}

/** A partner comments on a PUBLISHED post. Comments are closed until publication. */
export async function postDiscussionComment(formData: FormData) {
  const { user, partner } = await requirePartner();
  const parsed = discussionCommentSchema.safeParse({
    postId: formData.get("postId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Write a comment." };
  }
  const post = await prisma.discussionPost.findUnique({
    where: { id: parsed.data.postId },
    select: { id: true, status: true },
  });
  if (!post || post.status !== "PUBLISHED") {
    return { ok: false, message: "Comments open once the post is published." };
  }
  await prisma.discussionComment.create({
    data: { postId: post.id, authorUserId: user.id, authorName: partner.displayName, body: parsed.data.body },
  });
  await prisma.partner.update({ where: { id: partner.id }, data: { lastActivityAt: new Date() } });
  safeRevalidatePath(`/partner/discussions/${post.id}`);
  safeRevalidatePath("/admin/partners/discussions");
  return { ok: true };
}

/**
 * Superadmin moderates a post: PUBLISH (optionally after editing the title,
 * body, and category) or REJECT. Publishing sets it live under the author's own
 * name; the author is notified either way.
 */
export async function moderateDiscussionPost(formData: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = moderateDiscussionSchema.safeParse({
    postId: formData.get("postId"),
    decision: formData.get("decision"),
    title: formData.get("title"),
    body: formData.get("body"),
    category: formData.get("category") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid moderation.");
  const { postId, decision, title, body, category } = parsed.data;

  const post = await prisma.discussionPost.findUniqueOrThrow({ where: { id: postId } });
  const publish = decision === "PUBLISH";
  const now = new Date();
  await prisma.discussionPost.update({
    where: { id: post.id },
    data: {
      title,
      bodyHtml: textToSafeHtml(body),
      category: category || null,
      status: publish ? "PUBLISHED" : "REJECTED",
      publishedAt: publish ? now : null,
      moderatedByEmail: admin.email,
    },
  });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: publish ? "DISCUSSION_POST_PUBLISHED" : "DISCUSSION_POST_REJECTED",
    entity: "DiscussionPost",
    entityId: post.id,
    after: { status: publish ? "PUBLISHED" : "REJECTED" },
  });

  if (post.authorPartnerId) {
    const author = await prisma.partner.findUnique({
      where: { id: post.authorPartnerId },
      select: { contactEmail: true, displayName: true },
    });
    if (author) {
      await safeSendEmail({
        to: author.contactEmail,
        subject: publish ? `Your experience post is live: ${title}` : `An update on your experience post: ${title}`,
        template: publish ? "partner_discussion_published" : "partner_discussion_rejected",
        text: publish
          ? `Hello ${author.displayName},\n\nYour post "${title}" is now published under your name for other partners to read and comment on.\n\n${absoluteUrl(`/partner/discussions/${post.id}`)}`
          : `Hello ${author.displayName},\n\nThank you for sharing. We are not publishing "${title}" as submitted. You are welcome to revise and submit again.\n\n${absoluteUrl("/partner/discussions")}`,
      });
    }
  }

  safeRevalidatePath("/admin/partners/discussions");
  safeRevalidatePath("/partner/discussions");
  safeRevalidatePath(`/partner/discussions/${post.id}`);
}

/** Pull a published post back to review (superadmin). */
export async function unpublishDiscussionPost(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = String(formData.get("postId") ?? "");
  if (!id) throw new Error("Missing post id.");
  await prisma.discussionPost.update({
    where: { id },
    data: { status: "PENDING_REVIEW", publishedAt: null, moderatedByEmail: admin.email },
  });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "DISCUSSION_POST_UNPUBLISHED",
    entity: "DiscussionPost",
    entityId: id,
  });
  safeRevalidatePath("/admin/partners/discussions");
  safeRevalidatePath("/partner/discussions");
}

/** Permanently remove a post and its comments (superadmin). */
export async function deleteDiscussionPost(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = String(formData.get("postId") ?? "");
  if (!id) throw new Error("Missing post id.");
  await prisma.discussionPost.delete({ where: { id } });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "DISCUSSION_POST_DELETED",
    entity: "DiscussionPost",
    entityId: id,
  });
  safeRevalidatePath("/admin/partners/discussions");
  safeRevalidatePath("/partner/discussions");
  redirect("/admin/partners/discussions");
}

/** Remove a single comment for moderation (superadmin). */
export async function deleteDiscussionComment(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = String(formData.get("commentId") ?? "");
  if (!id) throw new Error("Missing comment id.");
  const comment = await prisma.discussionComment.findUnique({ where: { id }, select: { postId: true } });
  await prisma.discussionComment.delete({ where: { id } });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "DISCUSSION_COMMENT_DELETED",
    entity: "DiscussionComment",
    entityId: id,
  });
  safeRevalidatePath("/admin/partners/discussions");
  if (comment?.postId) safeRevalidatePath(`/partner/discussions/${comment.postId}`);
}
