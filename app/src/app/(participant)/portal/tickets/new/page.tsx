import { createTicket } from "@/lib/actions/participant";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/shared/page-shell";

export default function NewTicketPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="New Ticket" description="Fair-use support is designed for substantive program questions." />
      <Card>
        <form action={createTicket} className="space-y-4">
          <Field label="Subject">
            <Input name="subject" required minLength={5} />
          </Field>
          <Field label="Category">
            <Select name="category" defaultValue="MODULE_QUESTION" required>
              <option value="MODULE_QUESTION">Module question</option>
              <option value="DOSSIER_HELP">Dossier help</option>
              <option value="AI_SUITABILITY">AI suitability</option>
              <option value="EVIDENCE">Evidence</option>
              <option value="WORKFLOW">Workflow</option>
              <option value="FORESIGHT">Foresight</option>
              <option value="CAPSTONE">Capstone</option>
              <option value="TECHNICAL">Technical</option>
              <option value="OTHER">Other</option>
            </Select>
          </Field>
          <Field label="Message">
            <Textarea name="body" required minLength={20} />
          </Field>
          <Button type="submit">Create ticket</Button>
        </form>
      </Card>
    </div>
  );
}
