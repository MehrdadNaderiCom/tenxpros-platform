import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/authz";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, TBody, TR, Td } from "@/components/ui/table";
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
      <Table minWidth="min-w-[760px]">
        <THead>
          <Th>User</Th>
          <Th>Role</Th>
          {canManage ? <Th className="text-right">View</Th> : null}
          <Th className="text-right">Manage</Th>
        </THead>
        <TBody>
          {users.map((user) => (
            <TR key={user.id}>
              <Td>
                <Link href={`/admin/users/${user.id}`} className="font-medium text-navy-900 hover:underline">
                  {user.name ?? user.email}
                </Link>
                <p className="text-xs text-slate-500">{user.email}</p>
              </Td>
              <Td>
                <Badge>{user.role}</Badge>
              </Td>
              {canManage ? (
                <Td className="text-right">
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
                </Td>
              ) : null}
              <Td className="text-right">
                <Link href={`/admin/users/${user.id}`} className="font-medium text-navy-600 hover:underline">
                  {canManage ? "Manage" : "View"}
                </Link>
              </Td>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
