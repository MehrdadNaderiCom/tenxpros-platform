"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";
import { sanitizeLessonHtml } from "@/lib/academy/lesson-html";
import { toolkitPostSchema, TOOLKIT_MAX_FILES, TOOLKIT_MAX_FILE_BYTES } from "@/lib/validations/partner";
import { recordAudit } from "@/lib/partner/audit";
import { safeRevalidatePath } from "@/lib/partner/revalidate";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 120) || "post"
  );
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let n = 1;
  // Loop until a free slug is found; bounded in practice by the number of posts.
  while (true) {
    const existing = await prisma.toolkitPost.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

/**
 * Create or update a Toolkit post (superadmin only). Sanitizes the body HTML with
 * the same allowlist as lessons, and stores any uploaded files as attachments.
 */
export async function saveToolkitPost(formData: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = toolkitPostSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    slug: formData.get("slug") || undefined,
    category: formData.get("category"),
    bodyHtml: formData.get("bodyHtml"),
    order: formData.get("order") || undefined,
    isPublished: formData.get("isPublished") === "on" || formData.get("isPublished") === "true",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Please check the post fields.");
  }
  const data = parsed.data;
  const bodyHtml = sanitizeLessonHtml(data.bodyHtml);
  const order = data.order ? Number.parseInt(data.order, 10) : 0;
  const baseSlug = slugify(data.slug || data.title);

  // Collect uploaded files (server actions receive File objects in FormData).
  const uploads = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (uploads.length > TOOLKIT_MAX_FILES) {
    throw new Error(`Attach ${TOOLKIT_MAX_FILES} files or fewer per save.`);
  }
  for (const f of uploads) {
    if (f.size > TOOLKIT_MAX_FILE_BYTES) {
      throw new Error(`"${f.name}" is larger than 15 MB.`);
    }
  }
  const fileRows = await Promise.all(
    uploads.map(async (f) => ({
      filename: f.name || "file",
      mimeType: f.type || "application/octet-stream",
      size: f.size,
      data: Buffer.from(await f.arrayBuffer()),
    })),
  );

  let postId = data.id;
  if (postId) {
    const slug = await uniqueSlug(baseSlug, postId);
    await prisma.toolkitPost.update({
      where: { id: postId },
      data: {
        title: data.title,
        slug,
        category: data.category,
        bodyHtml,
        order,
        isPublished: data.isPublished ?? false,
        authorEmail: admin.email,
        ...(fileRows.length ? { files: { create: fileRows } } : {}),
      },
    });
  } else {
    const slug = await uniqueSlug(baseSlug);
    const created = await prisma.toolkitPost.create({
      data: {
        title: data.title,
        slug,
        category: data.category,
        bodyHtml,
        order,
        isPublished: data.isPublished ?? false,
        authorEmail: admin.email,
        ...(fileRows.length ? { files: { create: fileRows } } : {}),
      },
    });
    postId = created.id;
  }

  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: data.id ? "TOOLKIT_POST_UPDATED" : "TOOLKIT_POST_CREATED",
    entity: "ToolkitPost",
    entityId: postId,
    after: { title: data.title, files: fileRows.length },
  });
  safeRevalidatePath("/admin/partners/toolkit");
  safeRevalidatePath("/partner/toolkit");
  redirect(`/admin/partners/toolkit/${postId}`);
}

/** Delete a Toolkit post and its attachments (superadmin only). */
export async function deleteToolkitPost(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing post id.");
  await prisma.toolkitPost.delete({ where: { id } });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "TOOLKIT_POST_DELETED",
    entity: "ToolkitPost",
    entityId: id,
  });
  safeRevalidatePath("/admin/partners/toolkit");
  safeRevalidatePath("/partner/toolkit");
  redirect("/admin/partners/toolkit");
}

/** Remove a single attachment from a Toolkit post (superadmin only). */
export async function deleteToolkitFile(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const postId = String(formData.get("postId") ?? "");
  if (!id) throw new Error("Missing file id.");
  await prisma.toolkitFile.delete({ where: { id } });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "TOOLKIT_FILE_DELETED",
    entity: "ToolkitFile",
    entityId: id,
  });
  safeRevalidatePath("/admin/partners/toolkit");
  safeRevalidatePath("/partner/toolkit");
  if (postId) redirect(`/admin/partners/toolkit/${postId}`);
}
