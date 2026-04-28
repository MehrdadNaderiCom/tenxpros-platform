import { contactAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Select, Label, FieldHint } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Contact" };

export default function ContactPage({ searchParams }: { searchParams?: { sent?: string } }) {
  const sent = searchParams?.sent === "1";
  return (
    <>
      <section className="container py-20 max-w-3xl space-y-6">
        <Badge tone="primary">Contact</Badge>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
          Talk to us.
        </h1>
        <p className="text-lg text-muted-foreground">
          Founding professionals, partner organisations, accreditation bodies, press — we read every message.
        </p>
      </section>

      <section className="container pb-20 max-w-2xl">
        <Card>
          <CardContent className="p-6">
            {sent ? (
              <div className="rounded-md border border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/10 p-4 text-sm">
                Thanks — your message was received. We&apos;ll be in touch.
              </div>
            ) : (
              <form action={contactAction} className="space-y-4">
                <div>
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div>
                  <Label htmlFor="organization">Organization (optional)</Label>
                  <Input id="organization" name="organization" />
                </div>
                <div>
                  <Label htmlFor="intent">Intent</Label>
                  <Select id="intent" name="intent" defaultValue="professional">
                    <option value="professional">I'm a professional</option>
                    <option value="employer">I represent an organisation</option>
                    <option value="partnership">Partnership / accreditation</option>
                    <option value="press">Press</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" name="message" rows={6} required />
                  <FieldHint>Plain text. Avoid sensitive data — we only need enough to start a conversation.</FieldHint>
                </div>
                <Button type="submit">Send message</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
