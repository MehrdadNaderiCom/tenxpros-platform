import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="space-y-8">
      <PageHeader title="Users" description="User and coach management launch view." />
      <div className="grid gap-3">
        {users.map((user) => (
          <Card key={user.id} className="flex items-center justify-between">
            <Link href={`/admin/users/${user.id}`} className="font-medium text-navy-900">{user.name ?? user.email}</Link>
            <Badge>{user.role}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
