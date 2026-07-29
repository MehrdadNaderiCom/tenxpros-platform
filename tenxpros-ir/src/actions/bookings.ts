"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/actions/action-state";
import {
  actionError,
  actionSuccess,
  validationError,
} from "@/actions/action-state";
import {
  requireCurrentAdmin,
  requireCurrentMember,
} from "@/lib/auth";
import { db } from "@/lib/db";
import {
  bookingCancelledEmail,
  bookingEmail,
  sendEmail,
} from "@/lib/email";
import { formatTehranDateTime, getIranWeekBounds } from "@/lib/iran-week";
import {
  assertOfficeHourBookingEligible,
  createAdminAvailabilitySlots,
  iranWeekStartForSlot,
  OfficeHourRuleError,
} from "@/lib/tehran-slots";
import {
  createOfficeHourZoomMeeting,
  deleteZoomMeeting,
} from "@/lib/zoom";

const idSchema = z.string().trim().min(1).max(100);
const availabilityRangeSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^([01]\d|2[0-3]):(?:00|30)$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):(?:00|30)$/),
    note: z.string().trim().max(300).optional(),
  })
  .refine((value) => value.endTime > value.startTime, {
    path: ["endTime"],
    message: "ساعت پایان باید بعد از ساعت شروع باشد.",
  });
const PROVISIONABLE_STATUSES = [
  "RESERVED",
  "ZOOM_PENDING",
  "NEEDS_ATTENTION",
] as const;
const TERMINAL_STATUSES = [
  "COMPLETED",
  "CANCELLED_BY_MEMBER",
  "CANCELLED_BY_ADMIN",
  "NO_SHOW",
] as const;

class SlotReservationError extends Error {
  constructor(
    readonly code:
      | "MEMBERSHIP_INACTIVE"
      | "SLOT_UNAVAILABLE"
      | "WEEKLY_QUOTA_USED",
    message: string,
  ) {
    super(message);
    this.name = "SlotReservationError";
  }
}

function revalidateOfficeHourViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/availability");
  revalidatePath("/admin/slots");
  revalidatePath("/portal");
  revalidatePath("/portal/office-hours");
}

function safeOperationalError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown provisioning error";
  return message.replace(/\s+/g, " ").trim().slice(0, 1000);
}

async function markBookingNeedsAttention(
  bookingId: string,
  error: unknown,
) {
  await db.officeHourBooking.updateMany({
    where: {
      id: bookingId,
      status: { in: [...PROVISIONABLE_STATUSES] },
    },
    data: {
      status: "NEEDS_ATTENTION",
      lastError: safeOperationalError(error),
    },
  });
}

type ProvisionResult =
  | { ok: true; alreadyComplete: boolean }
  | { ok: false; reason: string };

/**
 * Creates only the missing external side effects. A persisted Zoom meeting is
 * always reused, so an email retry does not create a second meeting.
 */
async function provisionOfficeHourBooking(
  bookingId: string,
): Promise<ProvisionResult> {
  let booking = await db.officeHourBooking.findUnique({
    where: { id: bookingId },
    include: { user: true, slot: true },
  });
  if (!booking) return { ok: false, reason: "رزرو پیدا نشد." };
  if ((TERMINAL_STATUSES as readonly string[]).includes(booking.status)) {
    return { ok: false, reason: "این رزرو دیگر قابل provision نیست." };
  }
  if (booking.user.membershipStatus !== "ACTIVE") {
    const reason = "عضویت کاربر فعال نیست.";
    await markBookingNeedsAttention(booking.id, new Error(reason));
    return { ok: false, reason };
  }
  if (booking.slot.startsAt.getTime() <= Date.now()) {
    const reason = "زمان رزرو گذشته و Zoom قابل ساخت نیست.";
    await markBookingNeedsAttention(booking.id, new Error(reason));
    return { ok: false, reason };
  }

  if (booking.zoomMeetingId && !booking.zoomJoinUrl) {
    const reason = "Meeting ID موجود است اما لینک ورود ذخیره نشده است.";
    await markBookingNeedsAttention(booking.id, new Error(reason));
    return { ok: false, reason };
  }

  if (!booking.zoomMeetingId) {
    let meeting: Awaited<ReturnType<typeof createOfficeHourZoomMeeting>>;
    try {
      meeting = await createOfficeHourZoomMeeting({
        memberName: booking.user.fullName,
        startAt: booking.slot.startsAt,
      });
    } catch (error) {
      await markBookingNeedsAttention(booking.id, error);
      return { ok: false, reason: "ساخت جلسه Zoom کامل نشد." };
    }

    const persisted = await db.officeHourBooking.updateMany({
      where: {
        id: booking.id,
        zoomMeetingId: null,
        status: { in: [...PROVISIONABLE_STATUSES] },
      },
      data: {
        zoomMeetingId: meeting.meetingId,
        zoomMeetingUuid: meeting.meetingUuid ?? null,
        zoomJoinUrl: meeting.joinUrl,
        zoomCreatedAt: new Date(),
        status: "ZOOM_PENDING",
        lastError: null,
      },
    });

    if (persisted.count === 0) {
      const current = await db.officeHourBooking.findUnique({
        where: { id: booking.id },
        select: { zoomMeetingId: true },
      });
      if (current?.zoomMeetingId !== meeting.meetingId) {
        await deleteZoomMeeting(meeting.meetingId).catch(() => undefined);
      }
    }

    booking = await db.officeHourBooking.findUnique({
      where: { id: booking.id },
      include: { user: true, slot: true },
    });
    if (!booking?.zoomMeetingId || !booking.zoomJoinUrl) {
      const reason = "ذخیره اطلاعات Zoom کامل نشد.";
      if (booking) await markBookingNeedsAttention(booking.id, new Error(reason));
      return { ok: false, reason };
    }
  }

  if (booking.confirmationSentAt) {
    await db.officeHourBooking.updateMany({
      where: {
        id: booking.id,
        status: { in: [...PROVISIONABLE_STATUSES] },
      },
      data: { status: "CONFIRMED", lastError: null },
    });
    return { ok: true, alreadyComplete: true };
  }

  try {
    const delivered = await sendEmail({
      to: booking.user.email,
      ...bookingEmail(
        booking.user.fullName,
        formatTehranDateTime(booking.slot.startsAt),
        booking.zoomJoinUrl as string,
      ),
    });
    if (!delivered) {
      throw new Error("Email transport is unavailable.");
    }

    await db.officeHourBooking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        confirmationSentAt: new Date(),
        lastError: null,
      },
    });
    return { ok: true, alreadyComplete: false };
  } catch (error) {
    await markBookingNeedsAttention(booking.id, error);
    return { ok: false, reason: "ارسال ایمیل تأیید کامل نشد." };
  }
}

async function reserveSlotAtomically(userId: string, slotId: string) {
  const now = new Date();
  const currentWeek = getIranWeekBounds(now);

  return db.$transaction(
    async (transaction) => {
      const [user, slot] = await Promise.all([
        transaction.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, membershipStatus: true },
        }),
        transaction.officeHourSlot.findUnique({
          where: { id: slotId },
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            status: true,
          },
        }),
      ]);

      if (
        !user ||
        user.role !== "MEMBER" ||
        user.membershipStatus !== "ACTIVE"
      ) {
        throw new SlotReservationError(
          "MEMBERSHIP_INACTIVE",
          "Office Hour فقط برای اعضای فعال در دسترس است.",
        );
      }
      if (!slot) {
        throw new SlotReservationError(
          "SLOT_UNAVAILABLE",
          "این زمان دیگر در دسترس نیست.",
        );
      }

      try {
        assertOfficeHourBookingEligible({
          membershipStatus: user.membershipStatus,
          slotStatus: slot.status,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          now,
        });
      } catch (error) {
        if (error instanceof OfficeHourRuleError) {
          throw new SlotReservationError("SLOT_UNAVAILABLE", error.message);
        }
        throw error;
      }

      const iranWeekStartAt = iranWeekStartForSlot(slot.startsAt);
      if (iranWeekStartAt.getTime() !== currentWeek.start.getTime()) {
        throw new SlotReservationError(
          "SLOT_UNAVAILABLE",
          "این Slot متعلق به هفته جاری نیست.",
        );
      }

      const priorBooking = await transaction.officeHourBooking.findUnique({
        where: {
          userId_iranWeekStartAt: { userId, iranWeekStartAt },
        },
        select: { id: true },
      });
      if (priorBooking) {
        throw new SlotReservationError(
          "WEEKLY_QUOTA_USED",
          "سهمیه Office Hour این هفته قبلاً استفاده شده است.",
        );
      }

      const claimed = await transaction.officeHourSlot.updateMany({
        where: {
          id: slot.id,
          status: "OPEN",
          startsAt: {
            gt: now,
            gte: currentWeek.start,
            lt: currentWeek.endExclusive,
          },
          endsAt: { lte: currentWeek.endExclusive },
        },
        data: { status: "RESERVED" },
      });
      if (claimed.count !== 1) {
        throw new SlotReservationError(
          "SLOT_UNAVAILABLE",
          "این زمان هم‌اکنون توسط فرد دیگری رزرو شد.",
        );
      }

      return transaction.officeHourBooking.create({
        data: {
          userId,
          slotId: slot.id,
          iranWeekStartAt,
          status: "ZOOM_PENDING",
        },
        select: { id: true },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 10_000,
    },
  );
}

export async function createAvailabilitySlotsAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCurrentAdmin();
  const parsed = availabilityRangeSchema.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return validationError(
      "تاریخ و بازه زمانی را دقیق بررسی کنید.",
      parsed.error.flatten().fieldErrors,
    );
  }

  let slots;
  try {
    slots = createAdminAvailabilitySlots(parsed.data);
  } catch (error) {
    return actionError(
      error instanceof OfficeHourRuleError
        ? error.message
        : "بازه زمانی قابل ثبت نیست.",
    );
  }

  try {
    const result = await db.officeHourSlot.createMany({
      data: slots.map((slot) => ({
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: "OPEN" as const,
        note: parsed.data.note?.trim() || null,
        createdById: admin.id,
      })),
      skipDuplicates: true,
    });
    if (result.count === 0) {
      return actionError("تمام Slotهای این بازه قبلاً ثبت شده‌اند.");
    }

    revalidateOfficeHourViews();
    const duplicateCount = slots.length - result.count;
    return actionSuccess(
      duplicateCount > 0
        ? `${result.count.toLocaleString("fa-IR")} Slot ثبت شد و ${duplicateCount.toLocaleString("fa-IR")} مورد تکراری نادیده گرفته شد.`
        : `${result.count.toLocaleString("fa-IR")} Slot سی دقیقه‌ای ثبت شد.`,
    );
  } catch {
    return actionError("ثبت زمان‌های آزاد کامل نشد. دوباره تلاش کنید.");
  }
}

export async function bookOfficeHourAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await requireCurrentMember();
  if (member.membershipStatus !== "ACTIVE") {
    return actionError("Office Hour فقط برای اعضای فعال در دسترس است.");
  }

  const parsedSlotId = idSchema.safeParse(formData.get("slotId"));
  if (!parsedSlotId.success) {
    return actionError("یک زمان معتبر را انتخاب کنید.");
  }

  let booking: { id: string };
  try {
    booking = await reserveSlotAtomically(member.id, parsedSlotId.data);
  } catch (error) {
    if (error instanceof SlotReservationError) {
      return actionError(error.message);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      return actionError(
        "این زمان یا سهمیه هفتگی هم‌زمان استفاده شد. صفحه را تازه کنید.",
      );
    }
    return actionError("رزرو کامل نشد. دوباره تلاش کنید.");
  }

  const provisioned = await provisionOfficeHourBooking(booking.id);
  revalidateOfficeHourViews();

  if (!provisioned.ok) {
    return actionSuccess(
      "زمان شما محفوظ است. ساخت Zoom یا ارسال ایمیل نیازمند پیگیری ادمین است و پس از تکمیل در پنل نمایش داده می‌شود.",
      { bookingId: booking.id },
    );
  }

  return actionSuccess(
    "رزرو تأیید شد و لینک Zoom به ایمیل شما ارسال شد.",
    { bookingId: booking.id },
  );
}

export async function retryBookingProvisionAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireCurrentAdmin();
  const parsedBookingId = idSchema.safeParse(formData.get("bookingId"));
  if (!parsedBookingId.success) {
    return actionError("شناسه رزرو معتبر نیست.");
  }

  const result = await provisionOfficeHourBooking(parsedBookingId.data);
  revalidateOfficeHourViews();
  if (result.ok === false) return actionError(result.reason);

  return actionSuccess(
    result.alreadyComplete
      ? "Zoom و ایمیل این رزرو قبلاً کامل شده بود."
      : "Zoom آماده و ایمیل تأیید ارسال شد.",
  );
}

export async function blockAvailabilitySlotAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireCurrentAdmin();
  const parsedSlotId = idSchema.safeParse(formData.get("slotId"));
  if (!parsedSlotId.success) return actionError("شناسه Slot معتبر نیست.");

  const result = await db.officeHourSlot.updateMany({
    where: { id: parsedSlotId.data, status: "OPEN" },
    data: { status: "BLOCKED" },
  });
  if (result.count !== 1) {
    return actionError("فقط Slot باز و رزرو نشده قابل مسدودکردن است.");
  }

  revalidateOfficeHourViews();
  return actionSuccess("Slot مسدود شد.");
}

const slotStatusUpdateSchema = z.object({
  slotId: idSchema,
  status: z.enum(["OPEN", "BLOCKED", "CANCELLED"]),
});

export async function updateSlotStatusAction(formData: FormData) {
  await requireCurrentAdmin();
  const parsed = slotStatusUpdateSchema.safeParse({
    slotId: formData.get("slotId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const updated = await db.officeHourSlot.updateMany({
    where: {
      id: parsed.data.slotId,
      status: { in: ["OPEN", "BLOCKED", "CANCELLED"] },
      booking: { is: null },
    },
    data: { status: parsed.data.status },
  });
  if (updated.count !== 1) return;

  revalidateOfficeHourViews();
  revalidatePath("/admin/slots");
}

const bookingStatusUpdateSchema = z.object({
  bookingId: idSchema,
  status: z.enum(["COMPLETED", "NO_SHOW", "CANCELLED_BY_ADMIN"]),
});

export async function updateBookingStatusAction(formData: FormData) {
  await requireCurrentAdmin();
  const parsed = bookingStatusUpdateSchema.safeParse({
    bookingId: formData.get("bookingId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const booking = await db.officeHourBooking.findUnique({
    where: { id: parsed.data.bookingId },
    include: {
      slot: { select: { startsAt: true, endsAt: true } },
      user: { select: { fullName: true, email: true } },
    },
  });
  if (!booking) return;

  const now = new Date();
  if (
    (parsed.data.status === "COMPLETED" ||
      parsed.data.status === "NO_SHOW") &&
    booking.slot.endsAt > now
  ) {
    return;
  }

  const retryingZoomDeletion =
    parsed.data.status === "CANCELLED_BY_ADMIN" &&
    booking.status === "CANCELLED_BY_ADMIN" &&
    Boolean(booking.zoomMeetingId);

  const updated = await db.officeHourBooking.updateMany({
    where: {
      id: parsed.data.bookingId,
      status: {
        notIn: [
          "COMPLETED",
          "NO_SHOW",
          "CANCELLED_BY_MEMBER",
          "CANCELLED_BY_ADMIN",
        ],
      },
    },
    data: {
      status: parsed.data.status,
      completedAt:
        parsed.data.status === "COMPLETED" ? now : undefined,
      cancelledAt:
        parsed.data.status === "CANCELLED_BY_ADMIN" ? now : undefined,
      zoomJoinUrl:
        parsed.data.status === "CANCELLED_BY_ADMIN" ? null : undefined,
    },
  });

  const firstCancellation =
    updated.count === 1 && parsed.data.status === "CANCELLED_BY_ADMIN";

  if (firstCancellation) {
    await sendEmail({
      to: booking.user.email,
      ...bookingCancelledEmail(
        booking.user.fullName,
        formatTehranDateTime(booking.slot.startsAt),
      ),
    }).catch((error) => {
      console.error("Office Hour cancellation email failed", error);
      return false;
    });
  }

  if (
    (firstCancellation || retryingZoomDeletion) &&
    parsed.data.status === "CANCELLED_BY_ADMIN" &&
    booking.zoomMeetingId
  ) {
    try {
      await deleteZoomMeeting(booking.zoomMeetingId);
      await db.officeHourBooking.update({
        where: { id: parsed.data.bookingId },
        data: {
          zoomMeetingId: null,
          zoomMeetingUuid: null,
          zoomJoinUrl: null,
          lastError: null,
        },
      });
    } catch (error) {
      await db.officeHourBooking.update({
        where: { id: parsed.data.bookingId },
        data: { lastError: safeOperationalError(error) },
      });
    }
  }
  revalidateOfficeHourViews();
  revalidatePath("/admin/bookings");
}
