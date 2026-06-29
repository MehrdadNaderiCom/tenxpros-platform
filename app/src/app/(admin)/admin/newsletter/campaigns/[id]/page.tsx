import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

// Style the stored campaign HTML for the preview (pure Tailwind, no plugin).
const NL_HTML =
  "[&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-navy-900 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-navy-900 [&_p]:my-2 [&_p]:text-sm [&_p]:leading-7 [&_p]:text-slate-700 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:text-sm [&_li]:text-slate-700 [&_a]:text-navy-600 [&_a]:underline [&_strong]:text-navy-900";

export default async function CampaignHistoryPage({ params }: { params: { id: string } }) {
  const campaign = await prisma.newsletterCampaign.findUnique({
    where: { id: params.id },
    include: { deliveries: { orderBy: { createdAt: "asc" }, include: { subscriber: { select: { status: true } } } } },
  });
  if (!campaign) notFound();

  const sentOk = campaign.deliveries.filter((d) => d.status === "sent").length;
  const failed = campaign.deliveries.filter((d) => d.status !== "sent").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title={campaign.subject} description="Send history for this campaign: who it was sent to, when, and the delivery result." />
        <ButtonLink href="/admin/newsletter" variant="secondary" size="sm">Back to campaigns</ButtonLink>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Status", campaign.status === "sent" ? "Sent" : "Draft"],
          ["Recipients", String(campaign.recipientCount)],
          ["Delivered", String(sentOk)],
          ["Failed", String(failed)],
        ].map(([label, value]) => (
          <Card key={label} className="text-center">
            <p className="text-2xl font-semibold text-navy-900">{value}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          </Card>
        ))}
      </div>

      {campaign.sentAt ? (
        <p className="text-sm text-slate-600">Sent {campaign.sentAt.toLocaleString()} from the newsletter mailbox.</p>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold text-navy-900">Message</h2>
        <div className={`mt-3 ${NL_HTML}`} dangerouslySetInnerHTML={{ __html: campaign.bodyHtml }} />
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-navy-900 text-left text-white">
            <tr>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Sent at</th>
              <th className="px-4 py-3">Current status</th>
            </tr>
          </thead>
          <tbody>
            {campaign.deliveries.map((d) => (
              <tr key={d.id} className="border-b border-neutral-100">
                <td className="px-4 py-3 text-navy-900">{d.email}</td>
                <td className="px-4 py-3">
                  <Badge status={d.status === "sent" ? "PASSED" : "NOT_COMPLETED"}>{d.status === "sent" ? "Delivered" : "Failed"}</Badge>
                  {d.error ? <span className="ml-2 text-xs text-red-600">{d.error}</span> : null}
                </td>
                <td className="px-4 py-3 text-slate-600">{d.sentAt ? d.sentAt.toLocaleString() : "Not sent"}</td>
                <td className="px-4 py-3 text-slate-500">{d.subscriber ? d.subscriber.status : "removed"}</td>
              </tr>
            ))}
            {campaign.deliveries.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">No deliveries recorded.</td></tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
