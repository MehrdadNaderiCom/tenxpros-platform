import Link from "next/link";
import { signUpAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Logo } from "@/components/brand/logo";
import { Alert } from "@/components/ui/alert";

export const metadata = { title: "Create your account" };

export default function SignUpPage({ searchParams }: { searchParams?: { intent?: string; err?: string } }) {
  const intent = searchParams?.intent === "employer" ? "employer" : "professional";
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-border bg-muted/40">
        <Logo />
        <div className="space-y-4 max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight">An evidence-based path, not a course library.</h2>
          <p className="text-muted-foreground">
            You'll diagnose your AI readiness, map your real work, complete scenarios, submit evidence,
            and earn a verified certificate organisations can trust.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          By creating an account you agree to use AI tools responsibly and to keep sensitive client and
          employer data out of public evidence.
        </p>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-5">
            <div className="lg:hidden mb-2"><Logo /></div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Create your TenXPros account</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Already have one? <Link href="/sign-in" className="text-primary font-medium">Sign in</Link>.
              </p>
            </div>
            {searchParams?.err ? <Alert tone="danger" title="Could not create account">{decodeURIComponent(searchParams.err)}</Alert> : null}
            <form action={signUpAction} className="space-y-4">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" name="name" required autoComplete="name" />
              </div>
              <div>
                <Label htmlFor="email">Work email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
              </div>
              <div>
                <Label htmlFor="intent">I am</Label>
                <Select id="intent" name="intent" defaultValue={intent}>
                  <option value="professional">An individual professional</option>
                  <option value="employer">An organisation / employer</option>
                </Select>
              </div>
              <Button type="submit" className="w-full" size="lg">Create account</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
