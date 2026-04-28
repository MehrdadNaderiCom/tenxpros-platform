import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Label, FieldHint } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { savePublicProfileAction } from "./actions";

export const metadata = { title: "Public profile" };

export default async function PublicProfileSettingsPage({ searchParams }: { searchParams?: { saved?: string; err?: string } }) {
  const user = await getCurrentUser();
  if (!user || !user.professionalId) redirect("/sign-in");
  const profile = await prisma.professionalProfile.findUnique({
    where: { id: user.professionalId },
    include: { publicProfile: true },
  });
  if (!profile) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <header>
        <Badge tone="primary"><Sparkles className="h-3 w-3" /> Showcase</Badge>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">Public professional profile</h1>
        <p className="text-muted-foreground">
          Your shareable URL: <Link href={`/pros/${profile.slug}`} className="text-primary inline-flex items-center gap-1" target="_blank">
            /pros/{profile.slug} <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </p>
      </header>

      {searchParams?.saved ? <Alert tone="success" title="Public profile updated">Live for visitors and verified employers.</Alert> : null}
      {searchParams?.err ? <Alert tone="danger" title="Could not save">{decodeURIComponent(searchParams.err)}</Alert> : null}

      <Card>
        <CardContent className="p-6">
          <form action={savePublicProfileAction} className="space-y-4">
            <div>
              <Label htmlFor="headline">Public headline</Label>
              <Input id="headline" name="headline" defaultValue={profile.publicProfile?.headline ?? profile.headline ?? ""} />
            </div>
            <div>
              <Label htmlFor="bio">Public bio</Label>
              <Textarea id="bio" name="bio" rows={5} defaultValue={profile.publicProfile?.bio ?? ""} placeholder="A short, honest bio for visitors and verified employers." />
              <FieldHint>Plain text. Avoid sensitive client or company details.</FieldHint>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <Toggle name="showCertificates" label="Show certificates" defaultChecked={profile.publicProfile?.showCertificates ?? true} />
              <Toggle name="showEvidence" label="Show employer-visible evidence" defaultChecked={profile.publicProfile?.showEvidence ?? true} />
              <Toggle name="showSkills" label="Show skills and AI tools" defaultChecked={profile.publicProfile?.showSkills ?? true} />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Save public profile</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 text-xs text-muted-foreground">
          Even when public, evidence stays private unless you mark each artifact as employer-visible or public.
        </CardContent>
      </Card>
    </div>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" />
      <span>{label}</span>
    </label>
  );
}
