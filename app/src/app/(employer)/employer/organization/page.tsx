import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { saveOrgAction } from "./actions";

export const metadata = { title: "Organisation profile" };

export default async function OrgProfilePage({ searchParams }: { searchParams?: { saved?: string; err?: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "EMPLOYER") redirect("/sign-in");
  const org = await prisma.organizationProfile.findUnique({ where: { userId: user.id } });
  if (!org) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <header>
        <Badge tone="primary"><Building2 className="h-3 w-3" /> Organisation</Badge>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">Organisation profile</h1>
        <p className="text-muted-foreground">Professionals and admins see this when you request talent.</p>
      </header>

      {searchParams?.saved ? <Alert tone="success" title="Saved">Changes are live for the review team.</Alert> : null}
      {searchParams?.err ? <Alert tone="danger" title="Could not save">{decodeURIComponent(searchParams.err)}</Alert> : null}

      <Card>
        <CardContent className="p-6">
          <form action={saveOrgAction} className="grid md:grid-cols-2 gap-4">
            <div><Label htmlFor="name">Name</Label><Input id="name" name="name" defaultValue={org.name} required /></div>
            <div><Label htmlFor="website">Website</Label><Input id="website" name="website" type="url" defaultValue={org.website ?? ""} /></div>
            <div><Label htmlFor="industry">Industry</Label><Input id="industry" name="industry" defaultValue={org.industry ?? ""} /></div>
            <div><Label htmlFor="size">Size</Label><Input id="size" name="size" defaultValue={org.size ?? ""} placeholder="e.g. 50-200" /></div>
            <div><Label htmlFor="location">Location</Label><Input id="location" name="location" defaultValue={org.location ?? ""} /></div>
            <div><Label htmlFor="contactEmail">Contact email</Label><Input id="contactEmail" name="contactEmail" type="email" defaultValue={org.contactEmail ?? ""} /></div>
            <div><Label htmlFor="contactName">Contact name</Label><Input id="contactName" name="contactName" defaultValue={org.contactName ?? ""} /></div>
            <div className="md:col-span-2"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={4} defaultValue={org.description ?? ""} /></div>
            <div className="md:col-span-2 flex justify-end"><Button type="submit">Save organisation</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card><CardContent className="p-6 text-xs text-muted-foreground">
        <p className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Verification status: <Badge tone={org.verified ? "success" : "warning"}>{org.verified ? "verified" : "pending"}</Badge> — TenXPros verifies employers manually before unlocking full candidate view.</p>
      </CardContent></Card>
    </div>
  );
}
