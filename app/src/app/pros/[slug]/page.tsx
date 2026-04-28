import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/logo";
import { certificateLevelLabels, formatDate, workModeLabels } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Public profile" };

export default async function PublicProProfile({ params }: { params: { slug: string } }) {
  const profile = await prisma.professionalProfile.findUnique({
    where: { slug: params.slug },
    include: {
      user: { select: { name: true } },
      publicProfile: true,
      certificates: { where: { status: "ISSUED" }, orderBy: { issuedAt: "desc" } },
      evidence: {
        where: { OR: [{ visibility: "PUBLIC" }, { visibility: "EMPLOYER_VISIBLE" }] },
        orderBy: { createdAt: "desc" },
        take: 6,
      },
    },
  });
  if (!profile) notFound();
  if (profile.visibility === "PRIVATE" || profile.visibility === "REVIEWERS_ONLY") notFound();

  const pp = profile.publicProfile;
  const showCertificates = pp?.showCertificates ?? true;
  const showEvidence = pp?.showEvidence ?? true;
  const showSkills = pp?.showSkills ?? true;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="container py-4 flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">tenxpros.com</Link>
        </div>
      </header>

      <main className="container py-12 max-w-4xl space-y-6">
        <Card>
          <CardContent className="p-8 space-y-3">
            <Badge tone="primary">AI-Adopted Professional</Badge>
            <h1 className="text-3xl font-semibold tracking-tight">{profile.user.name ?? "Professional"}</h1>
            <p className="text-muted-foreground">{pp?.headline ?? profile.headline ?? ""}</p>
            <div className="text-sm text-muted-foreground space-x-3">
              {profile.currentRole ? <span>{profile.currentRole}</span> : null}
              {profile.location ? <span>· {profile.location}</span> : null}
              {profile.industry ? <span>· {profile.industry}</span> : null}
            </div>
            {pp?.bio ? <p className="text-sm leading-relaxed pt-2 whitespace-pre-wrap">{pp.bio}</p> : null}
            {profile.readinessScore != null ? (
              <p className="text-xs text-muted-foreground">AI readiness score: <span className="font-medium text-foreground">{profile.readinessScore}/100</span></p>
            ) : null}
          </CardContent>
        </Card>

        {showCertificates && profile.certificates.length > 0 ? (
          <Card>
            <CardContent className="p-6 space-y-3">
              <p className="font-semibold">Verified TenXPros certificates</p>
              <ul className="grid gap-3 md:grid-cols-2">
                {profile.certificates.map((c) => (
                  <li key={c.id} className="rounded-md border border-border p-4">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-5 w-5 text-accent" />
                      <p className="font-medium">{certificateLevelLabels[c.level]}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Issued {formatDate(c.issuedAt)} · ID {c.publicId}</p>
                    <Link href={`/verify/${c.publicId}`} className="text-xs text-primary inline-flex items-center gap-1 mt-2">
                      Public verification page <ExternalLink className="h-3 w-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {showSkills ? (
          <Card>
            <CardContent className="p-6 space-y-3">
              <p className="font-semibold">Skills, tools and AI tools</p>
              <Group title="Skills" items={profile.skills} />
              <Group title="Tools" items={profile.tools} />
              <Group title="AI tools" items={profile.aiToolsUsed} />
              {pp?.workModesMastered && pp.workModesMastered.length > 0 ? (
                <Group title="Work modes mastered" items={pp.workModesMastered.map((w) => workModeLabels[w])} />
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {showEvidence && profile.evidence.length > 0 ? (
          <Card>
            <CardContent className="p-6 space-y-3">
              <p className="font-semibold">Evidence highlights</p>
              <ul className="grid gap-3 md:grid-cols-2">
                {profile.evidence.map((e) => (
                  <li key={e.id} className="rounded-md border border-border p-4">
                    <Badge tone="accent">{e.type.replace(/_/g, " ").toLowerCase()}</Badge>
                    <p className="font-medium mt-2">{e.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-3 mt-1">{e.description}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="p-6 text-xs text-muted-foreground">
            Verified through the TenXPros framework. <Link href="/" className="text-primary">Learn more</Link>.
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Group({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => <Badge key={s} tone="muted">{s}</Badge>)}
      </div>
    </div>
  );
}
