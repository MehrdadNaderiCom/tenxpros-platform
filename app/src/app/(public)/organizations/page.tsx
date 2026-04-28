import Link from "next/link";
import { ArrowRight, Building2, ClipboardList, FileSearch, MessageSquare, ScrollText, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "For Organizations" };

const PILLARS = [
  { icon: FileSearch, title: "Verified evidence", body: "Every TenXPros certificate is backed by reviewed evidence — workflows, prompts, decision logs, artifacts — not just quiz scores." },
  { icon: ClipboardList, title: "Role-fit assessments", body: "Generate role-specific AI scenario tasks and interview questions to evaluate whether a candidate can actually do the work." },
  { icon: Users, title: "Talent relationship management", body: "Talent pool, candidate shortlists, introduction requests, interview support and structured status tracking from discovery to hire." },
  { icon: ShieldCheck, title: "Advisory matching", body: "We provide shortlists and scorecards. Hiring decisions remain human, by design. We never auto-reject or auto-accept candidates and we never guarantee outcomes." },
  { icon: ScrollText, title: "AI readiness scorecards", body: "A clear, structured view of how a candidate decides whether work should be human-led, AI-assisted, rules-based or escalated — per role and per task." },
  { icon: MessageSquare, title: "Interview & assessment support", body: "Optional reviewer-led support for AI-enabled roles, plus team-wide AI readiness assessment via TenXOps." },
];

export default function OrganizationsPage() {
  return (
    <>
      <section className="container py-20 max-w-4xl space-y-6">
        <Badge tone="accent"><Building2 className="h-3 w-3" /> For Organizations</Badge>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
          Find professionals who can actually <span className="gradient-text">work with AI</span>.
        </h1>
        <p className="text-lg text-muted-foreground">
          TenXPros helps organisations discover, assess, interview and connect with AI-adopted
          professionals who have evidence-backed certification and role-specific AI workflows. Every
          claim is backed by evidence reviewed by a human; no automated screening, no automated
          rejection, no employment guarantees.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/sign-up?intent=employer"><Button size="lg">Create an organisation account <ArrowRight className="h-4 w-4" /></Button></Link>
          <Link href="/contact"><Button size="lg" variant="outline">Talk to us</Button></Link>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="container py-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <Card key={p.title}>
              <CardContent className="p-6 space-y-3">
                <p.icon className="h-5 w-5 text-accent" />
                <p className="font-semibold">{p.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container py-16 max-w-3xl space-y-4">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Our promise to candidates and employers</h2>
        <ul className="space-y-3 text-sm leading-relaxed">
          <li>· No automated rejection or scoring decides hiring outcomes.</li>
          <li>· Candidates control which evidence is visible to which audience.</li>
          <li>· Reviewers are accountable people, with audit-logged decisions.</li>
          <li>· AI-generated summaries are clearly marked and editable by reviewers.</li>
          <li>· Certificates state what they verify — not "international accreditation" — and link to a public verification page.</li>
        </ul>
      </section>
    </>
  );
}
