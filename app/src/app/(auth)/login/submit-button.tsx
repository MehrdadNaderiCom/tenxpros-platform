"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/**
 * Submit button for the login form. Uses the parent form's pending state so that
 * pressing Enter or clicking shows immediate feedback ("Signing in…") and the
 * button is disabled while the server action runs.
 */
export function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}
