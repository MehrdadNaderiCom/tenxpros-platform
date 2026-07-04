"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";
import { sanitizeLessonHtml } from "@/lib/academy/lesson-html";
import {
  toolkitPostSchema,
  toolkitCategorySchema,
  TOOLKIT_MAX_FILES,
  TOOLKIT_MAX_FILE_BYTES,
  TOOLKIT_MAX_LINKS,
} from "@/lib/validations/partner";
import { normalizeLinkUrl, isToolkitLinkKind } from "@/lib/toolkit/embeds";
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

async function uniqueCategorySlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let n = 1;
  while (true) {
    const existing = await prisma.toolkitCategory.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

/** Revalidate every surface that reads toolkit content. */
function revalidateToolkit() {
  safeRevalidatePath("/admin/partners/toolkit");
  safeRevalidatePath("/admin/partners/toolkit/categories");
  safeRevalidatePath("/partner/toolkit");
}

/** Collect the repeated link rows (title/url/kind) from the post form. */
function collectLinks(formData: FormData): Array<{ title: string; url: string; kind: string; order: number }> {
  const titles = formData.getAll("linkTitle").map((v) => String(v));
  const urls = formData.getAll("linkUrl").map((v) => String(v));
  const kinds = formData.getAll("linkKind").map((v) => String(v));
  const rows: Array<{ title: string; url: string; kind: string; order: number }> = [];
  for (let i = 0; i < urls.length; i += 1) {
    const url = normalizeLinkUrl(urls[i] ?? "");
    if (!url) continue; // skip blank or malformed rows
    const rawKind = (kinds[i] ?? "LINK").toUpperCase();
    const kind = isToolkitLinkKind(rawKind) ? rawKind : "LINK";
    const title = (titles[i] ?? "").trim().slice(0, 200) || "Resource";
    rows.push({ title, url, kind, order: rows.length });
  }
  return rows;
}

/**
 * Create or update a Toolkit post (superadmin only). Sanitizes the body HTML with
 * the same allowlist as lessons, stores uploaded files as attachments, and stores
 * external links/embeds as structured ToolkitLink rows.
 */
export async function saveToolkitPost(formData: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = toolkitPostSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    slug: formData.get("slug") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    category: formData.get("category") || undefined,
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

  // Resolve the managed category. The legacy `category` string is kept in sync
  // with the chosen category's title for back-compatibility.
  let categoryId: string | null = null;
  let categoryLabel = data.category?.trim() || "General";
  if (data.categoryId) {
    const cat = await prisma.toolkitCategory.findUnique({ where: { id: data.categoryId }, select: { id: true, title: true } });
    if (cat) {
      categoryId = cat.id;
      categoryLabel = cat.title;
    }
  }

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

  const linkRows = collectLinks(formData);
  if (linkRows.length > TOOLKIT_MAX_LINKS) {
    throw new Error(`Add ${TOOLKIT_MAX_LINKS} links or fewer per save.`);
  }

  let postId = data.id;
  if (postId) {
    const slug = await uniqueSlug(baseSlug, postId);
    await prisma.toolkitPost.update({
      where: { id: postId },
      data: {
        title: data.title,
        slug,
        category: categoryLabel,
        categoryId,
        bodyHtml,
        order,
        isPublished: data.isPublished ?? false,
        authorEmail: admin.email,
        ...(fileRows.length ? { files: { create: fileRows } } : {}),
        ...(linkRows.length ? { links: { create: linkRows } } : {}),
      },
    });
  } else {
    const slug = await uniqueSlug(baseSlug);
    const created = await prisma.toolkitPost.create({
      data: {
        title: data.title,
        slug,
        category: categoryLabel,
        categoryId,
        bodyHtml,
        order,
        isPublished: data.isPublished ?? false,
        authorEmail: admin.email,
        ...(fileRows.length ? { files: { create: fileRows } } : {}),
        ...(linkRows.length ? { links: { create: linkRows } } : {}),
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
    after: { title: data.title, files: fileRows.length, links: linkRows.length },
  });
  revalidateToolkit();
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
  revalidateToolkit();
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
  revalidateToolkit();
  if (postId) redirect(`/admin/partners/toolkit/${postId}`);
}

/** Remove a single external link/embed from a Toolkit post (superadmin only). */
export async function deleteToolkitLink(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const postId = String(formData.get("postId") ?? "");
  if (!id) throw new Error("Missing link id.");
  await prisma.toolkitLink.delete({ where: { id } });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "TOOLKIT_LINK_DELETED",
    entity: "ToolkitLink",
    entityId: id,
  });
  revalidateToolkit();
  if (postId) redirect(`/admin/partners/toolkit/${postId}`);
}

// ---------------------------------------------------------------------------
// Managed categories (superadmin authoring)
// ---------------------------------------------------------------------------

/** Create or update a managed Toolkit category (superadmin only). */
export async function saveToolkitCategory(formData: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = toolkitCategorySchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    slug: formData.get("slug") || undefined,
    description: formData.get("description") || undefined,
    order: formData.get("order") || undefined,
    isPublished: formData.get("isPublished") === "on" || formData.get("isPublished") === "true",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Please check the category fields.");
  }
  const data = parsed.data;
  const description = data.description?.trim() || null;
  const order = data.order ? Number.parseInt(data.order, 10) : 0;
  const baseSlug = slugify(data.slug || data.title);

  let categoryId = data.id;
  if (categoryId) {
    const slug = await uniqueCategorySlug(baseSlug, categoryId);
    await prisma.toolkitCategory.update({
      where: { id: categoryId },
      data: { title: data.title, slug, description, order, isPublished: data.isPublished ?? false },
    });
  } else {
    const slug = await uniqueCategorySlug(baseSlug);
    const created = await prisma.toolkitCategory.create({
      data: { title: data.title, slug, description, order, isPublished: data.isPublished ?? false },
    });
    categoryId = created.id;
  }

  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: data.id ? "TOOLKIT_CATEGORY_UPDATED" : "TOOLKIT_CATEGORY_CREATED",
    entity: "ToolkitCategory",
    entityId: categoryId,
    after: { title: data.title },
  });
  revalidateToolkit();
  redirect("/admin/partners/toolkit/categories");
}

/**
 * Delete a managed category (superadmin only). Guarded: refuses while the
 * category still has posts, so a delete can never orphan or hide content by
 * surprise. The admin must move or remove the posts first.
 */
export async function deleteToolkitCategory(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing category id.");
  const count = await prisma.toolkitPost.count({ where: { categoryId: id } });
  if (count > 0) {
    throw new Error(`This category still has ${count} post(s). Move or delete them first, then delete the category.`);
  }
  await prisma.toolkitCategory.delete({ where: { id } });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "TOOLKIT_CATEGORY_DELETED",
    entity: "ToolkitCategory",
    entityId: id,
  });
  revalidateToolkit();
  redirect("/admin/partners/toolkit/categories");
}

/** Publish or unpublish a managed category (superadmin only). */
export async function toggleToolkitCategoryPublished(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing category id.");
  const existing = await prisma.toolkitCategory.findUnique({ where: { id }, select: { isPublished: true } });
  if (!existing) throw new Error("Category not found.");
  await prisma.toolkitCategory.update({ where: { id }, data: { isPublished: !existing.isPublished } });
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "TOOLKIT_CATEGORY_PUBLISH_TOGGLED",
    entity: "ToolkitCategory",
    entityId: id,
    after: { isPublished: !existing.isPublished },
  });
  revalidateToolkit();
  redirect("/admin/partners/toolkit/categories");
}

/**
 * Move a category up or down by swapping its order value with the adjacent
 * category (superadmin only). Deterministic and dependency-free.
 */
export async function moveToolkitCategory(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id) throw new Error("Missing category id.");
  if (direction !== "up" && direction !== "down") throw new Error("Invalid move direction.");

  const all = await prisma.toolkitCategory.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const index = all.findIndex((c) => c.id === id);
  if (index < 0) throw new Error("Category not found.");
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= all.length) {
    // Already at the edge; nothing to do.
    redirect("/admin/partners/toolkit/categories");
  }
  // Swap the two positions and normalize every order to its index, so reordering
  // is correct even if some categories currently share an order value.
  const ids = all.map((c) => c.id);
  [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
  await prisma.$transaction(ids.map((cid, i) => prisma.toolkitCategory.update({ where: { id: cid }, data: { order: i } })));
  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "TOOLKIT_CATEGORY_REORDERED",
    entity: "ToolkitCategory",
    entityId: id,
    after: { direction },
  });
  revalidateToolkit();
  redirect("/admin/partners/toolkit/categories");
}
