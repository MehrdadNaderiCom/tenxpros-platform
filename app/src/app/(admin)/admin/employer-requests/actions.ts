"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { EmployerRequestStatus } from "@prisma/client";

export async function setEmployerRequestStatusAction(requestId: string, formData: FormData) {
  const user = await requireAdmin();
  const status = String(formData.get("status") ?? "NEW") as EmployerRequestStatus;

  await prisma.employerRequest.update({
    where: { id: requestId },
    data: { status, ...(status === "IN_REVIEW" ? { handledById: user.id } : {}) },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "EMPLOYER_REQUEST_STATUS",
      entityType: "EmployerRequest",
      entityId: requestId,
      meta: { status },
    },
  });

  revalidatePath("/admin/employer-requests");
}
