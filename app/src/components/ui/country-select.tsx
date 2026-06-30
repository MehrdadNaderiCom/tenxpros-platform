import { forwardRef, type SelectHTMLAttributes } from "react";
import { COUNTRIES } from "@/lib/countries";
import { cn } from "@/lib/utils";

/**
 * A single country picker used everywhere the app collects a country. It is a
 * real <select> backed by the canonical COUNTRIES list, so users choose from the
 * list instead of typing free text. The submitted value is the country NAME
 * string (matching how every country field is stored and validated), so this is
 * a drop-in replacement for the old free-text inputs.
 *
 * Works in both styles:
 *  - plain server-action forms:  <CountrySelect name="country" defaultValue={x} />
 *  - react-hook-form:            <CountrySelect {...register("country")} />
 */
export const CountrySelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function CountrySelect(
  { className, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20",
        className,
      )}
      {...props}
    >
      <option value="">Select a country</option>
      {COUNTRIES.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
});
