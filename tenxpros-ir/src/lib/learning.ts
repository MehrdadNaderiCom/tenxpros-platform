export const PROGRAM_MODULE_COUNT = 11;
export const DOSSIER_SECTION_COUNT = 12;
export const DOSSIER_SECTION_MINIMUM_CHARACTERS = 80;
export const CERTIFICATION_TITLE = "DBC Professional Credential";

export const PROGRAM_MODULES = [
  {
    number: 1,
    phase: "Frame",
    title: "AI Readiness & TenXPro Mindset",
    coreQuestion:
      "اکنون کجا ایستاده‌ام و به چه نوع حرفه‌ای مجهز به AI تبدیل می‌شوم؟",
    description:
      "موضع حرفه‌ای، قرارداد یادگیری و جهت کاربردی شما را برای ادامه برنامه روشن می‌کند.",
  },
  {
    number: 2,
    phase: "Frame",
    title: "Practical AI Literacy & Hands-On Tool Fluency",
    coreQuestion:
      "AI واقع‌بینانه چه کاری می‌تواند انجام دهد و چگونه مسئولانه از آن در کار واقعی استفاده کنم؟",
    description:
      "تسلط کاربردی بر ابزارهای معاصر AI، محدودیت‌ها، Prompting و عادت‌های Verification را می‌سازد.",
  },
  {
    number: 3,
    phase: "Frame",
    title: "Responsible AI & Professional Boundaries",
    coreQuestion:
      "چه چیزی را نباید Automate کنم، افشا کنم یا به AI واگذار کنم؟",
    description:
      "مرزهای Confidentiality، پاسخ‌گویی، اخلاق و استفاده مسئولانه را تعریف می‌کند.",
  },
  {
    number: 4,
    phase: "Frame",
    title: "Problem Discovery & Structured Framing",
    coreQuestion: "کدام مسئله واقعاً ارزش حل‌کردن با AI را دارد؟",
    description:
      "ایده‌های مبهم بهبود را به یک Problem Frame ساختاریافته و آماده Evidence تبدیل می‌کند.",
  },
  {
    number: 5,
    phase: "Design",
    title: "Context, Stakeholder & Initial Foresight Mapping",
    coreQuestion:
      "چه کسانی از راهکار اثر می‌پذیرند و چه چیزهایی در اطراف آن با گذر زمان تغییر می‌کنند؟",
    description:
      "Stakeholderها، محدودیت‌ها، زمینه Adoption و سیگنال‌های اولیه تغییر را ترسیم می‌کند.",
  },
  {
    number: 6,
    phase: "Design",
    title: "Data, Evidence & Verification Discipline",
    coreQuestion:
      "کدام Evidence برای هدایت یک Workflow مبتنی بر AI به اندازه کافی قابل اعتماد است؟",
    description:
      "حساسیت داده، کیفیت منبع، بازبینی Evidence و انضباط Verification را تقویت می‌کند.",
  },
  {
    number: 7,
    phase: "Design",
    title: "Workflow, Task & Human-AI Allocation",
    coreQuestion:
      "انسان چه کاری انجام دهد، AI کجا کمک کند و قضاوت در کدام نقطه انسانی بماند؟",
    description:
      "Workflow پیش و پس از AI و تقسیم روشن مسئولیت میان انسان و سیستم را طراحی می‌کند.",
  },
  {
    number: 8,
    phase: "Design",
    title: "Responsible AI Solution Design",
    coreQuestion:
      "چگونه راهکاری طراحی کنم که مفید، ایمن و پاسخ‌گو باشد؟",
    description:
      "منطق راهکار، محدودیت‌ها، کنترل ریسک و الزامات Governance را تعریف می‌کند.",
  },
  {
    number: 9,
    phase: "Prove",
    title: "Adoption, Communication & Change Design",
    coreQuestion:
      "چگونه افراد راهکار را بفهمند، به آن اعتماد کنند و آن را به کار بگیرند؟",
    description:
      "Adoption Plan، راهبرد ارتباط و مسیر آماده‌سازی Stakeholderها را می‌سازد.",
  },
  {
    number: 10,
    phase: "Prove",
    title: "Value, Roadmap & Proof Plan",
    coreQuestion: "چگونه ثابت کنم ادامه‌دادن این راهکار ارزش دارد؟",
    description:
      "معیارهای ارزش، Proof Plan، Roadmap و Decision Gateهای ادامه مسیر را تعریف می‌کند.",
  },
  {
    number: 11,
    phase: "Foresee",
    title: "AI Foresight, Scenario Planning & Future-Proofing",
    coreQuestion:
      "چگونه با تغییر AI، کار و ریسک، راهکار را مرتبط و قابل دفاع نگه دارم؟",
    description:
      "انضباط Scenario Planning و یک Personal AI Foresight Plan عملی می‌سازد.",
  },
] as const;

export const DOSSIER_SECTIONS = [
  {
    number: 1,
    title: "Professional Context",
    guidance:
      "نقش، حوزه، محدودیت‌ها و زمینه‌ای که تصمیم AI در آن معنا پیدا می‌کند.",
  },
  {
    number: 2,
    title: "Problem Definition",
    guidance:
      "تعریف دقیق مسئله، اثر آن و دلیل اینکه اکنون ارزش رسیدگی دارد.",
  },
  {
    number: 3,
    title: "AI Suitability Assessment",
    guidance:
      "بررسی اینکه AI کجا مناسب است، کجا نیست و چه چیزی باید انسانی بماند.",
  },
  {
    number: 4,
    title: "Context, Stakeholder & Initial Foresight Analysis",
    guidance:
      "نقشه Stakeholderها، محدودیت‌های Adoption و سیگنال‌های اولیه تغییر.",
  },
  {
    number: 5,
    title: "Data & Evidence Review",
    guidance:
      "ارزیابی حساسیت داده، کیفیت منبع و انضباط Verification.",
  },
  {
    number: 6,
    title: "Workflow Before / After",
    guidance:
      "نمای روشن Workflow پیش و پس از AI و محل باقی‌ماندن قضاوت انسانی.",
  },
  {
    number: 7,
    title: "Risk, Ethics, Privacy & Compliance Review",
    guidance:
      "ریسک، اخلاق، Privacy، Compliance و کنترل‌های لازم برای استفاده مسئولانه.",
  },
  {
    number: 8,
    title: "Responsible AI Solution Design",
    guidance:
      "منطق راهکار، Guardrailها، مسئولیت‌ها و الزامات Governance.",
  },
  {
    number: 9,
    title: "Adoption & Communication Plan",
    guidance:
      "مسیر اعتماد، ارتباط و آماده‌سازی افرادی که باید راهکار را به کار بگیرند.",
  },
  {
    number: 10,
    title: "Value, Roadmap & Proof Plan",
    guidance:
      "معیارهای ارزش، برنامه اثبات و Decision Gateهای ادامه مسیر.",
  },
  {
    number: 11,
    title: "Personal AI Foresight Plan",
    guidance:
      "سناریوها و سیگنال‌هایی که پایداری تصمیم را در طول زمان می‌سنجند.",
  },
  {
    number: 12,
    title: "Final Recommendation",
    guidance:
      "جمع‌بندی قابل دفاع درباره اجرا، توقف، اصلاح یا گام بعدی.",
  },
] as const;

export const DIAGNOSTIC_DIMENSIONS = [
  {
    field: "strategyScore",
    title: "Strategic Clarity",
    description: "وضوح مسئله، ارزش مورد انتظار و ارتباط آن با اولویت راهبردی",
  },
  {
    field: "workflowScore",
    title: "Workflow Fluency",
    description: "شناخت جریان کار، تصمیم‌ها، کاربران و نقاط اصطکاک",
  },
  {
    field: "dataScore",
    title: "Data Readiness",
    description: "شناخت کیفیت، دسترسی، مالکیت و محدودیت‌های داده",
  },
  {
    field: "deliveryScore",
    title: "Delivery Capability",
    description: "توان طراحی آزمایش، Prototype و اجرای مرحله‌ای",
  },
  {
    field: "governanceScore",
    title: "Governance Readiness",
    description: "آمادگی برای مدیریت ریسک، امنیت و پاسخ‌گویی",
  },
] as const;

export type DiagnosticScores = {
  strategyScore: number;
  workflowScore: number;
  dataScore: number;
  deliveryScore: number;
  governanceScore: number;
};

export function isLearningMemberStatus(status: string) {
  return status === "ACTIVE" || status === "GRADUATED";
}

export function diagnosticOverallScore(scores: DiagnosticScores) {
  return (
    scores.strategyScore +
    scores.workflowScore +
    scores.dataScore +
    scores.deliveryScore +
    scores.governanceScore
  ) * 4;
}

export function moduleIsUnlocked(
  moduleNumber: number,
  completedModuleNumbers: ReadonlySet<number>,
) {
  return (
    Number.isInteger(moduleNumber) &&
    moduleNumber >= 1 &&
    moduleNumber <= PROGRAM_MODULE_COUNT &&
    (moduleNumber === 1 || completedModuleNumbers.has(moduleNumber - 1))
  );
}

export function dossierSectionIsComplete(content: string | null | undefined) {
  return (
    typeof content === "string" &&
    content.trim().length >= DOSSIER_SECTION_MINIMUM_CHARACTERS
  );
}

export function allProgramModulesCompleted(
  moduleNumbers: readonly number[],
) {
  const completed = new Set(moduleNumbers);
  return PROGRAM_MODULES.every((module) => completed.has(module.number));
}

export function credentialIsPublic(input: {
  status: string;
  revokedAt: Date | null;
}) {
  return input.status === "ISSUED" && input.revokedAt === null;
}

export type CredentialPrerequisiteFailure =
  | "dossier_required"
  | "member_ineligible"
  | "diagnostic_required"
  | "modules_required";

export function credentialPrerequisiteFailure(input: {
  dossierStatus: string;
  dossierApprovedAt: Date | null;
  membershipStatus: string;
  diagnosticStatus: string | null | undefined;
  completedModuleNumbers: readonly number[];
}): CredentialPrerequisiteFailure | null {
  if (input.dossierStatus !== "APPROVED" || !input.dossierApprovedAt) {
    return "dossier_required";
  }
  if (!isLearningMemberStatus(input.membershipStatus)) {
    return "member_ineligible";
  }
  if (input.diagnosticStatus !== "REVIEWED") {
    return "diagnostic_required";
  }
  if (!allProgramModulesCompleted(input.completedModuleNumbers)) {
    return "modules_required";
  }
  return null;
}
