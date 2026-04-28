import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { setEmployerRequestStatusAction } from "./actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Employer requests" };

export default async function AdminEmployerRequestsPage() {
  const requests = await prisma.employerRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { organization: { include: { user: true } }, roleNeed: true },
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Employer requests</h1>
      <p className="text-muted-foreground text-sm">Qualify, match and close employer talent requests.</p>

      <div className="grid gap-4 md:grid-cols-2">
        {requests.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <Badge tone={r.status === "NEW" ? "warning" : r.status === "IN_REVIEW" ? "primary" : r.status === "FULFILLED" ? "success" : "muted"}>
                  {r.status.toLowerCase().replace("_", " ")}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
              </div>
              <p className="font-semibold">{r.organization.name}</p>
              <p className="text-sm text-muted-foreground">
                Contact: {r.organization.user.name ?? r.organization.user.email}
              </p>
              {r.roleNeed ? <p className="text-xs text-muted-foreground">Role: {r.roleNeed.title}</p> : null}
              {r.message ? <p className="text-sm whitespace-pre-wrap line-clamp-3">{r.message}</p> : null}

              <form action={setEmployerRequestStatusAction.bind(null, r.id)} className="flex gap-2 pt-2">
                <select name="status" defaultValue={r.status} className="flex-1 h-9 rounded-md border border-border bg-card px-2 text-xs">
                  <option value="NEW">New</option>
                  <option value="IN_REVIEW">In review</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="FULFILLED">Fulfilled</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <Button size="sm" variant="outline" type="submit">Update</Button>
              </form>
            </CardContent>
          </Card>
        ))}
        {requests.length === 0 ? <p className="text-sm text-muted-foreground">No requests yet.</p> : null}
      </div>
    </div>
  );
}
