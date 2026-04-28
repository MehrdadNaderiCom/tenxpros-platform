import Link from "next/link";
import { ArrowRight, BadgeCheck, Brain, ClipboardCheck, GitBranch, LineChart, ShieldCheck, Sparkles, Target, UsersRound, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LIFECYCLE = [
  { icon: ClipboardCheck, name: "Diagnose", text: "Self-rated diagnostic + structured AI readiness score." },
  { icon: Brain, name: "Learn", text: "Role-specific tracks, modules and lessons — not a course dump." },
  { icon: Workflow, name: "Practice", text: "Personal Task Radar maps real work to the right work mode." },
  { icon: Target, name: "Assess", text: "Scenario-based assessment with rubrics and reviewer feedback." },
  { icon: BadgeCheck, name: "Certify", text: "Evidence-based certificates, five levels, no participation trophies." },
  { icon: Sparkles, name: "Showcase", text: "Public profile with verified evidence, badges and work modes." },
  { icon: UsersRound, name: "Connect", text: "Talent-network introductions to organisations looking for AI-ready talent." },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-grid opacity-30" aria-hidden />
        <div className="container relative py-20 md:py-28">
          <div className="max-w-3xl space-y-6">
            <Badge tone="primary" className="text-[11px] uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> The AI-adoption platform for professionals
            </Badge>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Become an <span className="gradient-text">AI-Adopted Professional</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              TenXPros helps professionals become AI-adopted through diagnostics, customised
              learning, coaching, evidence-based certification, and connections with organisations
              seeking AI-ready talent — powered by{" "}
              <span className="text-foreground font-medium">TenXRole</span> for career execution.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/sign-up">
                <Button size="lg">
                  Start your readiness diagnostic
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/certification">
                <Button size="lg" variant="outline">
                  See the certification framework
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Not a course library. Not a job board. Not a prompt marketplace. Not a replacement for TenXRole.
            </p>
          </div>
        </div>
      </section>

      {/* Lifecycle */}
      <section className="border-t border-border bg-muted/30">
        <div className="container py-16 md:py-20 space-y-10">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-wider text-accent">The TenXPros lifecycle</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Diagnose → Learn → Practice → Assess → Certify → Showcase → Match.
            </h2>
            <p className="text-muted-foreground">
              An AI-adopted professional is not someone who has watched AI tutorials. They can decide
              when AI helps, when humans must lead, and when something must be escalated, automated,
              or chained across multiple tools — and they have the evidence to prove it.
            </p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {LIFECYCLE.map((step, i) => (
              <li key={step.name}>
                <Card className="h-full">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                        {i + 1}
                      </span>
                      <step.icon className="h-4 w-4 text-accent" />
                    </div>
                    <p className="text-sm font-semibold">{step.name}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.text}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What an AI-adopted professional can do */}
      <section className="container py-20 grid gap-10 lg:grid-cols-2 items-start">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wider text-accent">Definition</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            What an AI-adopted professional can actually do.
          </h2>
          <p className="text-muted-foreground">
            We hold a deliberate bar. To earn a TenXPros verified certificate, a professional must
            be able to handle real work — not just demo prompts.
          </p>
        </div>
        <ul className="space-y-3">
          {[
            "Diagnose where AI is actually useful in their role.",
            "Decide whether a task should be human-led, AI-assisted, rules-based, automated, chained, or escalated.",
            "Use AI safely and effectively in real work.",
            "Build repeatable AI workflows.",
            "Evaluate AI outputs critically.",
            "Produce evidence of AI-enabled professional work.",
            "Receive a verified TenXPros certificate based on evidence, scenarios and assessment.",
            "Become visible to organisations looking for AI-ready talent.",
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <BadgeCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Where TenXPros fits */}
      <section className="border-t border-border">
        <div className="container py-16 md:py-20 max-w-5xl space-y-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-wider text-accent">Where TenXPros fits</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Three products. One ecosystem. No duplication.
            </h2>
            <p className="text-muted-foreground">
              TenXRole helps professionals manage their career path and job search with AI.
              TenXPros helps them become AI-adopted through learning, coaching, certification and
              talent-network access. TenXOps helps organisations redesign work and adopt AI at scale.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6 space-y-2">
                <p className="text-xs uppercase tracking-wider text-accent">For individuals</p>
                <p className="font-semibold text-lg">TenXRole</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  AI-powered career management: career path, professional profile, opportunity radar,
                  applications, networking, interview prep, evidence trail. The career execution engine.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-2">
                <p className="text-xs uppercase tracking-wider text-accent">For individuals</p>
                <p className="font-semibold text-lg">TenXPros</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  AI-adoption service layer: diagnostics, customised learning, coaching,
                  evidence-based certification, prompt packs, and a curated talent network that
                  introduces certified professionals to organisations.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-2">
                <p className="text-xs uppercase tracking-wider text-accent">For organisations</p>
                <p className="font-semibold text-lg">TenXOps</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Organisational AI adoption: workflow redesign, task radar, governance, team
                  enablement and the definition of AI-ready roles that fuel demand for TenXPros talent.
                </p>
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground italic">
            TenXRole manages the career journey. TenXPros develops and certifies the professional.
            TenXOps transforms the organisation.
          </p>
        </div>
      </section>

      {/* Two audiences */}
      <section className="border-t border-border bg-muted/30">
        <div className="container py-20 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Badge tone="primary">For Professionals</Badge>
              <CardTitle className="text-2xl mt-3">Get certified, coached, and connected for the AI era.</CardTitle>
              <CardDescription>
                A service layer that turns AI curiosity into evidence-based capability — and
                introduces you to the organisations who need it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Feature icon={ClipboardCheck} text="AI adoption diagnostic with score, strengths, gaps and tailored learning path." />
              <Feature icon={Brain} text="Customised learning, coaching, prompt packs and role-specific AI workflows." />
              <Feature icon={BadgeCheck} text="Five-level evidence-based certification with public verification." />
              <Feature icon={UsersRound} text="Talent-network access: opt-in introductions to vetted organisations." />
              <Feature icon={GitBranch} text="Pairs with TenXRole for the actual career-execution workflow." />
              <Link href="/professionals" className="inline-flex items-center text-sm font-medium text-primary pt-2">
                See the professional path <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Badge tone="accent">For Organisations</Badge>
              <CardTitle className="text-2xl mt-3">
                Find professionals who can actually work with AI.
              </CardTitle>
              <CardDescription>
                TenXPros helps organisations discover, assess, interview and connect with AI-adopted
                professionals who have evidence-backed certification and role-specific AI workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Feature icon={ShieldCheck} text="Verified evidence — not slogans — behind every certificate." />
              <Feature icon={LineChart} text="AI readiness scorecards, role-fit scenarios and interview question generators." />
              <Feature icon={UsersRound} text="Talent relationship management: shortlists, introductions, interview support." />
              <Feature icon={Sparkles} text="Pairs with TenXOps for organisation-wide AI adoption and AI-ready role design." />
              <Link href="/organizations" className="inline-flex items-center text-sm font-medium text-primary pt-2">
                See the employer side <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Why not... */}
      <section className="container py-20">
        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-medium uppercase tracking-wider text-accent">What TenXPros is not</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            We deliberately don't duplicate adjacent products.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3 mt-10">
          <NotCard title="Not a career-execution product">
            TenXRole owns the career path, opportunity radar, application management, networking and
            interview workflows. TenXPros sends signal to TenXRole; it doesn't replace it.
          </NotCard>
          <NotCard title="Not a job board">
            We don't list every job. We curate introductions when a certified professional and a
            verified organisation actually fit.
          </NotCard>
          <NotCard title="Not a generic course platform">
            Lessons exist to support real workflows, evidence and assessments — not to inflate watch time.
          </NotCard>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-card">
        <div className="container py-16 md:py-20 grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Stop saying you "use AI". Start being able to <span className="gradient-text">prove it</span>.
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl">
              Take the AI readiness diagnostic, get a structured report, and start your evidence-based
              certification path today.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/sign-up">
              <Button size="lg">Get started <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline">Talk to us</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof BadgeCheck; text: string }) {
  return (
    <p className="flex gap-2 items-start">
      <Icon className="h-4 w-4 text-accent shrink-0 mt-0.5" />
      <span className="text-muted-foreground">{text}</span>
    </p>
  );
}

function NotCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="font-semibold mb-2">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
      </CardContent>
    </Card>
  );
}
