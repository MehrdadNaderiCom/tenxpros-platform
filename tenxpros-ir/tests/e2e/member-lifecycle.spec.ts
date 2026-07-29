import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { hash } from "bcryptjs";

import { getIranWeekBounds } from "../../src/lib/iran-week";

const ADMIN_EMAIL = "playwright-admin@e2e.tenxpros.test";
const ADMIN_PASSWORD = "PlaywrightAdmin2026!secure";
const SLOT_NOTE_PREFIX = "E2E member lifecycle";
const GATHERING_TOPIC_PREFIX = "E2E AI Roundtable";
const HALF_HOUR_MS = 30 * 60 * 1_000;
const databaseUrl = requireDedicatedTestDatabaseUrl();
const uploadRoot = path.resolve(
  process.env.E2E_UPLOAD_DIR ?? "storage/e2e-receipts",
);
const db = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

function requireDedicatedTestDatabaseUrl() {
  const value = process.env.E2E_DATABASE_URL?.trim();
  if (!value) {
    throw new Error(
      "E2E_DATABASE_URL is required. See the E2E command in README.md.",
    );
  }

  const parsed = new URL(value);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.port !== "55432" ||
    parsed.username !== "tenxpros_ir_test" ||
    databaseName !== "tenxpros_ir_test"
  ) {
    throw new Error(
      "E2E database safety check failed. Only tenxpros_ir_test at 127.0.0.1:55432 is allowed.",
    );
  }
  return value;
}

function tehranDateAndTime(instant: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function futureTehranDateTime(minutesFromNow: number) {
  const timestamp =
    Math.ceil(
      (Date.now() + minutesFromNow * 60 * 1_000) / HALF_HOUR_MS,
    ) * HALF_HOUR_MS;
  const instant = new Date(timestamp);
  const local = tehranDateAndTime(instant);
  return {
    instant,
    date: local.date,
    time: local.time,
    dateTimeLocal: `${local.date}T${local.time}`,
  };
}

async function findTwoContiguousCurrentWeekSlots() {
  const week = getIranWeekBounds();
  let cursor =
    Math.ceil((Date.now() + 90 * 60 * 1_000) / HALF_HOUR_MS) *
    HALF_HOUR_MS;

  while (cursor + 2 * HALF_HOUR_MS <= week.endExclusive.getTime()) {
    const startsAt = new Date(cursor);
    const secondStartsAt = new Date(cursor + HALF_HOUR_MS);
    const endsAt = new Date(cursor + 2 * HALF_HOUR_MS);
    const localStart = tehranDateAndTime(startsAt);
    const localEnd = tehranDateAndTime(endsAt);

    // The availability form intentionally accepts same-day ranges only.
    if (localStart.date === localEnd.date) {
      const occupied = await db.officeHourSlot.count({
        where: { startsAt: { in: [startsAt, secondStartsAt] } },
      });
      if (occupied === 0) {
        return {
          date: localStart.date,
          startTime: localStart.time,
          endTime: localEnd.time,
          startsAt,
          secondStartsAt,
        };
      }
    }
    cursor += HALF_HOUR_MS;
  }

  throw new Error(
    "The current Iran week has no two contiguous future E2E slots left. Run this lifecycle test before late Friday night in Tehran.",
  );
}

async function ensureTestAdmin() {
  const passwordHash = await hash(ADMIN_PASSWORD, 12);
  const existing = await db.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true, role: true },
  });
  if (existing && existing.role !== "ADMIN") {
    throw new Error("The reserved E2E administrator email belongs to a member.");
  }

  await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      fullName: "مدیر تست مرورگر",
      role: "ADMIN",
      membershipStatus: "ACTIVE",
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: ADMIN_EMAIL,
      fullName: "مدیر تست مرورگر",
      role: "ADMIN",
      membershipStatus: "ACTIVE",
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });
}

async function verifyApplicantThroughTrustedDbHelper(email: string) {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) throw new Error("The applicant was not persisted.");

  const verifiedAt = new Date();
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: verifiedAt },
    }),
    db.emailVerificationToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: verifiedAt },
    }),
  ]);
}

async function safelyUnlinkReceipt(storageKey: string) {
  const resolved = path.resolve(uploadRoot, storageKey);
  if (!resolved.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new Error("Refusing to remove an E2E receipt outside its upload root.");
  }
  try {
    await unlink(resolved);
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "ENOENT")
    ) {
      throw error;
    }
  }
}

async function cleanupApplicant(email: string) {
  const user = await db.user.findUnique({
    where: { email },
    include: {
      applications: {
        select: {
          id: true,
          paymentReceipts: {
            select: { id: true, storageKey: true },
          },
        },
      },
      officeHourBookings: {
        select: { id: true, slotId: true },
      },
    },
  });
  if (!user) return;

  const applicationIds = user.applications.map((application) => application.id);
  const receiptStorageKeys = user.applications.flatMap((application) =>
    application.paymentReceipts.map((receipt) => receipt.storageKey),
  );

  await db.$transaction(async (transaction) => {
    await transaction.weeklyGatheringRegistration.deleteMany({
      where: { userId: user.id },
    });
    await transaction.coachingInquiry.deleteMany({
      where: { requestedById: user.id },
    });
    await transaction.officeHourBooking.deleteMany({
      where: { userId: user.id },
    });
    await transaction.paymentReceipt.deleteMany({
      where: { applicationId: { in: applicationIds } },
    });
    await transaction.application.deleteMany({
      where: { id: { in: applicationIds } },
    });
    await transaction.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });
    await transaction.session.deleteMany({ where: { userId: user.id } });
    await transaction.user.delete({ where: { id: user.id } });
  });

  await Promise.all(receiptStorageKeys.map(safelyUnlinkReceipt));
}

async function cleanupE2EGatherings() {
  await db.weeklyGathering.deleteMany({
    where: { topic: { startsWith: GATHERING_TOPIC_PREFIX } },
  });
}

async function cleanupE2ESlots() {
  await db.$transaction(async (transaction) => {
    await transaction.officeHourBooking.deleteMany({
      where: {
        slot: { note: { startsWith: SLOT_NOTE_PREFIX } },
      },
    });
    await transaction.officeHourSlot.deleteMany({
      where: { note: { startsWith: SLOT_NOTE_PREFIX } },
    });
  });
}

test.describe("Founding Charter member lifecycle", () => {
  const runId = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  const applicantEmail = `applicant-${runId}@e2e.tenxpros.test`;
  const applicantPassword = "MemberFlow2026!secure";
  const applicantName = `عضو تست ${runId}`;
  const slotNote = `${SLOT_NOTE_PREFIX} ${runId}`;
  const coachingSubject = `E2E Coaching ${runId}`;
  const gatheringTitle = `TenXPros AI Roundtable E2E ${runId}`;
  const gatheringTopic = `${GATHERING_TOPIC_PREFIX} ${runId}`;

  test.beforeAll(async () => {
    const database = await db.$queryRaw<Array<{ name: string }>>`
      SELECT current_database() AS name
    `;
    expect(database[0]?.name).toBe("tenxpros_ir_test");
    await cleanupE2EGatherings();
    await cleanupE2ESlots();
    await db.rateLimitBucket.deleteMany();
    await ensureTestAdmin();
  });

  test.afterAll(async () => {
    await cleanupApplicant(applicantEmail);
    await cleanupE2EGatherings();
    await cleanupE2ESlots();
    const admin = await db.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { id: true },
    });
    if (admin) {
      await db.session.deleteMany({ where: { userId: admin.id } });
    }
    await db.$disconnect();
  });

  test("application, gated acceptance, receipt approval, and one weekly Office Hour", async ({
    baseURL,
    browser,
    page: memberPage,
  }) => {
    test.slow();
    const adminContext = await browser.newContext({
      baseURL,
      locale: "fa-IR",
      timezoneId: "Asia/Tehran",
    });
    const adminPage = await adminContext.newPage();

    try {
      await test.step("Applicant submits a complete Founding Charter application", async () => {
        await memberPage.goto("/apply");
        await memberPage.getByLabel("نام و نام خانوادگی").fill(applicantName);
        await memberPage.getByLabel("ایمیل").fill(applicantEmail);
        await memberPage.getByLabel("شماره موبایل").fill("09121234567");
        await memberPage.getByLabel("نقش حرفه‌ای").fill("مدیر محصول AI");
        await memberPage.getByLabel("حوزه تخصصی").fill("تحول دیجیتال");
        await memberPage
          .locator('select[name="aiExperience"]')
          .selectOption("PRACTICAL");
        await memberPage
          .locator('select[name="weeklyAvailability"]')
          .selectOption("FIVE_TO_SEVEN");
        await memberPage.locator('textarea[name="motivation"]').fill(
          "می‌خواهم یک Workflow حرفه‌ای و قابل سنجش برای حل مسئله‌های واقعی سازمان طراحی کنم.",
        );
        await memberPage.locator('textarea[name="realProblem"]').fill(
          "مسئله واقعی ما کاهش زمان تحلیل درخواست‌های مشتریان بدون افت کیفیت تصمیم‌گیری کارشناسان است.",
        );
        await memberPage
          .locator('input[name="password"]')
          .fill(applicantPassword);
        await memberPage.locator('input[name="acceptTerms"]').check();
        await memberPage
          .getByRole("button", { name: "ثبت و ارسال درخواست" })
          .click();

        await expect(memberPage).toHaveURL(/\/apply\/thank-you\?reference=TXP-IR-/);
        await expect(
          memberPage.getByRole("heading", {
            name: "درخواست شما دریافت شد.",
          }),
        ).toBeVisible();
        await expect
          .poll(async () => {
            const application = await db.application.findFirst({
              where: { email: applicantEmail },
              select: {
                status: true,
                termsVersion: true,
                offeredPriceToman: true,
              },
            });
            return application;
          })
          .toEqual({
            status: "SUBMITTED",
            termsVersion: "fa-2026-07-v1",
            offeredPriceToman: 60_000_000,
          });
      });

      await test.step("Admin cannot accept an unverified applicant", async () => {
        await adminPage.goto("/admin/login");
        await adminPage.locator("#admin-email").fill(ADMIN_EMAIL);
        await adminPage.locator("#admin-password").fill(ADMIN_PASSWORD);
        await adminPage.getByRole("button", { name: "ورود امن" }).click();
        await expect(adminPage).toHaveURL(/\/admin$/);

        await adminPage.goto("/admin/applications");
        let applicationCard = adminPage
          .locator("main section")
          .filter({ hasText: applicantEmail })
          .first();
        await expect(
          applicationCard.getByText("ایمیل تأیید نشده", { exact: true }),
        ).toBeVisible();
        await applicationCard
          .getByRole("button", { name: "پذیرش و دعوت به پرداخت" })
          .click();
        await expect(
          applicationCard.getByText(
            "ایمیل متقاضی هنوز تأیید نشده است و درخواست فعلاً قابل پذیرش نیست.",
          ),
        ).toBeVisible();
        await expect
          .poll(async () => {
            return (
              await db.application.findFirst({
                where: { email: applicantEmail },
                select: { status: true },
              })
            )?.status;
          })
          .toBe("SUBMITTED");

        await verifyApplicantThroughTrustedDbHelper(applicantEmail);
        await adminPage.reload();
        applicationCard = adminPage
          .locator("main section")
          .filter({ hasText: applicantEmail })
          .first();
        await expect(
          applicationCard.getByText("ایمیل تأیید شده", { exact: true }),
        ).toBeVisible();
      });

      await test.step("Verified applicant can sign in but bank data remains hidden before acceptance", async () => {
        await memberPage.goto("/login");
        await memberPage.locator("#applicant-email").fill(applicantEmail);
        await memberPage
          .locator("#applicant-password")
          .fill(applicantPassword);
        await memberPage.getByRole("button", { name: "ورود امن" }).click();
        await expect(memberPage).toHaveURL(/\/portal$/);

        await memberPage.goto("/portal/payment");
        await expect(
          memberPage.getByText("پرداخت هنوز برای این حساب باز نشده است"),
        ).toBeVisible();
        await expect(
          memberPage.getByText("6219861043222503", { exact: true }),
        ).toHaveCount(0);
        await expect(
          memberPage.getByText("IR350560085980002210941001", { exact: true }),
        ).toHaveCount(0);
      });

      await test.step("Admin accepts the verified application", async () => {
        await adminPage.goto("/admin/applications");
        const applicationCard = adminPage
          .locator("main section")
          .filter({ hasText: applicantEmail })
          .first();
        await applicationCard
          .getByRole("button", { name: "پذیرش و دعوت به پرداخت" })
          .click();
        await expect
          .poll(async () => {
            const application = await db.application.findFirst({
              where: { email: applicantEmail },
              select: {
                status: true,
                user: { select: { membershipStatus: true } },
              },
            });
            return application;
          })
          .toEqual({
            status: "ACCEPTED_AWAITING_PAYMENT",
            user: { membershipStatus: "PENDING_PAYMENT" },
          });
      });

      await test.step("Member sees the single offer and uploads a private receipt", async () => {
        await memberPage.goto("/portal/payment");
        await expect(
          memberPage.getByText("6219861043222503", { exact: true }),
        ).toBeVisible();
        await expect(
          memberPage.getByText("IR350560085980002210941001", { exact: true }),
        ).toBeVisible();
        await expect(
          memberPage.getByText("859-800-2210941-1", { exact: true }),
        ).toBeVisible();

        await memberPage.locator('input[name="payerName"]').fill(applicantName);
        await memberPage
          .locator('input[name="paidAt"]')
          .fill(tehranDateAndTime(new Date()).date);
        await memberPage
          .locator('input[name="referenceNumber"]')
          .fill(`E2E-${runId}`);
        await memberPage
          .locator('input[name="sourceLastFour"]')
          .fill("2503");
        await memberPage.locator('input[name="receipt"]').setInputFiles({
          name: `receipt-${runId}.pdf`,
          mimeType: "application/pdf",
          buffer: Buffer.from(
            "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n",
          ),
        });
        await memberPage.locator('input[name="confirmPayment"]').check();
        await memberPage
          .getByRole("button", { name: "ثبت امن رسید" })
          .click();
        await expect(
          memberPage.getByRole("heading", {
            name: "رسید در صف بررسی است",
          }),
        ).toBeVisible();
        await expect
          .poll(async () => {
            const receipt = await db.paymentReceipt.findFirst({
              where: { application: { email: applicantEmail } },
              select: {
                status: true,
                amountToman: true,
                mimeType: true,
                sourceLastFour: true,
              },
            });
            return receipt;
          })
          .toEqual({
            status: "SUBMITTED",
            amountToman: 60_000_000,
            mimeType: "application/pdf",
            sourceLastFour: "2503",
          });
      });

      await test.step("Admin approves the receipt and activates membership", async () => {
        await adminPage.goto("/admin/payments");
        const receiptCard = adminPage
          .locator("main section")
          .filter({ hasText: applicantEmail })
          .first();
        await expect(receiptCard).toContainText(`E2E-${runId}`);
        await receiptCard
          .getByRole("button", { name: "تأیید پرداخت و فعال‌سازی" })
          .click();
        await expect
          .poll(async () => {
            const member = await db.user.findUnique({
              where: { email: applicantEmail },
              select: {
                membershipStatus: true,
                applications: {
                  orderBy: { submittedAt: "desc" },
                  take: 1,
                  select: { status: true },
                },
              },
            });
            return member;
          })
          .toEqual({
            membershipStatus: "ACTIVE",
            applications: [{ status: "ACTIVE" }],
          });
      });

      await test.step("Member requests 60-minute Coaching and admin schedules it in Tehran", async () => {
        await memberPage.goto("/portal/coaching");
        await expect(
          memberPage.getByText("جلسه یک ساعته", { exact: true }),
        ).toBeVisible();
        await memberPage
          .locator("#coaching-subject")
          .fill(coachingSubject);
        await memberPage.locator("#coaching-message").fill(
          "برای طراحی یک AI Product Strategy قابل اجرا و تعریف معیارهای تصمیم‌گیری جلسه اختصاصی می‌خواهم.",
        );
        await memberPage
          .locator("#coaching-preferred-schedule")
          .fill("روزهای کاری پس از ساعت ۱۷ به وقت تهران");
        await memberPage
          .getByRole("button", { name: "ارسال درخواست Coaching" })
          .click();

        await expect
          .poll(async () => {
            const inquiry = await db.coachingInquiry.findFirst({
              where: {
                subject: coachingSubject,
                requestedBy: { email: applicantEmail },
              },
              select: {
                status: true,
                requestedMinutes: true,
                hourlyRateToman: true,
              },
            });
            return inquiry;
          })
          .toEqual({
            status: "NEW",
            requestedMinutes: 60,
            hourlyRateToman: 5_000_000,
          });

        await memberPage.goto("/portal/coaching");
        const memberInquiry = memberPage
          .locator("article")
          .filter({ hasText: coachingSubject })
          .first();
        await expect(memberInquiry).toContainText("ثبت شده");

        const schedule = futureTehranDateTime(24 * 60);
        await adminPage.goto("/admin/coaching");
        const adminInquiry = adminPage
          .locator("main section")
          .filter({ hasText: coachingSubject })
          .first();
        await expect(adminInquiry).toContainText(applicantEmail);
        await expect(adminInquiry).toContainText("۵٬۰۰۰٬۰۰۰ تومان");
        await adminInquiry
          .locator('select[name="status"]')
          .selectOption("SCHEDULED");
        await adminInquiry
          .locator('input[name="scheduledAt"]')
          .fill(schedule.dateTimeLocal);
        await adminInquiry
          .locator('textarea[name="adminNote"]')
          .fill("زمان جلسه با عضو هماهنگ و در Time Zone تهران ثبت شد.");
        await adminInquiry
          .getByRole("button", { name: "ذخیره وضعیت" })
          .click();

        await expect
          .poll(async () => {
            const inquiry = await db.coachingInquiry.findFirst({
              where: {
                subject: coachingSubject,
                requestedBy: { email: applicantEmail },
              },
              select: {
                status: true,
                requestedMinutes: true,
                hourlyRateToman: true,
                scheduledAt: true,
                managedById: true,
              },
            });
            if (!inquiry) return null;
            return {
              status: inquiry.status,
              requestedMinutes: inquiry.requestedMinutes,
              hourlyRateToman: inquiry.hourlyRateToman,
              scheduledAt: inquiry.scheduledAt?.toISOString(),
              managed: Boolean(inquiry.managedById),
            };
          })
          .toEqual({
            status: "SCHEDULED",
            requestedMinutes: 60,
            hourlyRateToman: 5_000_000,
            scheduledAt: schedule.instant.toISOString(),
            managed: true,
          });

        await memberPage.goto("/portal/coaching");
        const scheduledInquiry = memberPage
          .locator("article")
          .filter({ hasText: coachingSubject })
          .first();
        await expect(scheduledInquiry).toContainText("زمان‌بندی شده");
        await expect(scheduledInquiry).toContainText("زمان جلسه:");
        await expect(scheduledInquiry).toContainText("به وقت تهران");
      });

      await test.step("Admin publishes a 90-minute AI Roundtable and member registers", async () => {
        const gatheringSchedule = futureTehranDateTime(48 * 60);
        await adminPage.goto("/admin/gatherings");
        await adminPage.locator("#gathering-title").fill(gatheringTitle);
        await adminPage.locator("#gathering-topic").fill(gatheringTopic);
        await adminPage.locator("#gathering-description").fill(
          "گفت‌وگوی هفتگی درباره Responsible AI همراه با تبادل تجربه و Networking اعضا و فارغ‌التحصیلان DBC.",
        );
        await adminPage
          .locator("#gathering-date")
          .fill(gatheringSchedule.date);
        await adminPage
          .locator("#gathering-start")
          .fill(gatheringSchedule.time);
        await adminPage.locator("#gathering-capacity").fill("25");
        await adminPage
          .locator("#gathering-status")
          .selectOption("DRAFT");
        await adminPage
          .getByRole("button", { name: "ساخت برنامه ۹۰ دقیقه‌ای" })
          .click();

        await expect
          .poll(async () => {
            const gathering = await db.weeklyGathering.findFirst({
              where: { topic: gatheringTopic },
              select: {
                status: true,
                startsAt: true,
                endsAt: true,
                zoomJoinUrl: true,
              },
            });
            if (!gathering) return null;
            return {
              status: gathering.status,
              durationMinutes:
                (gathering.endsAt.getTime() -
                  gathering.startsAt.getTime()) /
                60_000,
              zoomJoinUrl: gathering.zoomJoinUrl,
            };
          })
          .toEqual({
            status: "DRAFT",
            durationMinutes: 90,
            zoomJoinUrl: null,
          });

        await adminPage.goto("/admin/gatherings");
        let gatheringCard = adminPage
          .locator("main section")
          .filter({ hasText: gatheringTopic })
          .first();
        await gatheringCard.getByRole("button", { name: "انتشار" }).click();

        await expect
          .poll(async () => {
            const gathering = await db.weeklyGathering.findFirst({
              where: { topic: gatheringTopic },
              select: {
                status: true,
                startsAt: true,
                endsAt: true,
                timeZone: true,
                publishedAt: true,
                zoomJoinUrl: true,
              },
            });
            if (!gathering) return null;
            return {
              status: gathering.status,
              durationMinutes:
                (gathering.endsAt.getTime() -
                  gathering.startsAt.getTime()) /
                60_000,
              timeZone: gathering.timeZone,
              published: Boolean(gathering.publishedAt),
              hasMockZoomLink:
                gathering.zoomJoinUrl?.startsWith(
                  "https://zoom.invalid/mock/",
                ) ?? false,
            };
          })
          .toEqual({
            status: "PUBLISHED",
            durationMinutes: 90,
            timeZone: "Asia/Tehran",
            published: true,
            hasMockZoomLink: true,
          });

        await memberPage.goto("/portal/gathering");
        gatheringCard = memberPage
          .locator("main section")
          .filter({ hasText: gatheringTopic })
          .first();
        await expect(gatheringCard).toContainText("۹۰ دقیقه به وقت تهران");
        await gatheringCard
          .getByRole("button", {
            name: "ثبت حضور در AI Roundtable",
          })
          .click();

        await expect
          .poll(async () => {
            const registration =
              await db.weeklyGatheringRegistration.findFirst({
                where: {
                  user: { email: applicantEmail },
                  gathering: { topic: gatheringTopic },
                },
                select: {
                  cancelledAt: true,
                  gathering: {
                    select: {
                      status: true,
                      startsAt: true,
                      endsAt: true,
                    },
                  },
                },
              });
            if (!registration) return null;
            return {
              active: registration.cancelledAt === null,
              status: registration.gathering.status,
              durationMinutes:
                (registration.gathering.endsAt.getTime() -
                  registration.gathering.startsAt.getTime()) /
                60_000,
            };
          })
          .toEqual({
            active: true,
            status: "PUBLISHED",
            durationMinutes: 90,
          });

        await memberPage.goto("/portal/gathering");
        gatheringCard = memberPage
          .locator("main section")
          .filter({ hasText: gatheringTopic })
          .first();
        await expect(gatheringCard).toContainText("حضور ثبت شده");
        await expect(
          gatheringCard.getByRole("link", { name: "لینک Zoom" }),
        ).toHaveAttribute("href", /^https:\/\/zoom\.invalid\/mock\//);
      });

      await test.step("Admin creates Tehran availability and member books exactly once", async () => {
        const range = await findTwoContiguousCurrentWeekSlots();
        await adminPage.goto("/admin/slots");
        await adminPage.locator("#slot-date").fill(range.date);
        await adminPage.locator("#slot-start").fill(range.startTime);
        await adminPage.locator("#slot-end").fill(range.endTime);
        await adminPage.locator("#slot-note").fill(slotNote);
        await adminPage
          .getByRole("button", { name: "ثبت زمان‌های آزاد" })
          .click();

        await expect
          .poll(async () =>
            db.officeHourSlot.count({
              where: { note: slotNote, status: "OPEN" },
            }),
          )
          .toBe(2);
        const slots = await db.officeHourSlot.findMany({
          where: { note: slotNote },
          orderBy: { startsAt: "asc" },
          select: { id: true },
        });

        await memberPage.goto("/portal/office-hours");
        for (const slot of slots) {
          await expect(
            memberPage.locator(
              `input[name="slotId"][value="${slot.id}"]`,
            ),
          ).toBeVisible();
        }
        await memberPage
          .locator(`input[name="slotId"][value="${slots[0]!.id}"]`)
          .check();
        await memberPage
          .getByRole("button", { name: "تأیید زمان و رزرو قطعی" })
          .click();
        await expect(
          memberPage.getByText("تأیید شده", { exact: true }),
        ).toBeVisible();

        await expect
          .poll(async () => {
            const member = await db.user.findUnique({
              where: { email: applicantEmail },
              select: { id: true },
            });
            if (!member) return null;
            const bookings = await db.officeHourBooking.findMany({
              where: {
                userId: member.id,
                iranWeekStartAt: getIranWeekBounds().start,
              },
              select: {
                status: true,
                zoomJoinUrl: true,
                confirmationSentAt: true,
              },
            });
            return bookings.map((booking) => ({
              status: booking.status,
              hasMockZoomLink:
                booking.zoomJoinUrl?.startsWith(
                  "https://zoom.invalid/mock/",
                ) ?? false,
              confirmationSent: Boolean(booking.confirmationSentAt),
            }));
          })
          .toEqual([
            {
              status: "CONFIRMED",
              hasMockZoomLink: true,
              confirmationSent: true,
            },
          ]);

        await memberPage.goto("/portal/office-hours");
        await expect(
          memberPage.getByText("تأیید شده", { exact: true }),
        ).toBeVisible();
        await expect(
          memberPage.getByRole("link", { name: "ورود به جلسه Zoom" }),
        ).toHaveAttribute("href", /^https:\/\/zoom\.invalid\/mock\//);
        await expect(
          memberPage.getByText(
            "این رزرو سهمیه هفته جاری را مصرف کرده است و زمان دوم در همین هفته قابل انتخاب نیست.",
          ),
        ).toBeVisible();
        await expect(
          memberPage.locator('input[name="slotId"]'),
        ).toHaveCount(0);

        await expect
          .poll(async () => {
            const remaining = await db.officeHourSlot.findUnique({
              where: { id: slots[1]!.id },
              select: { status: true },
            });
            return remaining?.status;
          })
          .toBe("OPEN");
      });
    } finally {
      await adminContext.close();
    }
  });
});
