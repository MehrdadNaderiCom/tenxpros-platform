import Link from "next/link";
import { ArrowRight, BadgeCheck, Brain, ClipboardCheck, FileCheck, GitBranch, Sparkles, Target, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "For Professionals" };

const SECTIONS = [
  {
    icon: ClipboardCheck,
    title: "AI Adoption Diagnostic",
    body: "Structured diagnostic across literacy, prompting, automation awareness, output evaluation, risk, role-specific use and professional communication. You leave with a score, strengths, gaps and a tailored next-step plan.",
  },
  {
    icon: Brain,
    title: "Customised Learning & Coaching",
    body: "Tracks, modules and prompt packs tailored to your role and current AI maturity — for PMs, trainers, consultants, HR, BAs, founders and more. Optional reviewer-led coaching when needed.",
  },
  {
    icon: Workflow,
    title: "Personal Task Radar",
    body: "Map your real recurring work. The platform recommends a work mode for each task: human-led, AI-assisted, rules-based, fully automated, AI tool chain, escalate or not suitable for AI.",
  },
  {
    icon: Target,
    title: "Scenario-Based Assessment",
    body: "Real-world scenarios with weighted rubrics — not multiple-choice quizzes. You design steps, choose tools, justify a work mode, and explain your risk controls and review process.",
  },
  {
    icon: FileCheck,
    title: "Evidence Vault & Review",
    body: "Submit before/after artifacts, prompt chains, workflows, automation designs and decision logs. Human reviewers verify them. You control what is visible to whom.",
  },
  {
    icon: BadgeCheck,
    title: "Evidence-Based Certification",
    body: "Five levels, from AI-Ready Foundation to AI Adoption Lead. Certificates are issued only after evidence review by accountable people — never by quiz score alone — with a public verification page.",
  },
];

export default function ProfessionalsPage() {
  return (
    <>
      <section className="container py-20 max-w-4xl space-y-6">
        <Badge tone="primary"><Sparkles className="h-3 w-3" /> For Professionals</Badge>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
          Get certified, coached, and connected for the <span className="gradient-text">AI era</span>.
        </h1>
        <p className="text-lg text-muted-foreground">
          TenXPros is the service layer: diagnostics, customised learning, coaching, evidence-based
          certification, and curated introductions to organisations seeking AI-ready talent. For the
          career path and job search itself, TenXPros connects to{" "}
          <span className="text-foreground font-medium">TenXRole</span>.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/sign-up"><Button size="lg">Start your diagnostic <ArrowRight className="h-4 w-4" /></Button></Link>
          <Link href="/learning-system"><Button size="lg" variant="outline">Browse learning tracks</Button></Link>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="container py-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <Card key={s.title}>
              <CardContent className="p-6 space-y-3">
                <s.icon className="h-5 w-5 text-accent" />
                <p className="font-semibold">{s.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container py-20 grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6 space-y-3">
            <GitBranch className="h-5 w-5 text-accent" />
            <p className="font-semibold">TenXRole powers your career execution</p>
            <p className="text-sm text-muted-foreground">
              TenXRole is the AI-powered career management product that owns your career path,
              opportunity radar, application workflow, networking and interview prep. TenXPros sends
              your AI readiness, certificate and prompt-pack signals into TenXRole so they reinforce
              your job search — without duplicating it.
            </p>
            <Link href="/about" className="inline-flex items-center text-sm font-medium text-primary">
              How TenXPros and TenXRole connect <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-3">
            <BadgeCheck className="h-5 w-5 text-accent" />
            <p className="font-semibold">Talent-network introductions</p>
            <p className="text-sm text-muted-foreground">
              Once your certificate is issued, you can opt in to the TenXPros talent network.
              Verified organisations request shortlists; TenXPros curates introductions when there is
              an actual fit. We never auto-screen, auto-reject or guarantee outcomes.
            </p>
            <Link href="/organizations" className="inline-flex items-center text-sm font-medium text-primary">
              How organisations engage <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
