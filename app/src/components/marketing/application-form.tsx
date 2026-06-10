"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitApplication } from "@/lib/actions/applications";
import {
  applicationSchema,
  resumeFileError,
  resumeRuleError,
  type ApplicationInput,
} from "@/lib/validations/application";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Field } from "@/components/ui/form-field";
import { COUNTRIES } from "@/lib/countries";
import {
  AI_EXPERIENCE_OPTIONS,
  DATA_SENSITIVITY_OPTIONS,
  WEEKLY_AVAILABILITY_OPTIONS,
} from "@/lib/application-labels";

const defaultValues: Partial<ApplicationInput> = {
  preferredLanguage: "English",
  // All three selects start unselected (a disabled placeholder fails validation),
  // so applicants make a conscious, accurate choice instead of accepting a default.
  consentConfidentiality: false as true,
  consentTerms: false as true,
};

export function ApplicationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const resumeRef = useRef<HTMLInputElement>(null);
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
    setResumeError(null);

    // Either LinkedIn or a resume PDF must be provided; the file is validated
    // here for fast feedback and again on the server.
    const file = resumeRef.current?.files?.[0] ?? null;
    const ruleError = resumeRuleError(data.linkedinUrl, Boolean(file));
    const fileError = file ? resumeFileError({ type: file.type, size: file.size }) : null;
    if (ruleError || fileError) {
      setResumeError(ruleError ?? fileError);
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined || value === null) continue;
        formData.append(key, typeof value === "boolean" ? String(value) : String(value));
      }
      if (file) formData.append("resume", file);

      const result = await submitApplication(formData);
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
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-navy-900">Professional context</h2>
            <p className="mt-1 text-sm text-slate-600">
              Tell us who you are and where the work will be grounded. All fields are required; for LinkedIn and
              resume, provide at least one.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Full name"
              error={errors.fullName?.message}
              hint="Your first and last name, as it should appear on your certificate."
            >
              <Input {...register("fullName")} autoComplete="name" placeholder="Jordan Avery" />
            </Field>
            <Field
              label="Email"
              error={errors.email?.message}
              hint="Use an address you check regularly — acceptance and next steps are sent here."
            >
              <Input {...register("email")} type="email" autoComplete="email" placeholder="you@example.com" />
            </Field>
            <Field
              label="Country"
              error={errors.country?.message}
              hint="The country where you are currently based. Start typing to search the list and pick your country."
            >
              <Input
                {...register("country")}
                list="country-options"
                autoComplete="country-name"
                placeholder="Start typing… e.g. United States"
              />
            </Field>
            <Field
              label="Phone number"
              error={errors.phone?.message}
              hint="Include your country code, e.g. +44 7700 900123. Used only if we need to reach you about your application."
            >
              <Input {...register("phone")} type="tel" autoComplete="tel" placeholder="+44 7700 900123" />
            </Field>
            <Field
              label="Role / job function"
              error={errors.professionalRole?.message}
              hint="Your current job title or main professional role — e.g. Founder, HR Director, Operations Manager, Consultant, Legal Counsel."
            >
              <Input {...register("professionalRole")} placeholder="e.g. Operations Manager" />
            </Field>
            <Field
              label="Field / industry context"
              error={errors.domain?.message}
              hint="The industry or sector you work in — e.g. healthcare, finance, legal services, education, logistics, public sector."
            >
              <Input {...register("domain")} placeholder="e.g. Healthcare" />
            </Field>
            <Field
              label="LinkedIn URL"
              error={errors.linkedinUrl?.message}
              hint="Paste the full link to your LinkedIn profile, starting with https://. If you prefer not to share LinkedIn, upload your resume instead."
            >
              <Input {...register("linkedinUrl")} type="url" placeholder="https://www.linkedin.com/in/..." />
            </Field>
            <Field
              label="Resume (PDF)"
              error={resumeError ?? undefined}
              hint="Required if you leave LinkedIn empty. One PDF file, up to 5 MB."
            >
              <input
                ref={resumeRef}
                type="file"
                name="resume"
                accept="application/pdf"
                onChange={() => setResumeError(null)}
                className="block h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition file:mr-3 file:rounded file:border-0 file:bg-navy-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-navy-700 focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
              />
            </Field>
          </div>
          <datalist id="country-options">
            {COUNTRIES.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-navy-900">Program fit</h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose the closest option for each. These help us tailor the program — there are no wrong answers.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Field
              label="AI familiarity"
              error={errors.aiExperience?.message}
              hint="Your familiarity with AI in your professional work today. Pick the closest option — this tailors the program, it does not screen you out."
            >
              <Select {...register("aiExperience")} defaultValue="">
                <option value="" disabled>
                  Select the closest option
                </option>
                {AI_EXPERIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Data sensitivity"
              error={errors.dataSensitivity?.message}
              hint="How sensitive is the information you typically work with day to day? Each option explains its level."
            >
              <Select {...register("dataSensitivity")} defaultValue="">
                <option value="" disabled>
                  Select the closest level
                </option>
                {DATA_SENSITIVITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Weekly availability"
              error={errors.timeAvailability?.message}
              hint="Hours per week you can commit to the 12-week program, including sessions and your own work."
            >
              <Select {...register("timeAvailability")} defaultValue="">
                <option value="" disabled>
                  Select your weekly time
                </option>
                {WEEKLY_AVAILABILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </section>

        <Field
          label="What would make these 12 weeks professionally valuable for you?"
          error={errors.whyTenXPros?.message}
          description="A rough direction is enough — a few sentences. You do not need a finished AI idea or solution."
        >
          <Textarea
            {...register("whyTenXPros")}
            placeholder="For example: identify useful AI opportunities in my work, redesign a recurring workflow, improve decision support, or build a clearer AI adoption plan."
          />
        </Field>

        <Field
          label="What work situations, workflows, decisions, or opportunities should we explore with you?"
          error={errors.realProblemBrief?.message}
          description="Share 1–2 concrete examples from your work. Please avoid confidential or sensitive details."
        >
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
            <input className="mt-1 h-4 w-4 flex-none" type="checkbox" {...register("consentConfidentiality")} />
            <span>
              I understand I must not submit confidential, sensitive, regulated, or third-party data unless I have the
              right safeguards and authority.
            </span>
          </label>
          {errors.consentConfidentiality ? (
            <p role="alert" className="text-sm text-red-600">
              {errors.consentConfidentiality.message}
            </p>
          ) : null}
          <label className="flex gap-3 text-sm leading-6 text-slate-700">
            <input className="mt-1 h-4 w-4 flex-none" type="checkbox" {...register("consentTerms")} />
            <span>
              I agree to the TenXPros{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-navy-600 underline-offset-2 hover:underline">
                terms
              </a>
              ,{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-navy-600 underline-offset-2 hover:underline">
                privacy policy
              </a>
              , and{" "}
              <a href="/refund" target="_blank" rel="noopener noreferrer" className="text-navy-600 underline-offset-2 hover:underline">
                refund policy
              </a>
              .
            </span>
          </label>
          {errors.consentTerms ? (
            <p role="alert" className="text-sm text-red-600">
              {errors.consentTerms.message}
            </p>
          ) : null}
          <p className="text-xs leading-5 text-slate-500">
            I understand TenXPros is selective, and payment is requested only after acceptance according to the active
            pricing tier shown on the{" "}
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
