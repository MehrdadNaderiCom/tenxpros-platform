import type { ReactNode } from "react";
import { InfoTip } from "@/components/ui/form-field";

/**
 * Server-component-safe labeled field with an ⓘ tooltip: a label row (label +
 * InfoTip client island with string-only props) above the control. Unlike the
 * client `Field`, it does no cloneElement/aria injection, so it can be used
 * freely inside server-rendered admin forms.
 */
export function HintField({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-slate-900">{label}</span>
        {/* InfoTip generates its own unique id, so repeated labels are safe. */}
        <InfoTip label={`About ${label}`} text={hint} />
      </span>
      {children}
    </div>
  );
}
