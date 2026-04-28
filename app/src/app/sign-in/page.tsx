import Link from "next/link";
import { signInAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Logo } from "@/components/brand/logo";
import { Alert } from "@/components/ui/alert";

export const metadata = { title: "Sign in" };

export default function SignInPage({ searchParams }: { searchParams?: { err?: string } }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-border bg-muted/40">
        <Logo />
        <div className="space-y-4 max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight">Welcome back.</h2>
          <p className="text-muted-foreground">
            Pick up your readiness path, your task radar, your scenarios, your evidence and your certification progress.
          </p>
        </div>
        <span />
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-5">
            <div className="lg:hidden mb-2"><Logo /></div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
              <p className="text-sm text-muted-foreground mt-1">
                New here? <Link href="/sign-up" className="text-primary font-medium">Create an account</Link>.
              </p>
            </div>
            {searchParams?.err ? <Alert tone="danger" title="Could not sign in">{decodeURIComponent(searchParams.err)}</Alert> : null}
            <form action={signInAction} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full" size="lg">Sign in</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
