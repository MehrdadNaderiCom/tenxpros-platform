import { prisma } from "@/lib/prisma";
import { addHouseAccount, removeHouseAccount } from "@/lib/actions/partner-admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, THead, Th, TBody, TR, Td, TableEmpty } from "@/components/ui/table";
import { Input } from "@/components/ui/form-fields";
import { Field } from "@/components/ui/form-field";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export default async function HouseAccountsPage() {
  const accounts = await prisma.houseAccount.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-8">
      <PageHeader
        title="House Accounts"
        description="Entities that may not be registered by a partner, current and prospective customers, active inbound, and the company's own relationships. Confirmation of a deal registration is blocked when the entity name matches this list."
      />

      <Card>
        <form action={addHouseAccount} className="grid items-end gap-4 md:grid-cols-[2fr_1fr_2fr_auto]">
          <Field label="Entity name">
            <Input name="entityName" placeholder="e.g. Global Bank Ltd" />
          </Field>
          <Field label="Domain" optional>
            <Input name="domain" placeholder="globalbank.com" />
          </Field>
          <Field label="Note" optional>
            <Input name="note" placeholder="Why it's off-limits" />
          </Field>
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <Table minWidth="min-w-[640px]">
        <THead>
          <Th>Entity</Th>
          <Th>Domain</Th>
          <Th>Note</Th>
          <Th>Added</Th>
          <Th className="text-right">Action</Th>
        </THead>
        <TBody>
          {accounts.map((a) => (
            <TR key={a.id}>
              <Td className="font-medium text-navy-900">{a.entityName}</Td>
              <Td className="text-slate-600">{a.domain ?? "-"}</Td>
              <Td className="text-slate-600">{a.note ?? "-"}</Td>
              <Td className="text-slate-600">{a.createdAt.toLocaleDateString()}</Td>
              <Td className="text-right">
                <div className="flex justify-end">
                  <form action={removeHouseAccount}>
                    <input type="hidden" name="houseAccountId" value={a.id} />
                    <Button type="submit" variant="danger" size="sm">
                      Remove
                    </Button>
                  </form>
                </div>
              </Td>
            </TR>
          ))}
          {accounts.length === 0 ? (
            <TableEmpty colSpan={5}>
              No house accounts yet.
            </TableEmpty>
          ) : null}
        </TBody>
      </Table>
    </div>
  );
}
