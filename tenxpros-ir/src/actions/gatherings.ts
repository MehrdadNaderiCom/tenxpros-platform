"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/actions/action-state";
import { actionError, actionSuccess } from "@/actions/action-state";
import { requireCurrentAdmin, requireCurrentMember } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  gatheringCancelledEmail,
  gatheringRegistrationEmail,
  sendEmail,
} from "@/lib/email";
import { formatTehranDateTime } from "@/lib/format";
import {
  IRAN_TIME_ZONE,
  tehranLocalDateTimeToUtc,
} from "@/lib/iran-week";
import {
  isWeeklyGatheringEligible,
  weeklyGatheringCreateSchema,
  weeklyGatheringRegistrationSchema,
  weeklyGatheringStatusSchema,
} from "@/lib/validation";
import {
  createWeeklyGatheringZoomMeeting,
  deleteZoomMeeting,
} from "@/lib/zoom";

async function publishGathering(gatheringId: string) {
  const gathering = await db.weeklyGathering.findUnique({
    where: { id: gatheringId },
  });
  if (
    !gathering ||
    gathering.status !== "DRAFT" ||
    gathering.startsAt <= new Date()
  ) {
    throw new Error("GATHERING_NOT_PUBLISHABLE");
  }

  let zoomData:
    | {
        zoomMeetingId: string;
        zoomMeetingUuid?: string;
        zoomJoinUrl: string;
      }
    | undefined;

  if (!gathering.zoomJoinUrl) {
    const meeting = await createWeeklyGatheringZoomMeeting({
      topic: `TenXPros AI Roundtable | ${gathering.topic}`,
      startAt: gathering.startsAt,
      agenda: gathering.description ?? undefined,
    });
    zoomData = {
      zoomMeetingId: meeting.meetingId,
      zoomJoinUrl: meeting.joinUrl,
      ...(meeting.meetingUuid
        ? { zoomMeetingUuid: meeting.meetingUuid }
        : {}),
    };
  }

  const updated = await db.weeklyGathering.updateMany({
    where: {
      id: gathering.id,
      status: "DRAFT",
      startsAt: { gt: new Date() },
    },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      ...zoomData,
    },
  });

  if (updated.count !== 1) {
    if (zoomData?.zoomMeetingId) {
      await deleteZoomMeeting(zoomData.zoomMeetingId).catch((error) => {
        console.error("Orphaned gathering Zoom cleanup failed", error);
      });
    }
    throw new Error("GATHERING_PUBLISH_CONFLICT");
  }
}

export async function createGatheringAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCurrentAdmin();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");

  let startsAt: Date;
  try {
    startsAt = tehranLocalDateTimeToUtc(date, startTime);
  } catch {
    return actionError("تاریخ یا ساعت برنامه معتبر نیست.");
  }

  const parsed = weeklyGatheringCreateSchema.safeParse({
    title: formData.get("title"),
    topic: formData.get("topic"),
    description: formData.get("description"),
    startsAt,
    endsAt: new Date(startsAt.getTime() + 90 * 60_000),
    timeZone: IRAN_TIME_ZONE,
    capacity: formData.get("capacity") || undefined,
  });
  const status = z.enum(["DRAFT", "PUBLISHED"]).safeParse(formData.get("status"));
  const zoomJoinUrl = z
    .union([
      z
        .string()
        .trim()
        .url()
        .max(2000)
        .refine((value) => {
          try {
            const url = new URL(value);
            return (
              url.protocol === "https:" &&
              (url.hostname === "zoom.us" ||
                url.hostname.endsWith(".zoom.us") ||
                url.hostname === "zoom.com" ||
                url.hostname.endsWith(".zoom.com"))
            );
          } catch {
            return false;
          }
        }),
      z.literal(""),
    ])
    .safeParse(formData.get("zoomJoinUrl"));

  if (!parsed.success || !status.success || !zoomJoinUrl.success) {
    return actionError("اطلاعات برنامه هفتگی را کامل و درست وارد کنید.");
  }
  if (parsed.data.startsAt <= new Date()) {
    return actionError("زمان برنامه باید در آینده باشد.");
  }

  const gathering = await db.weeklyGathering.create({
    data: {
      ...parsed.data,
      createdById: admin.id,
      status: "DRAFT",
      zoomJoinUrl: zoomJoinUrl.data || null,
      publishedAt: null,
    },
  });

  if (status.data === "PUBLISHED") {
    try {
      await publishGathering(gathering.id);
    } catch (error) {
      console.error("Gathering Zoom provisioning failed", error);
      revalidatePath("/admin/gatherings");
      return actionError(
        "برنامه به‌صورت پیش‌نویس ذخیره شد، اما ساخت Zoom یا انتشار کامل نشد. تنظیمات Zoom را بررسی و دوباره منتشر کنید.",
      );
    }
  }

  revalidatePath("/portal/gathering");
  revalidatePath("/admin/gatherings");
  return actionSuccess(
    status.data === "PUBLISHED"
      ? "برنامه ۹۰ دقیقه‌ای همراه با لینک Zoom منتشر شد."
      : "پیش‌نویس برنامه ۹۰ دقیقه‌ای ذخیره شد.",
  );
}

export async function registerForGatheringAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await requireCurrentMember();
  if (!isWeeklyGatheringEligible(member.membershipStatus)) {
    return actionError("این برنامه فقط برای اعضا و فارغ‌التحصیلان در دسترس است.");
  }

  const parsed = weeklyGatheringRegistrationSchema.safeParse({
    gatheringId: formData.get("gatheringId"),
  });
  if (!parsed.success) return actionError("برنامه انتخاب‌شده معتبر نیست.");

  try {
    const gathering = await db.$transaction(
      async (tx) => {
        const gathering = await tx.weeklyGathering.findUnique({
          where: { id: parsed.data.gatheringId },
          include: {
            _count: {
              select: {
                registrations: { where: { cancelledAt: null } },
              },
            },
          },
        });
        if (
          !gathering ||
          gathering.status !== "PUBLISHED" ||
          gathering.startsAt <= new Date()
        ) {
          throw new Error("GATHERING_UNAVAILABLE");
        }
        if (
          gathering.capacity &&
          gathering._count.registrations >= gathering.capacity
        ) {
          throw new Error("GATHERING_FULL");
        }

        await tx.weeklyGatheringRegistration.upsert({
          where: {
            userId_gatheringId: {
              userId: member.id,
              gatheringId: gathering.id,
            },
          },
          create: {
            userId: member.id,
            gatheringId: gathering.id,
          },
          update: {
            cancelledAt: null,
            registeredAt: new Date(),
          },
        });

        return {
          topic: gathering.topic,
          startsAt: gathering.startsAt,
          zoomJoinUrl: gathering.zoomJoinUrl,
        };
      },
      { isolationLevel: "Serializable" },
    );

    await sendEmail({
      to: member.email,
      ...gatheringRegistrationEmail(
        member.fullName,
        gathering.topic,
        formatTehranDateTime(gathering.startsAt),
        gathering.zoomJoinUrl,
      ),
    }).catch((error) => {
      console.error("Gathering registration email failed", error);
      return false;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "GATHERING_FULL") {
      return actionError("ظرفیت این برنامه تکمیل شده است.");
    }
    if (error instanceof Error && error.message === "GATHERING_UNAVAILABLE") {
      return actionError("این برنامه دیگر برای ثبت حضور باز نیست.");
    }
    console.error("Gathering registration failed", error);
    return actionError("ثبت حضور انجام نشد. لطفاً دوباره تلاش کنید.");
  }

  revalidatePath("/portal/gathering");
  revalidatePath("/admin/gatherings");
  return actionSuccess("حضور شما در AI Roundtable این هفته ثبت شد.");
}

export async function updateGatheringStatusAction(formData: FormData) {
  await requireCurrentAdmin();
  const parsed = weeklyGatheringStatusSchema.safeParse({
    gatheringId: formData.get("gatheringId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const gathering = await db.weeklyGathering.findUnique({
    where: { id: parsed.data.gatheringId },
    include: {
      registrations: {
        where: { cancelledAt: null },
        include: {
          user: { select: { fullName: true, email: true } },
        },
      },
    },
  });

  if (!gathering) return;

  if (parsed.data.status === "PUBLISHED") {
    try {
      await publishGathering(gathering.id);
    } catch (error) {
      console.error("Gathering publication failed", error);
      return;
    }
  } else if (parsed.data.status === "COMPLETED") {
    if (gathering.status !== "PUBLISHED" || gathering.endsAt > new Date()) {
      return;
    }
    await db.weeklyGathering.update({
      where: { id: gathering.id },
      data: { status: "COMPLETED" },
    });
  } else if (parsed.data.status === "CANCELLED") {
    if (gathering.status === "COMPLETED") return;

    const firstCancellation = gathering.status !== "CANCELLED";
    if (firstCancellation) {
      await db.weeklyGathering.update({
        where: { id: gathering.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          zoomJoinUrl: null,
        },
      });

      const formattedDate = formatTehranDateTime(gathering.startsAt);
      await Promise.allSettled(
        gathering.registrations.map((registration) =>
          sendEmail({
            to: registration.user.email,
            ...gatheringCancelledEmail(
              registration.user.fullName,
              gathering.topic,
              formattedDate,
            ),
          }),
        ),
      );
    }

    if (gathering.zoomMeetingId) {
      try {
        await deleteZoomMeeting(gathering.zoomMeetingId);
        await db.weeklyGathering.update({
          where: { id: gathering.id },
          data: {
            zoomMeetingId: null,
            zoomMeetingUuid: null,
            zoomJoinUrl: null,
          },
        });
      } catch (error) {
        console.error("Cancelled gathering Zoom deletion failed", error);
      }
    }
  } else {
    return;
  }

  revalidatePath("/portal/gathering");
  revalidatePath("/admin/gatherings");
}
