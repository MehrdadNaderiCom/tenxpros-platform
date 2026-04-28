import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Method" };

export default function AboutPage() {
  return (
    <>
      <section className="container py-20 max-w-3xl space-y-6">
        <Badge tone="primary">Our method</Badge>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
          The TenX ecosystem, and where TenXPros fits.
        </h1>
        <p className="text-lg text-muted-foreground">
          AI adoption is not a course. It is a set of judgement calls a professional makes, every
          week, about which work to do themselves, which to delegate to AI, which to automate, and
          which to escalate. TenXPros is the service, learning, certification and talent-network
          layer that grows that judgement and makes it provable. It does not replace adjacent
          products — it complements them.
        </p>
        <p className="text-sm text-muted-foreground italic">
          TenXRole manages the career journey. TenXPros develops and certifies the professional.
          TenXOps transforms the organisation.
        </p>
      </section>

      <section className="container pb-12 grid gap-5 md:grid-cols-3">
        <Pillar title="TenXRole" subtitle="for individuals · career management">
          The AI-powered career management product. Owns career path, professional profile, skill
          gaps, opportunity radar, applications, networking, interview prep, evidence trail and the
          job-acquisition workflow itself.
        </Pillar>
        <Pillar title="TenXPros" subtitle="for individuals · service & certification">
          The AI-adoption service layer. Diagnostics, customised learning, coaching, prompt packs,
          model-strategy advice, scenario assessment, evidence review, certification and the talent
          network that introduces certified professionals to organisations.
        </Pillar>
        <Pillar title="TenXOps" subtitle="for organisations">
          AI adoption for organisations: workflow redesign, task radar, governance, team enablement
          and the definition of AI-ready roles. Generates demand for the talent TenXPros certifies.
        </Pillar>
      </section>

      <section id="ai-policy" className="container py-12 max-w-3xl space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">Our AI use policy</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The platform uses AI to summarise diagnostics, suggest task classifications, generate
          scenarios and interview questions and draft summaries. Every AI run is logged with prompt
          version, model, provider and output. AI outputs are never the only basis for hiring decisions
          and are always editable by reviewers.
        </p>
      </section>

      <section id="privacy" className="container py-12 max-w-3xl space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">Privacy posture</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Evidence is private by default. Professionals decide what is visible to reviewers, employers
          or the public. Sensitive task fields (confidentiality, risk level) influence what is allowed
          to be shared. We never expose private artifacts on public profiles.
        </p>
      </section>
    </>
  );
}

function Pillar({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6 space-y-2">
        <p className="font-semibold text-lg">{title}</p>
        <p className="text-xs uppercase tracking-wider text-accent">{subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed pt-1">{children}</p>
      </CardContent>
    </Card>
  );
}
