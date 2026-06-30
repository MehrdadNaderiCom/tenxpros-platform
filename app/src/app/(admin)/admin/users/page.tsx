import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/authz";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [users, session] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { partner: { select: { id: true } }, participantProfile: { select: { id: true } } },
    }),
    auth(),
  ]);
  const canManage = isSuperAdmin(session?.user?.email);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users"
        description={
          canManage
            ? "Every account. Open a user to edit or delete it, or open a partner / participant view read-only."
            : "Every account."
        }
      />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-navy-900 text-left text-white">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              {canManage ? <th className="px-4 py-3 text-right">View</th> : null}
              <th className="px-4 py-3 text-right">Manage</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr key={user.id} className={i % 2 ? "bg-neutral-50" : "bg-white"}>
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${user.id}`} className="font-medium text-navy-900 hover:underline">
                    {user.name ?? user.email}
                  </Link>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge>{user.role}</Badge>
                </td>
                {canManage ? (
                  <td className="px-4 py-3 text-right">
                    {user.partner ? (
                      <a
                        href={`/admin/impersonate/partner/${user.partner.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-slate-500 hover:text-navy-700 hover:underline"
                      >
                        Open panel
                      </a>
                    ) : user.participantProfile ? (
                      <a
                        href={`/admin/impersonate/participant/${user.participantProfile.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-slate-500 hover:text-navy-700 hover:underline"
                      >
                        Open portal
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">, </span>
                    )}
                  </td>
                ) : null}
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/users/${user.id}`} className="font-medium text-navy-600 hover:underline">
                    {canManage ? "Manage" : "View"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
