"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitDealRegistration } from "@/lib/actions/partner-portal";
import { DEAL_FUNCTION_OPTIONS, dealRegistrationSchema, type DealRegistrationInput } from "@/lib/validations/partner";
import { PROGRAM_CONFIG_DEFAULTS } from "@/lib/partner/config";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Field } from "@/components/ui/form-field";
import { CountrySelect } from "@/components/ui/country-select";

const defaults: Partial<DealRegistrationInput> = { productLine: "TENXPROS", offering: "B2B_ENGAGEMENT", functionsIntended: [] };

export function PartnerDealForm({
  decisionBusinessDays = PROGRAM_CONFIG_DEFAULTS.dealConfirmationWindowBusinessDays,
}: {
  /** The partner's RESOLVED decision window, passed from the server page. */
  decisionBusinessDays?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<DealRegistrationInput>({ resolver: zodResolver(dealRegistrationSchema), defaultValues: defaults });
  const intended = watch("functionsIntended") ?? [];

  const onSubmit = (data: DealRegistrationInput) => {
    setServerError(null);
    setDone(false);
    startTransition(async () => {
      const fd = new FormData();
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          for (const v of value) fd.append(key, String(v));
        } else {
          fd.append(key, String(value));
        }
      }
      const result = await submitDealRegistration(fd);
      if (!result?.ok) {
        setServerError(result?.message ?? "Could not submit the registration.");
        return;
      }
      setDone(true);
      reset(defaults);
      router.refresh();
    });
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold text-navy-900">Register a new opportunity</h2>
      <p className="mt-1 text-sm text-slate-600">
        Submit one form per opportunity, before substantive contact. It is effective only on the company&apos;s Panel
        Confirmation.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-5">
        {serverError ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        ) : null}
        {done ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Submitted. It is pending Panel Confirmation.
          </p>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Type" error={errors.productLine?.message}>
            <Select {...register("productLine")}>
              <option value="TENXPROS">TenXPros certification</option>
              <option value="TENXOPS">TenXOps engagement</option>
            </Select>
          </Field>
          <Field label="Offering in view" error={errors.offering?.message}>
            <Select {...register("offering")}>
              <option value="B2B_ENGAGEMENT">B2B Engagement</option>
              <option value="B2C_CHARTER">B2C Charter</option>
              <option value="OTHER">Other</option>
            </Select>
          </Field>
          <Field label="Exact legal entity or individual" error={errors.legalEntity?.message}>
            <Input {...register("legalEntity")} placeholder="e.g. Global Bank Ltd" />
          </Field>
          <Field label="Company domain" optional error={errors.domain?.message} description="The company website domain. It is the canonical identity used to price origination fairly.">
            <Input {...register("domain")} placeholder="e.g. globalbank.com" />
          </Field>
          <Field label="Country" error={errors.country?.message}>
            <CountrySelect {...register("country")} />
          </Field>
          <Field label="Business unit or department" optional error={errors.businessUnit?.message}>
            <Input {...register("businessUnit")} placeholder="e.g. Human Resources" />
          </Field>
          <Field label="Primary contact" optional error={errors.contactName?.message}>
            <Input {...register("contactName")} placeholder="e.g. Sara Khan" />
          </Field>
          <Field label="Contact title" optional error={errors.contactTitle?.message}>
            <Input {...register("contactTitle")} placeholder="e.g. CHRO" />
          </Field>
          <Field label="Estimated seats" optional error={errors.estSeats?.message}>
            <Input {...register("estSeats")} type="number" min={0} placeholder="e.g. 20" />
          </Field>
          <Field label="Estimated value (USD)" optional error={errors.estValueUsd?.message}>
            <Input {...register("estValueUsd")} type="number" min={0} step="0.01" placeholder="e.g. 20000" />
          </Field>
        </div>

        <Field label="Functions you intend to perform" error={errors.functionsIntended?.message}>
          <div className="flex flex-wrap gap-4">
            {DEAL_FUNCTION_OPTIONS.map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" value={value} {...register("functionsIntended")} className="h-4 w-4" />
                {label}
              </label>
            ))}
          </div>
        </Field>
        <p className="text-xs leading-5 text-slate-500">
          The dividing line between functions is your level of involvement. Describing each claim below is optional but
          strongly encouraged: it is what the review reads first and it materially speeds up confirmation.
        </p>

        {intended.includes("BASIC_INTRO") ? (
          <div className="space-y-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm font-semibold text-navy-900">Your Basic Introduction claim</p>
            <p className="text-xs leading-5 text-slate-600">
              A Basic Introduction means you actively introduce and explain us to someone you genuinely know, and then
              step away: zero meetings and no follow-up after the introduction. A genuinely valuable introduction is
              rewarded even though you introduce and step aside. It confers no account ownership or protection.
            </p>
            <Field label="Who is the contact" optional error={errors.introContactName?.message}>
              <Input {...register("introContactName")} placeholder="e.g. Sara Khan, CHRO" />
            </Field>
            <Field label="Your pre-existing relationship" optional error={errors.introRelationship?.message}>
              <Textarea {...register("introRelationship")} rows={2} placeholder="e.g. We worked together for 4 years; she asked me about AI training last month." />
            </Field>
            <Field label="How you introduced and explained us" optional error={errors.introHow?.message}>
              <Textarea {...register("introHow")} rows={2} placeholder="e.g. I walked her through the program over coffee and sent the public page." />
            </Field>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" {...register("introWarmAttested")} className="mt-0.5 h-4 w-4" />
              <span>I attest this is a genuine, pre-existing warm relationship.</span>
            </label>
            {errors.introWarmAttested ? <p className="text-sm text-red-600">{errors.introWarmAttested.message}</p> : null}
          </div>
        ) : null}

        {intended.includes("ORIGINATION") ? (
          <div className="space-y-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm font-semibold text-navy-900">Your Origination claim</p>
            <p className="text-xs leading-5 text-slate-600">
              Origination goes beyond an introduction: you attend the meetings and take on the follow-up, actively
              advancing the account.
            </p>
            <Field label="Your involvement" optional error={errors.originationInvolvement?.message}>
              <Textarea {...register("originationInvolvement")} rows={2} placeholder="e.g. I will attend the discovery and scoping meetings and own the follow-up with their L&D team." />
            </Field>
          </div>
        ) : null}

        {intended.includes("CLOSING") ? (
          <div className="space-y-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm font-semibold text-navy-900">Your Closing claim</p>
            <p className="text-xs leading-5 text-slate-600">
              Closing means you drive the deal to a signed, started contract yourself. Our team contributes at most one
              online meeting of under one hour; you carry everything else through payment cleared, contract signed, and
              the engagement started.
            </p>
            <Field label="How you will drive it to signature" optional error={errors.closingPlan?.message}>
              <Textarea {...register("closingPlan")} rows={2} placeholder="e.g. I own the proposal, the negotiation, and the signature; I may ask for one short technical call from your side." />
            </Field>
          </div>
        ) : null}

        {intended.includes("DELIVERY") ? (
          <div className="space-y-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm font-semibold text-navy-900">Your Delivery or Coaching claim</p>
            <Field label="Intended delivery scope" optional error={errors.deliveryScope?.message}>
              <Textarea {...register("deliveryScope")} rows={2} placeholder="e.g. Coaching the cohort through the twelve weeks alongside your team." />
            </Field>
          </div>
        ) : null}

        <Field
          label="Your case for this account"
          error={errors.justification?.message}
          description="Why is it reasonable for you to pursue this organisation: existing relationship, named warm contact, sector experience, or a concrete route in."
        >
          <Textarea {...register("justification")} placeholder="For example: I ran L&D at this company for 3 years; the CHRO is a former colleague who has asked for help with AI adoption." />
        </Field>

        <Field label="Any wider scope requested" optional error={errors.widerScopeRequested?.message}>
          <Input {...register("widerScopeRequested")} placeholder="Affiliates, other units or countries, if any" />
        </Field>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Submitting…" : "Submit registration"}
        </Button>
        <p className="text-xs text-slate-500">
          We confirm or decline within {decisionBusinessDays} business days, and you get an email the moment it is
          decided.
        </p>
      </form>
    </Card>
  );
}
