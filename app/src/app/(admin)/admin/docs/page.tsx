import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Admin docs" };

export default function AdminDocsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Admin docs · operating notes</h1>

      <Card><CardContent className="p-6 prose prose-sm max-w-none space-y-3">
        <p><strong>Certification discipline.</strong> Never issue a certificate without reviewing at least the approved evidence, the latest diagnostic and one scenario submission. Eligibility is a prerequisite, not a green light.</p>
        <p><strong>Evidence review.</strong> Grade for role relevance, clarity, risk awareness and realistic AI use. If a submission is good but generic, ask for a role-specific rework — do not approve by default.</p>
        <p><strong>AI runs.</strong> All LLM-assisted outputs (diagnostic reports, task classifications, scenario recommendations) are logged with prompt, output, cost and status. Human review is required before any public-facing content.</p>
        <p><strong>Employer requests.</strong> Organisations see only profiles that have opted in and meet minimum bar (L1 + reviewer-approved evidence). No bulk exports without explicit opt-in.</p>
        <p><strong>Data handling.</strong> Evidence should not contain confidential client content. If it does, reject with notes, log it, and ask for sanitised resubmission.</p>
        <p><strong>Revocation.</strong> A revocation is permanent. Always log the reason; the public verification page will show it.</p>
      </CardContent></Card>
    </div>
  );
}
