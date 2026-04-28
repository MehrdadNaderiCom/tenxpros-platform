import Link from "next/link";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { certificateLevelLabels } from "@/lib/utils";

export const metadata = { title: "Certification" };

const LEVELS = [
  {
    key: "L1_AI_READY",
    summary: "Foundation. Demonstrates baseline AI literacy, risk awareness and the ability to map your tasks to the right work mode.",
    checklist: [
      "Complete the AI readiness diagnostic.",
      "Complete the basic AI literacy module.",
      "Map at least 5 professional tasks.",
      "Classify at least 5 tasks by work mode.",
      "Submit at least 1 evidence artifact.",
      "Complete at least 2 scenario assessments.",
      "Pass the basic risk & privacy awareness check.",
    ],
  },
  {
    key: "L2_AI_ADOPTED",
    summary: "Practitioner. You're using AI responsibly and productively in real role-specific work, with quality control.",
    checklist: [
      "Complete a role-specific learning path.",
      "Map at least 10 professional tasks.",
      "Submit at least 3 evidence artifacts.",
      "Build at least 2 repeatable AI workflows.",
      "Complete at least 4 scenario assessments.",
      "Demonstrate output quality control.",
      "Pass reviewer / admin verification.",
    ],
  },
  {
    key: "L3_AI_AUGMENTED",
    summary: "Specialist. You design multi-step AI tool chains with measurable improvements and credible oversight.",
    checklist: [
      "Submit an advanced workflow chain.",
      "Show measurable productivity / quality improvement evidence.",
      "Complete advanced role-specific scenarios.",
      "Submit an implementation/escalation design for at least 1 task.",
      "Demonstrate risk management and human oversight.",
    ],
  },
  {
    key: "L4_AI_IMPLEMENTER",
    summary: "Implementer. You can take an AI workflow from idea to working pipeline — including escalations, automation handoffs and verification.",
    checklist: [
      "Submit an end-to-end implementation design (handoff to dev/automation).",
      "Show measurable rollout evidence on at least one workflow.",
      "Document risk controls and verification steps.",
      "Demonstrate change-management and adoption coaching.",
    ],
  },
  {
    key: "L5_AI_LEADER",
    summary: "Adoption Lead. You can guide a team's AI adoption, design training, and operate within governance constraints.",
    checklist: [
      "Design a team-level AI adoption plan.",
      "Create enablement / training material.",
      "Complete a governance-aware scenario.",
      "Demonstrate ability to guide others.",
      "Submit adoption leadership evidence.",
    ],
  },
];

export default function CertificationPage() {
  return (
    <>
      <section className="container py-20 max-w-4xl space-y-6">
        <Badge tone="primary"><BadgeCheck className="h-3 w-3" /> TenXPros Certification</Badge>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
          Evidence-based AI adoption certification.
        </h1>
        <p className="text-lg text-muted-foreground">
          Five levels. Every level requires reviewed evidence — not just course completion. Each issued
          certificate has a public verification page and a clear scope.
        </p>
      </section>

      <section className="container pb-20 grid gap-5 lg:grid-cols-2">
        {LEVELS.map((lvl) => (
          <Card key={lvl.key}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-accent font-semibold">
                    {lvl.key.replace("_", " ")}
                  </p>
                  <p className="text-lg font-semibold mt-1">{certificateLevelLabels[lvl.key]}</p>
                </div>
                <BadgeCheck className="h-6 w-6 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground">{lvl.summary}</p>
              <ul className="text-sm space-y-1.5 pt-1">
                {lvl.checklist.map((c) => (
                  <li key={c} className="flex gap-2">
                    <BadgeCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>

      <section id="disclaimer" className="border-t border-border bg-muted/30">
        <div className="container py-12 max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold">Honest scope</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A TenXPros certificate verifies completion and evidence review within the TenXPros framework.
            It does <em>not</em> represent external accreditation unless explicitly stated. We may add accreditation
            partners in future; until then we say what the certificate is — a credible signal backed by
            reviewed evidence — and what it is not.
          </p>
          <Link href="/sign-up"><Button size="lg">Start the path</Button></Link>
        </div>
      </section>
    </>
  );
}
