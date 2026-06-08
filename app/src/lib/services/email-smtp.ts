/**
 * Pure, dependency-free email helpers (no prisma, no network) so they can be
 * unit-tested in isolation. Secrets are read from the passed env only and are
 * never logged or included in thrown error messages.
 */

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
};

/** Mask a recipient to domain-only for safe server-side logging. */
export function redactRecipient(to: string): string {
  const at = to.lastIndexOf("@");
  return at > 0 ? `***@${to.slice(at + 1)}` : "***";
}

/**
 * Build SMTP transport config from environment. Throws a clear, secret-free
 * error when required values are missing. The password is only read here and is
 * never included in thrown error messages or logs.
 */
export function resolveSmtpConfig(
  env: Record<string, string | undefined> = process.env,
): SmtpConfig {
  const host = env.SMTP_HOST;
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASSWORD;

  const missing = [!host && "SMTP_HOST", !user && "SMTP_USER", !pass && "SMTP_PASSWORD"].filter(
    Boolean,
  );
  if (missing.length > 0) {
    throw new Error(`SMTP is selected but configuration is incomplete: missing ${missing.join(", ")}.`);
  }

  const parsedPort = Number(env.SMTP_PORT ?? "465");
  return {
    host: host as string,
    port: Number.isFinite(parsedPort) ? parsedPort : 465,
    secure: (env.SMTP_SECURE ?? "true").toLowerCase() !== "false",
    auth: { user: user as string, pass: pass as string },
  };
}

/**
 * Run an email-delivery function without ever throwing. On failure it logs a
 * concise, redacted warning (template + domain-only recipient + message) and
 * returns a result object, so email failures never break application intake or
 * admin/status flows. Never logs secrets.
 */
export async function safeRun(
  context: { template: string; to: string },
  run: () => Promise<void>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await run();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[email:failed] template=${context.template} to=${redactRecipient(context.to)} error=${message}`,
    );
    return { ok: false, error: message };
  }
}
