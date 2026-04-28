import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Pricing — Founding Cohort" };

export default function PricingPage() {
  return (
    <>
      <section className="container py-20 max-w-4xl space-y-6">
        <Badge tone="primary"><Sparkles className="h-3 w-3" /> Founding cohort</Badge>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
          Pricing built for the people who actually do the work.
        </h1>
        <p className="text-lg text-muted-foreground">
          We're enrolling a small founding cohort. You get the full lifecycle — diagnostic, learning,
          scenarios, evidence review and certification — at founding pricing while we co-design the
          platform with you.
        </p>
      </section>

      <section className="container pb-20 grid gap-5 md:grid-cols-3">
        <Tier
          name="Diagnostic"
          price="Free"
          tag="Always"
          features={[
            "Full AI readiness diagnostic",
            "Structured readiness report",
            "Recommended track and certificate level",
            "Personal Task Radar (limited)",
          ]}
          cta="Start free"
          href="/sign-up"
        />
        <Tier
          name="Founding Professional"
          price="$29/mo"
          tag="Popular"
          highlighted
          features={[
            "All learning tracks and lessons",
            "Unlimited Task Radar entries",
            "Scenario assessments and rubric feedback",
            "Evidence Vault with reviewer feedback",
            "L1 + L2 certificate eligibility",
            "Public profile and verification page",
          ]}
          cta="Join the cohort"
          href="/sign-up"
        />
        <Tier
          name="Organization"
          price="Talk to us"
          tag="For employers"
          features={[
            "Organisation profile and role needs",
            "Curated AI-ready candidate shortlists",
            "Interview question generators",
            "AI readiness scorecards",
            "Pairs with TenXOps for team adoption",
          ]}
          cta="Contact us"
          href="/contact"
        />
      </section>
    </>
  );
}

function Tier({
  name, price, tag, features, cta, href, highlighted = false,
}: {
  name: string; price: string; tag: string; features: string[]; cta: string; href: string; highlighted?: boolean;
}) {
  return (
    <Card className={highlighted ? "border-primary ring-2 ring-primary/20" : ""}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{name}</p>
          <Badge tone={highlighted ? "primary" : "muted"}>{tag}</Badge>
        </div>
        <p className="text-3xl font-semibold tracking-tight">{price}</p>
        <ul className="space-y-2 text-sm">
          {features.map((f) => (
            <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" /> <span>{f}</span></li>
          ))}
        </ul>
        <Link href={href}><Button className="w-full" variant={highlighted ? "primary" : "outline"}>{cta}</Button></Link>
      </CardContent>
    </Card>
  );
}
