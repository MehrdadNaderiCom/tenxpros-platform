"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resubmitDealRegistration } from "@/lib/actions/partner-portal";
import { DEAL_FUNCTION_OPTIONS, resubmitDealSchema } from "@/lib/validations/partner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Field } from "@/components/ui/form-field";
import { CountrySelect } from "@/components/ui/country-select";

type ResubmitInput = z.infer<typeof resubmitDealSchema>;

export function DealResubmitForm({ deal }: { deal: ResubmitInput }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResubmitInput>({ resolver: zodResolver(resubmitDealSchema), defaultValues: deal });
  const intended = watch("functionsIntended") ?? [];

  const onSubmit = (data: ResubmitInput) => {
    setServerError(null);
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
      const result = await resubmitDealRegistration(fd);
      if (!result?.ok) {
        setServerError(result?.message ?? "Could not resubmit the opportunity.");
        return;
      }
      router.push("/partner/deals");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      ) : null}
      <input type="hidden" {...register("dealRegistrationId")} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Offering in view" error={errors.offering?.message}>
          <Select {...register("offering")}>
            <option value="B2B_ENGAGEMENT">B2B Engagement</option>
            <option value="B2C_CHARTER">B2C Charter</option>
            <option value="OTHER">Other</option>
          </Select>
        </Field>
        <Field label="Exact legal entity or individual" error={errors.legalEntity?.message}>
          <Input {...register("legalEntity")} />
        </Field>
        <Field label="Company domain" optional error={errors.domain?.message}>
          <Input {...register("domain")} placeholder="e.g. globalbank.com" />
        </Field>
        <Field label="Country" error={errors.country?.message}>
          <CountrySelect {...register("country")} />
        </Field>
        <Field label="Business unit or department" optional error={errors.businessUnit?.message}>
          <Input {...register("businessUnit")} />
        </Field>
        <Field label="Primary contact" optional error={errors.contactName?.message}>
          <Input {...register("contactName")} />
        </Field>
        <Field label="Contact title" optional error={errors.contactTitle?.message}>
          <Input {...register("contactTitle")} />
        </Field>
        <Field label="Estimated seats" optional error={errors.estSeats?.message}>
          <Input {...register("estSeats")} type="number" min={0} />
        </Field>
        <Field label="Estimated value (USD)" optional error={errors.estValueUsd?.message}>
          <Input {...register("estValueUsd")} type="number" min={0} step="0.01" />
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

      {intended.includes("BASIC_INTRO") ? (
        <div className="space-y-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-semibold text-navy-900">Your Basic Introduction claim</p>
          <p className="text-xs leading-5 text-slate-600">
            You introduce and explain us to someone with whom you have a genuinely valuable relationship, close and
            trusted or real access we could not reach ourselves, not merely someone you know, then step away: zero
            meetings and no follow-up. A genuinely valuable introduction is rewarded even though you step aside.
          </p>
          <Field label="Who is the contact" optional error={errors.introContactName?.message}>
            <Input {...register("introContactName")} />
          </Field>
          <Field label="Your pre-existing relationship" optional error={errors.introRelationship?.message}>
            <Textarea {...register("introRelationship")} rows={2} />
          </Field>
          <Field label="How you introduced and explained us" optional error={errors.introHow?.message}>
            <Textarea {...register("introHow")} rows={2} />
          </Field>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register("introWarmAttested")} className="mt-0.5 h-4 w-4" />
            <span>I attest this is a genuine, pre-existing warm relationship.</span>
          </label>
          {errors.introWarmAttested ? <p className="text-sm text-red-600">{errors.introWarmAttested.message}</p> : null}
        </div>
      ) : null}

      {intended.includes("ORIGINATION") ? (
        <Field label="Origination: your involvement (meetings and follow-up)" optional error={errors.originationInvolvement?.message}>
          <Textarea {...register("originationInvolvement")} rows={2} />
        </Field>
      ) : null}

      {intended.includes("CLOSING") ? (
        <Field
          label="Closing: how you drive it to signature (our side contributes at most one online meeting of up to forty five minutes, and possibly not even that)"
          optional
          error={errors.closingPlan?.message}
        >
          <Textarea {...register("closingPlan")} rows={2} />
        </Field>
      ) : null}

      {intended.includes("DELIVERY") ? (
        <Field label="Delivery or Coaching: intended scope" optional error={errors.deliveryScope?.message}>
          <Textarea {...register("deliveryScope")} rows={2} />
        </Field>
      ) : null}

      <Field label="Your case for this account" error={errors.justification?.message}>
        <Textarea {...register("justification")} rows={4} />
      </Field>

      <Field label="Any wider scope requested" optional error={errors.widerScopeRequested?.message}>
        <Input {...register("widerScopeRequested")} />
      </Field>

      <Field label="A note on what you changed" optional error={errors.note?.message}>
        <Textarea {...register("note")} rows={2} placeholder="Optional. Summarise your changes for the reviewer." />
      </Field>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Resubmitting…" : "Resubmit for confirmation"}
      </Button>
    </form>
  );
}
