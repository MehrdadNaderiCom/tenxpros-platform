import "dotenv/config";
import { hash } from "bcryptjs";
import {
  MembershipStatus,
  PrismaClient,
  SiteSettingType,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

type SettingSeed = {
  value: string;
  type?: SiteSettingType;
  isPublic?: boolean;
  description: string;
  updateValue?: boolean;
};

const placeholderPattern =
  /(replace|change[-_ ]?me|example\.com|your-domain|local-test|password-here)/i;

function settings(): Record<string, SettingSeed> {
  return {
    "program.standard_price_toman": {
      value: "90000000",
      type: SiteSettingType.INTEGER,
      isPublic: true,
      description: "قیمت اصلی دوره به تومان",
    },
    "program.founding_price_toman": {
      value: "60000000",
      type: SiteSettingType.INTEGER,
      isPublic: true,
      description: "قیمت Founding Charter به تومان",
    },
    "bank.name": {
      value: process.env.BANK_NAME?.trim() || "بانک سامان",
      isPublic: false,
      description: "نام بانک مقصد",
    },
    "bank.account_holder": {
      value: process.env.BANK_ACCOUNT_HOLDER?.trim() || "مهرداد نادری",
      isPublic: false,
      description: "نام صاحب حساب",
    },
    "bank.card_number": {
      value: process.env.BANK_CARD_NUMBER?.trim() || "6219861043222503",
      isPublic: false,
      description: "شماره کارت مقصد",
    },
    "bank.iban": {
      value: process.env.BANK_IBAN?.trim() || "IR350560085980002210941001",
      isPublic: false,
      description: "شماره شبای مقصد",
    },
    "bank.account_number": {
      value: process.env.BANK_ACCOUNT_NUMBER?.trim() || "859-800-2210941-1",
      isPublic: false,
      description: "شماره حساب مقصد",
    },
    "office_hour.duration_minutes": {
      value: "30",
      type: SiteSettingType.INTEGER,
      isPublic: true,
      description: "مدت Office Hour هفتگی هر عضو",
    },
    "office_hour.time_zone": {
      value: "Asia/Tehran",
      isPublic: true,
      description: "منطقه زمانی نمایش و محاسبه Office Hour",
    },
    "office_hour.week_starts_on": {
      value: "SATURDAY",
      isPublic: true,
      description: "روز آغاز سهمیه هفتگی Office Hour",
    },
    "coaching.hourly_price_toman": {
      value: "5000000",
      type: SiteSettingType.INTEGER,
      isPublic: true,
      description: "هزینه یک ساعت Coaching به تومان",
    },
    "community.title": {
      value: "AI Roundtable",
      isPublic: true,
      description: "عنوان برنامه هفتگی اعضا و فارغ‌التحصیلان",
    },
    "community.duration_minutes": {
      value: "90",
      type: SiteSettingType.INTEGER,
      isPublic: true,
      description: "مدت برنامه هفتگی اعضا و فارغ‌التحصیلان",
    },
    "community.schedule": {
      value: process.env.WEEKLY_GATHERING_SCHEDULE?.trim() || "",
      isPublic: true,
      description: "زمان نمایشی برنامه هفتگی پس از قطعی شدن برنامه",
      updateValue: Boolean(process.env.WEEKLY_GATHERING_SCHEDULE?.trim()),
    },
    "community.join_url": {
      value: "",
      isPublic: false,
      description: "لینک خصوصی جلسه هفتگی",
      updateValue: false,
    },
  };
}

async function seedSettings() {
  for (const [key, setting] of Object.entries(settings())) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: {
        ...(setting.updateValue === false ? {} : { value: setting.value }),
        type: setting.type ?? SiteSettingType.STRING,
        isPublic: setting.isPublic ?? false,
        description: setting.description,
      },
      create: {
        key,
        value: setting.value,
        type: setting.type ?? SiteSettingType.STRING,
        isPublic: setting.isPublic ?? false,
        description: setting.description,
      },
    });
  }
}

async function seedInitialAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password =
    process.env.ADMIN_INITIAL_PASSWORD ?? process.env.ADMIN_PASSWORD;
  const configuredHash = process.env.ADMIN_PASSWORD_HASH?.trim();

  if (!email && !password && !configuredHash) return;
  if (!email) {
    throw new Error(
      "ADMIN_EMAIL is required when an administrator credential is supplied.",
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("ADMIN_EMAIL must be a valid email address.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== UserRole.ADMIN) {
      throw new Error(
        "ADMIN_EMAIL already belongs to a non-admin user. Refusing to elevate it during seed.",
      );
    }
    return;
  }

  if (!password && !configuredHash) {
    throw new Error(
      "ADMIN_PASSWORD_HASH or ADMIN_INITIAL_PASSWORD is required to create the initial administrator.",
    );
  }
  if (password && password.length < 14) {
    throw new Error("ADMIN_INITIAL_PASSWORD must contain at least 14 characters.");
  }
  if (password && placeholderPattern.test(password)) {
    throw new Error("ADMIN_INITIAL_PASSWORD still contains a placeholder value.");
  }
  if (configuredHash) {
    const bcrypt = configuredHash.match(
      /^\$2[aby]\$(\d{2})\$[./A-Za-z0-9]{53}$/,
    );
    if (!bcrypt || Number(bcrypt[1]) < 12) {
      throw new Error(
        "ADMIN_PASSWORD_HASH must be a valid bcrypt hash with cost 12 or higher.",
      );
    }
  }

  await prisma.user.create({
    data: {
      email,
      fullName: process.env.ADMIN_NAME?.trim() || "مدیر TenXPros",
      role: UserRole.ADMIN,
      membershipStatus: MembershipStatus.ACTIVE,
      passwordHash: configuredHash ?? (await hash(password!, 12)),
      emailVerifiedAt: new Date(),
    },
  });
}

async function main() {
  await seedSettings();
  await seedInitialAdmin();
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Database seed failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
