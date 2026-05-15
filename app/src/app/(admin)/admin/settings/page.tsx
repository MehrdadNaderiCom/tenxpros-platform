import { updateAdminSetting } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export default async function SettingsPage() {
  const settings = await prisma.adminSetting.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] });
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Site-wide settings and feature flags." />
      <div className="grid gap-4">
        {settings.map((setting) => (
          <Card key={setting.id}>
            <form action={updateAdminSetting} className="grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end">
              <div>
                <p className="font-medium text-navy-900">{setting.label ?? setting.key}</p>
                <p className="text-xs text-slate-500">{setting.category} · {setting.key}</p>
              </div>
              <input type="hidden" name="key" value={setting.key} />
              <Input name="value" defaultValue={setting.value} />
              <Button type="submit">Save</Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
