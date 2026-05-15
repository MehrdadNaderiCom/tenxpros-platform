import { Card } from "@/components/ui/card";

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
          <p className="text-sm text-slate-600">This area is part of the active TenXPros architecture.</p>
        </Card>
      )}
    </div>
  );
}
