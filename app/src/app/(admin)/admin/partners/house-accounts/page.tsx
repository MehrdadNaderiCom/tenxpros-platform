import { prisma } from "@/lib/prisma";
import { addHouseAccount, removeHouseAccount } from "@/lib/actions/partner-admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="bg-navy-900 text-left text-white">
            <tr>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Domain</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a, i) => (
              <tr key={a.id} className={i % 2 ? "bg-neutral-50" : "bg-white"}>
                <td className="px-4 py-3 font-medium text-navy-900">{a.entityName}</td>
                <td className="px-4 py-3 text-slate-600">{a.domain ?? ", "}</td>
                <td className="px-4 py-3 text-slate-600">{a.note ?? ", "}</td>
                <td className="px-4 py-3 text-slate-600">{a.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <form action={removeHouseAccount}>
                    <input type="hidden" name="houseAccountId" value={a.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Remove
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
            {accounts.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>
                  No house accounts yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
