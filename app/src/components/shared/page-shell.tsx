import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-4">
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-800">{eyebrow}</p>
      ) : null}
      <div className="max-w-3xl space-y-4">
        <h1 className="text-4xl font-semibold leading-tight tracking-normal text-navy-900 md:text-5xl">
          {title}
        </h1>
        {description ? <p className="text-lg leading-relaxed text-slate-600">{description}</p> : null}
      </div>
    </div>
  );
}

export function RouteShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />
      {children ?? (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-800">Minimal launch view</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This area is wired into the TenXPros architecture. Deeper controls can be added after the core launch workflow is stable.
          </p>
        </Card>
      )}
    </div>
  );
}

export function EmptyState({
  eyebrow = "Launch state",
  title,
  description,
  actionLabel,
  actionHref,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <Card className="border-dashed bg-neutral-50 text-center">
      <div className="mx-auto max-w-xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-800">{eyebrow}</p>
        <h2 className="text-xl font-semibold text-navy-900">{title}</h2>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
        {actionLabel && actionHref ? (
          <ButtonLink href={actionHref} variant="secondary" size="sm">
            {actionLabel}
          </ButtonLink>
        ) : null}
      </div>
    </Card>
  );
}
