import Link from "next/link";
import { ArrowRight, Compass, ExternalLink, GitBranch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "TenXRole connection" };

export default function OpportunitiesPage() {
  return (
    <div className="space-y-6">
      <header>
        <Badge tone="primary"><Compass className="h-3 w-3" /> TenXRole connection</Badge>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">Career execution lives in TenXRole</h1>
        <p className="text-muted-foreground max-w-2xl">
          TenXRole is the AI-powered career management product that owns your career path,
          opportunity radar, applications, networking and interview prep. TenXPros sends your AI
          readiness, certificate and prompt-pack signals into TenXRole — it does not duplicate
          career execution here.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-accent" />
              <p className="font-semibold">Connect your TenXRole account</p>
            </div>
            <p className="text-sm text-muted-foreground">
              The TenXRole API is in preparation. Until then, you can sign in to TenXRole and link
              your TenXPros profile, certificate URL and AI readiness score by hand. The bidirectional
              sync will replace this manual step.
            </p>
            <Link href="https://tenxrole.com" target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline">Open TenXRole <ExternalLink className="h-3.5 w-3.5" /></Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="font-semibold">TenXPros → TenXRole (planned)</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>· AI readiness score, strengths and gaps</li>
              <li>· Verified certificate level + public verification URL</li>
              <li>· Work modes mastered and role-specific prompt packs</li>
              <li>· Coaching notes summary (you choose what to share)</li>
              <li>· Talent-network visibility status</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="font-semibold">TenXRole → TenXPros (planned)</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>· Career path goals and target roles</li>
              <li>· Opportunity history and application outcomes</li>
              <li>· Interview feedback and skill-gap signals</li>
              <li>· Market demand patterns from the opportunity radar</li>
              <li>· Networking progress and resume status</li>
            </ul>
            <p className="text-xs text-muted-foreground italic">
              All sync is opt-in and only flows when you authorise it.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="font-semibold">Talent-network introductions</p>
            <p className="text-sm text-muted-foreground">
              Independent of TenXRole, certified TenXPros professionals can opt in to the talent
              network. Verified organisations request shortlists and TenXPros curates introductions
              when there is a real fit. Outcomes are tracked, never guaranteed.
            </p>
            <Link href="/public-profile" className="text-sm text-primary inline-flex items-center gap-1">
              Configure your visibility <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
