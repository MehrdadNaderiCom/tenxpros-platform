import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { badgeCatalog, modules, pricingTiers } from "../src/lib/program-data";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed production database.");
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@tenxpros.test";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: "TenXPros Admin", role: "ADMIN", passwordHash },
    create: {
      email: adminEmail,
      name: "TenXPros Admin",
      role: "ADMIN",
      passwordHash,
    },
  });

  for (const tier of pricingTiers) {
    await prisma.pricingTier.upsert({
      where: { name: tier.name },
      update: {
        tier: tier.tier,
        price: tier.price,
        membersLimit: tier.membersLimit,
        isActive: tier.isActive,
        benefits: tier.benefits,
      },
      create: {
        name: tier.name,
        tier: tier.tier,
        price: tier.price,
        membersLimit: tier.membersLimit,
        isActive: tier.isActive,
        benefits: tier.benefits,
        openedAt: tier.isActive ? new Date() : null,
      },
    });
  }

  for (const module of modules) {
    await prisma.module.upsert({
      where: { number_version: { number: module.number, version: 1 } },
      update: {
        phase: module.phase,
        title: module.title,
        coreQuestion: module.coreQuestion,
        description: module.description,
        badgeName: module.badgeName,
        estimatedHours: module.estimatedHours,
      },
      create: {
        number: module.number,
        version: 1,
        phase: module.phase,
        title: module.title,
        coreQuestion: module.coreQuestion,
        description: module.description,
        learningObjectives: [`Understand ${module.title}`, "Apply the method to a real professional problem"],
        contentMaterials: [{ type: "reading", title: module.title, minutes: 45 }],
        exercises: [{ title: "Dossier contribution", required: true }],
        artifactTemplate: "Summarize the decision, evidence, workflow, and risks for this module.",
        passCriteria: "Submission is concrete, professionally relevant, and evidence-aware.",
        badgeName: module.badgeName,
        estimatedHours: module.estimatedHours,
      },
    });
  }

  for (const badge of badgeCatalog) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: badge,
      create: badge,
    });
  }

  const settings = [
    ["current_active_tier", "FOUNDING", "PRICING", "Current active charter tier", true],
    ["application_paused", "false", "FEATURE_FLAGS", "Pause public applications", true],
    ["directory_enabled", "false", "FEATURE_FLAGS", "Enable public directory", true],
    ["radar_enabled", "false", "FEATURE_FLAGS", "Enable Radar subscription", true],
    ["support_ticket_monthly_limit", "4", "GENERAL", "Monthly fair-use ticket limit", false],
  ] as const;

  for (const [key, value, category, label, isPublic] of settings) {
    await prisma.adminSetting.upsert({
      where: { key },
      update: { value, category, label, isPublic },
      create: { key, value, category, label, isPublic },
    });
  }

  const counts = await Promise.all([
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.pricingTier.count(),
    prisma.module.count(),
    prisma.badge.count(),
    prisma.adminSetting.count(),
  ]);

  console.log("Seed complete", {
    admins: counts[0],
    pricingTiers: counts[1],
    modules: counts[2],
    badges: counts[3],
    settings: counts[4],
    adminEmail,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
