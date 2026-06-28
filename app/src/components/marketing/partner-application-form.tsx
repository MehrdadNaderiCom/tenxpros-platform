"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitPartnerApplication } from "@/lib/actions/partner-public";
import {
  AUDIENCE_OPTIONS,
  partnerApplicationSchema,
  partnerDocumentFileError,
  type PartnerApplicationInput,
} from "@/lib/validations/partner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Field } from "@/components/ui/form-field";
import { COUNTRIES } from "@/lib/countries";
import { PartnerTermsDialog } from "@/components/marketing/partner-terms-modal";

const defaultValues: Partial<PartnerApplicationInput> = {
  consentNoEquity: false as true,
};

export function PartnerApplicationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const resumeRef = useRef<HTMLInputElement>(null);
  const coverLetterRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PartnerApplicationInput>({ resolver: zodResolver(partnerApplicationSchema), defaultValues });

  useEffect(() => {
    setValue("utmSource", searchParams.get("utm_source") ?? undefined);
    setValue("utmMedium", searchParams.get("utm_medium") ?? undefined);
    setValue("utmCampaign", searchParams.get("utm_campaign") ?? undefined);
    setValue("landingPage", window.location.href);
    setValue("referrerUrl", document.referrer || undefined);
  }, [searchParams, setValue]);

  const onSubmit = (data: PartnerApplicationInput) => {
    setServerError(null);
    setFileError(null);

    // Optional resume / cover letter: validate type and size on the client for a
    // fast error; the server re-validates (and checks the PDF magic bytes).
    const resumeFile = resumeRef.current?.files?.[0] ?? null;
    const coverFile = coverLetterRef.current?.files?.[0] ?? null;
    const docError =
      (resumeFile ? partnerDocumentFileError({ type: resumeFile.type, size: resumeFile.size }, "Resume") : null) ??
      (coverFile ? partnerDocumentFileError({ type: coverFile.type, size: coverFile.size }, "Cover letter") : null);
    if (docError) {
      setFileError(docError);
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined || value === null) continue;
        formData.append(key, typeof value === "boolean" ? String(value) : String(value));
      }
      if (resumeFile) formData.append("resume", resumeFile);
      if (coverFile) formData.append("coverLetter", coverFile);
      // Honeypot (not part of the validated schema): forward its value so the
      // server-side spam guard can drop bot submissions that fill it.
      formData.append("companyWebsite", honeypotRef.current?.value ?? "");
      const result = await submitPartnerApplication(formData);
      if (!result.ok) {
        setServerError(result.message ?? "Application could not be submitted.");
        return;
      }
      router.push(`/partners/apply/thank-you?id=${result.id ?? ""}`);
    });
  };

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Honeypot: hidden from users; bots that fill it are silently dropped. */}
        <div aria-hidden="true" className="hidden">
          <label>
            Company website
            <input ref={honeypotRef} type="text" name="companyWebsite" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        {serverError ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-navy-900">About you</h2>
            <p className="mt-1 text-sm text-slate-600">Tell us who you are and how to reach you.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Full name" error={errors.fullName?.message}>
              <Input {...register("fullName")} autoComplete="name" placeholder="Jordan Avery" />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input {...register("email")} type="email" autoComplete="email" placeholder="you@example.com" />
            </Field>
            <Field label="Phone" optional error={errors.phone?.message}>
              <Input {...register("phone")} type="tel" autoComplete="tel" placeholder="+44 7700 900123" />
            </Field>
            <Field label="Country" error={errors.country?.message}>
              <Input {...register("country")} list="partner-country-options" placeholder="Start typing… e.g. United States" />
            </Field>
            <Field label="Region / city" optional error={errors.region?.message}>
              <Input {...register("region")} placeholder="e.g. Dubai, UAE" />
            </Field>
            <Field label="LinkedIn or profile URL" optional error={errors.linkedinUrl?.message}>
              <Input {...register("linkedinUrl")} type="url" placeholder="https://www.linkedin.com/in/..." />
            </Field>
          </div>
          <datalist id="partner-country-options">
            {COUNTRIES.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-navy-900">Your case</h2>
            <p className="mt-1 text-sm text-slate-600">
              How you would sell, and why the organisations you have in mind are reasonable for you to pursue.
            </p>
          </div>
          <Field label="Would you sell to" error={errors.audience?.message}>
            <Select {...register("audience")} defaultValue="">
              <option value="" disabled>
                Select the closest option
              </option>
              {AUDIENCE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Relevant background"
            error={errors.background?.message}
            description="A few sentences on your relevant experience: sales, delivery, coaching, the field you know."
          >
            <Textarea {...register("background")} placeholder="For example: 8 years selling training into healthcare; strong network of HR directors." />
          </Field>
          <Field
            label="Target markets, industries or organisations"
            error={errors.targetMarkets?.message}
            description="The markets or specific organisations you would pursue for TenXPros."
          >
            <Textarea {...register("targetMarkets")} placeholder="For example: mid-size professional-services firms in the Gulf; two named banks where I have warm contacts." />
          </Field>
          <Field
            label="Why are you well placed to pursue them?"
            error={errors.accountJustification?.message}
            description="Existing relationships, named warm contacts, sector experience, or a concrete route in. The more specific you are, the stronger your application."
          >
            <Textarea {...register("accountJustification")} placeholder="For example: I ran the L&D function at one target for 3 years and still have the CHRO's trust; a referral into another." />
          </Field>
          <Field label="How did you hear about the program?" optional error={errors.heardFrom?.message}>
            <Input {...register("heardFrom")} placeholder="e.g. LinkedIn, a colleague, the website" />
          </Field>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-navy-900">Resume and cover letter</h2>
            <p className="mt-1 text-sm text-slate-600">
              Optional. If you have them, a resume and a short cover letter give us more to go on. PDF only, up to 5 MB
              each.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Resume (PDF)" optional>
              <input
                ref={resumeRef}
                type="file"
                name="resume"
                accept="application/pdf"
                onChange={() => setFileError(null)}
                className="block h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition file:mr-3 file:rounded file:border-0 file:bg-navy-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-navy-700 focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
              />
            </Field>
            <Field label="Cover letter (PDF)" optional>
              <input
                ref={coverLetterRef}
                type="file"
                name="coverLetter"
                accept="application/pdf"
                onChange={() => setFileError(null)}
                className="block h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition file:mr-3 file:rounded file:border-0 file:bg-navy-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-navy-700 focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
              />
            </Field>
          </div>
          {fileError ? (
            <p role="alert" className="text-sm text-red-600">
              {fileError}
            </p>
          ) : null}
        </section>

        <div className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="text-xl font-semibold text-navy-900">Partner terms</h2>
          <p className="text-sm leading-6 text-slate-600">
            Please read the Partner Program Terms before you apply. They explain in full how you register opportunities,
            how commission is earned and paid, the three-tier ladder, and how everything works on the Partner Panel.
          </p>
          <label className="flex gap-3 text-sm leading-6 text-slate-700">
            <input className="mt-1 h-4 w-4 flex-none" type="checkbox" {...register("consentNoEquity")} />
            <span>
              I confirm that I have read and agree to the{" "}
              <PartnerTermsDialog>Partner Program Terms</PartnerTermsDialog>.
            </span>
          </label>
          {errors.consentNoEquity ? (
            <p role="alert" className="text-sm text-red-600">
              {errors.consentNoEquity.message}
            </p>
          ) : null}
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Submitting..." : "Submit partner application"}
        </Button>
      </form>
    </Card>
  );
}
