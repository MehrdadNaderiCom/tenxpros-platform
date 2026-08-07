import { verifyBadge } from "@/lib/services/badges";
import { buildPublicMetadata } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form-fields";
import {
  CredentialVerificationResult,
  InvalidCredentialResult,
} from "@/components/credentials/credential-verification-result";
import { PageHeader } from "@/components/shared/page-shell";

export const dynamic = "force-dynamic";

export const metadata = buildPublicMetadata({
  title: "Verify a Credential",
  description:
    "Check the current status of a TenXPros credential, certificate, or badge using its verification code.",
  path: "/verify",
});

const MAX_VERIFICATION_CODE_LENGTH = 128;

type VerifySearchParams = {
  code?: string | string[];
};

export default async function VerifyCredentialPage({
  searchParams,
}: {
  searchParams?: VerifySearchParams;
}) {
  const codeParam = searchParams?.code;
  const submitted = codeParam !== undefined;
  // Codes currently include both CUID and UUID values. Trim accidental outer
  // whitespace, but otherwise preserve the exact value and its case.
  const code = typeof codeParam === "string" ? codeParam.trim() : "";
  const canLookup = code.length > 0 && code.length <= MAX_VERIFICATION_CODE_LENGTH;
  const record = submitted && canLookup ? await verifyBadge(code) : null;

  return (
    <main className="bg-neutral-50">
      <div className="mx-auto min-h-[70vh] max-w-3xl space-y-8 px-6 py-16 md:px-8 md:py-24">
        <PageHeader
          eyebrow="Public credential check"
          title="Verify a TenXPros credential"
          description="Enter the verification code shown on a TenXPros credential, certificate, or badge to check its current status. Verification never exposes confidential work."
        />

        <Card>
          <form action="/verify" method="GET" className="space-y-3">
            <label htmlFor="credential-code" className="block text-sm font-medium text-slate-900">
              Credential code
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                id="credential-code"
                name="code"
                type="text"
                defaultValue={record ? code : ""}
                maxLength={MAX_VERIFICATION_CODE_LENGTH}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-describedby="credential-code-help"
                aria-invalid={submitted && !record ? true : undefined}
                className="font-mono"
                required
              />
              <Button type="submit" className="w-full sm:w-auto">
                Verify credential
              </Button>
            </div>
            <p id="credential-code-help" className="text-xs leading-5 text-slate-500">
              Enter the complete code exactly as issued. Verification codes are case-sensitive.
            </p>
          </form>
        </Card>

        {submitted ? (
          record ? (
            <CredentialVerificationResult record={record} />
          ) : (
            <InvalidCredentialResult />
          )
        ) : null}
      </div>
    </main>
  );
}
