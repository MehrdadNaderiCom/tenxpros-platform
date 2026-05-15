import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function AdminModulesPage() {
  const modules = await prisma.module.findMany({ orderBy: [{ number: "asc" }, { version: "desc" }] });
  return (
    <div className="space-y-8">
      <PageHeader title="Module Library" description="Manage launch module content and versioned materials." />
      <div className="grid gap-4">
        {modules.map((module) => (
          <Card key={module.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Link href={`/admin/modules/${module.id}`} className="text-xl font-semibold text-navy-900">
                Module {module.number}: {module.title}
              </Link>
              <p className="mt-1 text-sm text-slate-600">{module.coreQuestion}</p>
            </div>
            <Badge>{module.phase} v{module.version}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
