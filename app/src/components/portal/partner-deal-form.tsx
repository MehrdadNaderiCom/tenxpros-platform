"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitDealRegistration } from "@/lib/actions/partner-portal";
import { DEAL_FUNCTION_OPTIONS, dealRegistrationSchema, type DealRegistrationInput } from "@/lib/validations/partner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Field } from "@/components/ui/form-field";

const defaults: Partial<DealRegistrationInput> = { productLine: "TENXPROS", offering: "B2B_ENGAGEMENT", functionsIntended: [] };

export function PartnerDealForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DealRegistrationInput>({ resolver: zodResolver(dealRegistrationSchema), defaultValues: defaults });

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
          <Field label="Country" error={errors.country?.message}>
            <Input {...register("country")} placeholder="e.g. United Arab Emirates" />
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
      </form>
    </Card>
  );
}
