import { auth } from "@/lib/auth";
import { updateDirectoryProfile } from "@/lib/actions/participant";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export default async function ProfilePage() {
  const session = await auth();
  const profile = await prisma.participantProfile.findUnique({
    where: { userId: session?.user.id ?? "" },
    include: { user: { include: { directoryProfile: true, earnedBadges: { include: { badge: true } } } } },
  });
  if (!profile) throw new Error("Participant profile not found.");
  const directory = profile.user.directoryProfile;

  return (
    <div className="space-y-8">
      <PageHeader title="Profile & Directory Settings" description="Directory publishing is opt-in and mainly intended for certified participants." />
      <Card>
        <form action={updateDirectoryProfile} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Display name">
              <Input name="displayName" defaultValue={directory?.displayName ?? profile.user.name ?? ""} />
            </Field>
            <Field label="Public title">
              <Input name="title" defaultValue={directory?.title ?? ""} />
            </Field>
            <Field label="Domain">
              <Input name="domain" defaultValue={directory?.domain ?? ""} />
            </Field>
            <Field label="Location">
              <Input name="location" defaultValue={directory?.location ?? ""} />
            </Field>
            <Field label="LinkedIn URL">
              <Input name="linkedinUrl" defaultValue={directory?.linkedinUrl ?? ""} />
            </Field>
            <Field label="Website URL">
              <Input name="websiteUrl" defaultValue={directory?.websiteUrl ?? ""} />
            </Field>
          </div>
          <Field label="Bio">
            <Textarea name="bio" defaultValue={directory?.bio ?? ""} />
          </Field>
          <label className="flex gap-3 text-sm text-slate-700">
            <input type="checkbox" name="isPublic" defaultChecked={directory?.isPublic ?? false} />
            Publish directory profile when eligible
          </label>
          <Button type="submit">Save profile</Button>
        </form>
      </Card>
      <Card>
        <h2 className="text-xl font-semibold text-navy-900">Badge visibility</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {profile.user.earnedBadges.map((item) => (
            <div key={item.id} className="rounded-md border border-neutral-200 p-3">
              <p className="font-medium text-navy-900">{item.badge.name}</p>
              <p className="text-sm text-slate-600">{item.isPublic ? "Public" : "Private"}</p>
            </div>
          ))}
          {profile.user.earnedBadges.length === 0 ? <p className="text-sm text-slate-600">No badges earned yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
