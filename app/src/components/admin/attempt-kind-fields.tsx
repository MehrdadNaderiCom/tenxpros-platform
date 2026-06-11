"use client";

import { useState } from "react";
import { Select } from "@/components/ui/form-fields";
import { HintField } from "@/components/ui/hint-field";

type Option = { value: string; label: string };

/**
 * The journal's "kind + kind-specific detail" pair. The detail select's
 * options depend on the chosen kind (post -> content format, outreach ->
 * approach, ...), so this small island keeps the two in sync; everything is
 * still submitted as plain form fields (kind, variant).
 */
export function AttemptKindFields({
  kinds,
  kindHint,
  variants,
  defaultKind,
  defaultVariant,
}: {
  kinds: Option[];
  kindHint: string;
  variants: Record<string, { label: string; hint: string; options: Option[] }>;
  defaultKind: string;
  defaultVariant?: string | null;
}) {
  const [kind, setKind] = useState(defaultKind);
  const variant = variants[kind];
  return (
    <>
      <HintField label="What kind of attempt?" hint={kindHint}>
        <Select name="kind" value={kind} onChange={(event) => setKind(event.target.value)}>
          {kinds.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </HintField>
      {variant ? (
        <HintField label={variant.label} hint={variant.hint}>
          {/* key resets the uncontrolled default when the kind changes */}
          <Select name="variant" key={kind} defaultValue={kind === defaultKind ? (defaultVariant ?? "") : ""}>
            <option value="">Not set</option>
            {variant.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </HintField>
      ) : null}
    </>
  );
}
