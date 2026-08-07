/**
 * Per-request Content Security Policy primitives.
 *
 * Next.js emits inline bootstrap/RSC scripts, so production pages use a fresh
 * nonce rather than allowing every inline script. Keep this module free of
 * Node-only APIs: middleware executes it in the Edge runtime.
 */

const FRAME_SOURCES = [
  "'self'",
  "https://www.youtube-nocookie.com",
  "https://player.vimeo.com",
  "https://www.loom.com",
  "https://docs.google.com",
  "https://drive.google.com",
] as const;

const VALID_NONCE = /^[A-Za-z0-9+/_=-]+$/;

export type ContentSecurityPolicyOptions = {
  development?: boolean;
  upgradeInsecureRequests?: boolean;
};

/** Generate a CSP-safe nonce with 122 bits of Web Crypto entropy. */
export function generateContentSecurityPolicyNonce(): string {
  return globalThis.crypto.randomUUID().replaceAll("-", "");
}

/** Build the exact policy sent on the request and response for one render. */
export function buildContentSecurityPolicy(
  nonce: string,
  options: ContentSecurityPolicyOptions = {},
): string {
  if (!VALID_NONCE.test(nonce)) {
    throw new Error("Content Security Policy nonce contains invalid characters.");
  }

  const development = options.development === true;
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    // Existing React style attributes require inline styles. Scripts remain
    // nonce-only; this exception does not make inline JavaScript executable.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Admin-authored lesson/newsletter images intentionally accept arbitrary
    // HTTPS URLs, so an enumerated image-host list would break that feature.
    "img-src 'self' data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self'",
    "media-src 'self'",
    `frame-src ${FRAME_SOURCES.join(" ")}`,
    "worker-src 'self'",
    "manifest-src 'self'",
  ];

  if (options.upgradeInsecureRequests !== false) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}
