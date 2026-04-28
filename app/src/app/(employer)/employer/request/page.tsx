import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Select, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { createRequestAction } from "./actions";

export const metadata = { title: "Request talent" };

export default async function RequestTalentPage({ searchParams }: { searchParams?: { professionalId?: string; saved?: string; err?: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "EMPLOYER") redirect("/sign-in");
  const org = await prisma.organizationProfile.findUnique({
    where: { userId: user.id },
    include: { roleNeeds: { where: { status: "OPEN" } } },
  });
  if (!org) redirect("/employer/organization");

  let pro = null;
  if (searchParams?.professionalId) {
    pro = await prisma.professionalProfile.findUnique({
      where: { id: searchParams.professionalId },
      include: { user: true },
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Request talent</h1>
      <p className="text-muted-foreground text-sm">We review every request and do the intro manually.</p>

      {searchParams?.saved ? <Alert tone="success" title="Request received">We'll review and get back to you.</Alert> : null}
      {searchParams?.err ? <Alert tone="danger" title="Could not send">{decodeURIComponent(searchParams.err)}</Alert> : null}

      {pro ? (
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Requesting intro to:</p>
          <p className="font-semibold">{pro.user.name ?? pro.slug}</p>
          <p className="text-xs text-muted-foreground">{pro.headline ?? ""}</p>
        </CardContent></Card>
      ) : null}

      <Card>
        <CardContent className="p-6">
          <form action={createRequestAction} className="space-y-4">
            {pro ? <input type="hidden" name="professionalId" value={pro.id} /> : null}
            <div>
              <Label htmlFor="kind">Request type</Label>
              <Select id="kind" name="kind" defaultValue={pro ? "intro" : "shortlist"}>
                <option value="intro">Intro to a specific professional</option>
                <option value="shortlist">Shortlist for a role</option>
                <option value="advice">Advisory conversation</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="roleNeedId">Link to a role need (optional)</Label>
              <Select id="roleNeedId" name="roleNeedId" defaultValue="">
                <option value="">—</option>
                {org.roleNeeds.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" name="message" rows={6} required placeholder="Context, expected outcome, start date, budget if relevant." />
            </div>
            <div className="flex justify-end"><Button type="submit">Send request</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
