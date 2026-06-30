import { PRO_DEFINITION } from "@/lib/marketing/pro-definition";
import { Card } from "@/components/ui/card";

/**
 * The canonical Pro / TenXPro definition, light theme, for partner surfaces. Same
 * source of truth as the apply page (PRO_DEFINITION). The point for a partner is
 * detection, not persuasion: who already qualifies, and why convincing is the
 * wrong move.
 */
export function ProDetectionPanel({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="space-y-4 border-navy-100 bg-navy-50/40">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-800">{PRO_DEFINITION.eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold text-navy-900">{PRO_DEFINITION.headline}</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <p className="text-sm font-semibold text-navy-900">A Pro</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{PRO_DEFINITION.proVsTenxpro.pro}</p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <p className="text-sm font-semibold text-navy-900">A TenXPro</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{PRO_DEFINITION.proVsTenxpro.tenxpro}</p>
        </div>
      </div>

      {!compact ? (
        <p className="text-sm leading-6 text-slate-600">{PRO_DEFINITION.multiplier[1]}</p>
      ) : null}

      <div className="rounded-md border-l-4 border-gold-500 bg-white p-4">
        <p className="text-sm font-semibold text-navy-900">Your job is detection, not persuasion</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{PRO_DEFINITION.partnerNote}</p>
      </div>
    </Card>
  );
}
