"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitApplication } from "@/lib/actions/applications";
import { applicationSchema, type ApplicationInput } from "@/lib/validations/application";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";

const defaultValues: Partial<ApplicationInput> = {
  preferredLanguage: "English",
  // No aiExperience default — applicants pick the closest option themselves
  // (an unselected placeholder fails validation, so it cannot default to "new").
  dataSensitivity: "MODERATE",
  timeAvailability: "HOURS_8",
  consentConfidentiality: false as true,
  consentTerms: false as true,
};

export function ApplicationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues,
  });

  useEffect(() => {
    setValue("utmSource", searchParams.get("utm_source") ?? undefined);
    setValue("utmMedium", searchParams.get("utm_medium") ?? undefined);
    setValue("utmCampaign", searchParams.get("utm_campaign") ?? undefined);
    setValue("utmTerm", searchParams.get("utm_term") ?? undefined);
    setValue("utmContent", searchParams.get("utm_content") ?? undefined);
    setValue("landingPage", window.location.href);
    setValue("referrerUrl", document.referrer || undefined);
  }, [searchParams, setValue]);

  const onSubmit = (data: ApplicationInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await submitApplication(data);
      if (!result.ok) {
        setServerError(result.message ?? "Application could not be submitted.");
        return;
      }
      router.push(`/apply/thank-you?id=${result.id}`);
    });
  };

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {serverError ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-navy-900">Professional context</h2>
            <p className="mt-1 text-sm text-slate-600">Tell us who you are and where the work will be grounded.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name" error={errors.fullName?.message}>
            <Input {...register("fullName")} autoComplete="name" />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input {...register("email")} type="email" autoComplete="email" />
          </Field>
          <Field label="Country" error={errors.country?.message}>
            <Input {...register("country")} />
          </Field>
          <Field label="Role / job function" error={errors.professionalRole?.message}>
            <span className="block text-xs leading-5 text-slate-500">
              What role do you currently play professionally?
            </span>
            <Input
              {...register("professionalRole")}
              placeholder="Founder, HR Director, Operations Manager, Consultant, Legal Counsel..."
            />
          </Field>
          <Field label="Field / industry context" error={errors.domain?.message}>
            <span className="block text-xs leading-5 text-slate-500">Where is your work grounded?</span>
            <Input
              {...register("domain")}
              placeholder="Healthcare, legal services, logistics, education, finance, public sector..."
            />
          </Field>
          <Field label="LinkedIn URL" error={errors.linkedinUrl?.message}>
            <Input {...register("linkedinUrl")} type="url" placeholder="https://www.linkedin.com/in/..." />
          </Field>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-navy-900">Program fit</h2>
            <p className="mt-1 text-sm text-slate-600">Choose the closest operating profile for the work you want to bring.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
          <Field label="AI familiarity in professional work" error={errors.aiExperience?.message}>
            <Select {...register("aiExperience")} defaultValue="">
              <option value="" disabled>
                Select the closest option
              </option>
              <option value="BEGINNER">New to AI in my professional work</option>
              <option value="INTERMEDIATE">Experimenting with / using AI tools</option>
              <option value="ADVANCED">Leading or advising AI initiatives</option>
            </Select>
          </Field>
          <Field label="Data sensitivity" error={errors.dataSensitivity?.message}>
            <Select {...register("dataSensitivity")}>
              <option value="LOW">Low</option>
              <option value="MODERATE">Moderate</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </Select>
          </Field>
          <Field label="Weekly availability" error={errors.timeAvailability?.message}>
            <Select {...register("timeAvailability")}>
              <option value="HOURS_5">About 2–5 hours / week</option>
              <option value="HOURS_8">About 6–8 hours / week</option>
              <option value="HOURS_12_PLUS">12+ hours / week</option>
            </Select>
          </Field>
          </div>
        </section>

        <Field
          label="What would make these 12 weeks professionally valuable for you?"
          error={errors.whyTenXPros?.message}
        >
          <span className="block text-xs leading-5 text-slate-500">
            A rough direction is enough. You do not need a finished AI idea or solution.
          </span>
          <Textarea
            {...register("whyTenXPros")}
            placeholder="For example: identify useful AI opportunities in my work, redesign a recurring workflow, improve decision support, or build a clearer AI adoption plan."
          />
        </Field>

        <Field
          label="What work situations, workflows, decisions, or opportunities should we explore with you?"
          error={errors.realProblemBrief?.message}
        >
          <span className="block text-xs leading-5 text-slate-500">
            Share 1–2 examples from your work context. Please avoid confidential or sensitive details.
          </span>
          <Textarea
            {...register("realProblemBrief")}
            placeholder="For example: reporting, client onboarding, compliance review, training design, knowledge search, operations planning, or customer support."
          />
        </Field>

        {/* English-only program: language captured implicitly, no visible field needed. */}
        <input type="hidden" defaultValue="English" {...register("preferredLanguage")} />

        <div className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="text-xl font-semibold text-navy-900">Consent and confidentiality</h2>
          <label className="flex gap-3 text-sm leading-6 text-slate-700">
            <input className="mt-1 h-4 w-4" type="checkbox" {...register("consentConfidentiality")} />
            I understand I must not submit confidential, sensitive, regulated, or third-party data unless I have the right safeguards and authority.
          </label>
          {errors.consentConfidentiality ? (
            <p className="text-sm text-red-600">{errors.consentConfidentiality.message}</p>
          ) : null}
          <label className="flex gap-3 text-sm leading-6 text-slate-700">
            <input className="mt-1 h-4 w-4" type="checkbox" {...register("consentTerms")} />I agree to the TenXPros terms, privacy policy, and refund policy.
          </label>
          {errors.consentTerms ? <p className="text-sm text-red-600">{errors.consentTerms.message}</p> : null}
          <p className="text-xs leading-5 text-slate-500">
            I understand TenXPros is selective, and payment is requested only after acceptance according to the
            active pricing tier shown on the{" "}
            <a href="/pricing" className="text-navy-600 underline-offset-2 hover:underline">
              Pricing page
            </a>
            .
          </p>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Submitting..." : "Submit application"}
        </Button>
      </form>
    </Card>
  );
}
