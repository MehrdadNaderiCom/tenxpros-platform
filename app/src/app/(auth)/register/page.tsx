import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Register",
};

export default function RegisterPage() {
  return (
    <Card className="space-y-5 text-center">
      <h1 className="text-2xl font-semibold text-navy-900">Registration starts with application</h1>
      <p className="text-sm leading-6 text-slate-600">
        TenXPros is selective. Participant accounts are created after admission and manual enrollment.
      </p>
      <ButtonLink href="/apply" className="w-full">
        Start application
      </ButtonLink>
    </Card>
  );
}
