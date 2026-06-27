import type { EffectiveConfig } from "@/lib/partner/config";
import { CONFIG_FIELD_META, CONFIG_GROUPS, formatConfigValue, type ConfigFieldMeta } from "@/lib/partner/constants";
import { Input, Select } from "@/components/ui/form-fields";

type Mode = "global" | "override";
type OverrideRow = Partial<Record<keyof EffectiveConfig, number | string | boolean | null>>;

/**
 * Renders an input for every configurable field, grouped. Used by the global
 * ProgramConfig editor (mode="global") and the per-partner override editor
 * (mode="override"). In override mode each control shows the effective default as
 * a placeholder/helper, and blank means "inherit the default".
 */
function Control({
  field,
  current,
  effective,
  mode,
}: {
  field: ConfigFieldMeta;
  current: number | string | boolean | null | undefined;
  effective: number | string | boolean;
  mode: Mode;
}) {
  const name = field.key as string;
  const inheritOption = mode === "override" ? <option value="">Inherit (default)</option> : null;

  if (field.unit === "enum") {
    return (
      <Select name={name} defaultValue={current == null ? "" : String(current)}>
        {inheritOption}
        {field.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    );
  }
  if (field.unit === "bool") {
    return (
      <Select name={name} defaultValue={current == null ? "" : current ? "true" : "false"}>
        {inheritOption}
        <option value="true">Yes</option>
        <option value="false">No</option>
      </Select>
    );
  }
  return (
    <Input
      name={name}
      type={field.unit === "text" ? "text" : "number"}
      defaultValue={current == null ? "" : String(current)}
      placeholder={mode === "override" ? `default: ${formatConfigValue(effective, field.unit)}` : undefined}
    />
  );
}

export function PartnerConfigFields({
  mode,
  effective,
  overrideRow,
}: {
  mode: Mode;
  effective: EffectiveConfig;
  overrideRow?: OverrideRow;
}) {
  return (
    <div className="space-y-8">
      {CONFIG_GROUPS.map((group) => (
        <div key={group}>
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">{group}</h3>
          <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CONFIG_FIELD_META.filter((f) => f.group === group).map((field) => {
              const eff = effective[field.key] as number | string | boolean;
              const current = mode === "override" ? overrideRow?.[field.key] ?? null : eff;
              return (
                <label key={field.key as string} className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-900">{field.label}</span>
                  <Control field={field} current={current} effective={eff} mode={mode} />
                  <span className="block text-xs text-slate-500">
                    {mode === "override"
                      ? `Effective: ${formatConfigValue(eff, field.unit)}`
                      : `= ${formatConfigValue(eff, field.unit)}`}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
