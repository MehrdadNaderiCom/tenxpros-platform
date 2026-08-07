import {
  expect,
  test,
  type APIResponse,
  type Page,
} from "@playwright/test";

const SITE_URL = "https://tenxpros.com";
const PERSIAN_SITE_URL = "https://tenxpros.ir";
const SOCIAL_IMAGE_URL = `${SITE_URL}/opengraph-image`;

const REQUIRED_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ["strict-transport-security", "max-age=31536000; includeSubDomains"],
  ["x-content-type-options", "nosniff"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
  ["cross-origin-opener-policy", "same-origin"],
  ["x-frame-options", "DENY"],
];

const PARTICIPANT_PUBLIC_ROUTES = [
  "/",
  "/program",
  "/how-it-works",
  "/dossier",
  "/certification",
  "/pricing",
  "/directory",
  "/radar",
  "/about",
  "/apply",
  "/terms",
  "/privacy",
  "/refund",
  "/support",
  "/verify",
] as const;

const CSP_VIOLATION =
  /content security policy|violates the following content security policy directive|err_blocked_by_csp/i;

function cspDirective(policy: string, name: string): string {
  return (
    policy
      .split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${name} `)) ?? ""
  );
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  ).exec(tag);
  return match ? match[1] ?? match[2] ?? match[3] ?? "" : null;
}

function expectRequiredSecurityHeaders(response: APIResponse, label: string) {
  const headers = response.headers();
  for (const [name, expected] of REQUIRED_HEADERS) {
    expect(headers[name], `${label}: ${name}`).toBe(expected);
  }
  expect(headers["permissions-policy"], `${label}: permissions-policy`).toContain(
    "camera=()",
  );
  expect(headers["permissions-policy"], `${label}: permissions-policy`).toContain(
    "payment=(self)",
  );
  expect(headers["content-security-policy"], `${label}: CSP`).toBeTruthy();
}

async function expectSocialMetadata(
  page: Page,
  route: "/" | "/verify",
  canonical: string,
) {
  const expectedTitle =
    route === "/"
      ? "Selective AI Adoption Certification for Experienced Professionals"
      : "Verify a Credential";
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.ok(), route).toBe(true);

  const canonicalAttribute = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  expect(new URL(canonicalAttribute ?? "").href).toBe(new URL(canonical).href);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
    "content",
    "website",
  );
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    "content",
    "TenXPros",
  );
  const openGraphUrl = await page
    .locator('meta[property="og:url"]')
    .getAttribute("content");
  expect(new URL(openGraphUrl ?? "").href).toBe(new URL(canonical).href);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    expectedTitle,
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    /.+/,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    SOCIAL_IMAGE_URL,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    "content",
    expectedTitle,
  );
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
    "content",
    /.+/,
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    SOCIAL_IMAGE_URL,
  );
}

type JsonLdRecord = Record<string, unknown>;

function isJsonLdRecord(value: unknown): value is JsonLdRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function jsonLdRecords(page: Page): Promise<JsonLdRecord[]> {
  const values = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => JSON.parse(node.textContent ?? "{}") as unknown),
    );
  return values.filter(isJsonLdRecord);
}

test("required production headers cover public documents and protected redirects", async ({
  request,
}) => {
  for (const route of ["/", "/pricing", "/verify", "/login", "/apply"] as const) {
    const response = await request.get(route, {
      headers: { accept: "text/html" },
    });
    expect(response.ok(), route).toBe(true);
    expectRequiredSecurityHeaders(response, route);
  }

  const missingRoute = "/__tenxpros_e2e_missing_public_route__";
  const notFoundResponse = await request.get(missingRoute, {
    headers: { accept: "text/html" },
  });
  expect(notFoundResponse.status(), missingRoute).toBe(404);
  expectRequiredSecurityHeaders(notFoundResponse, `${missingRoute} 404`);

  const protectedResponse = await request.get("/admin", {
    headers: { accept: "text/html" },
    maxRedirects: 0,
  });
  expect([302, 303, 307, 308]).toContain(protectedResponse.status());
  expect(protectedResponse.headers().location).toMatch(
    /\/login\?callbackUrl=%2Fadmin$/,
  );
  expectRequiredSecurityHeaders(protectedResponse, "/admin redirect");
});

test("production CSP uses a unique aligned nonce on every rendered script", async ({
  request,
}) => {
  const responses = await Promise.all([
    request.get("/", {
      headers: {
        accept: "text/html",
        "x-nonce": "untrusted-client-value",
        "content-security-policy": "script-src 'unsafe-inline' *",
      },
    }),
    request.get("/", { headers: { accept: "text/html" } }),
  ]);

  const nonces: string[] = [];
  for (const [index, response] of responses.entries()) {
    expect(response.ok(), `render ${index + 1}`).toBe(true);
    const policy = response.headers()["content-security-policy"] ?? "";
    const scripts = cspDirective(policy, "script-src");
    const nonce = /'nonce-([A-Za-z0-9+/_=-]+)'/.exec(scripts)?.[1] ?? "";

    expect(nonce).toMatch(/^[A-Za-z0-9+/_=-]{20,}$/);
    expect(nonce).not.toBe("untrusted-client-value");
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(scripts).not.toContain("*");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("*");
    expect(policy).not.toMatch(/[\r\n]/);

    const html = await response.text();
    const scriptTags = html.match(/<script\b[^>]*>/gi) ?? [];
    const relevantScripts = scriptTags.filter((tag) => {
      const type = attribute(tag, "type")?.toLowerCase();
      return (
        type == null ||
        type === "module" ||
        type === "text/javascript" ||
        type === "application/javascript" ||
        type === "application/ld+json"
      );
    });

    expect(relevantScripts.length).toBeGreaterThan(5);
    expect(
      relevantScripts.filter(
        (tag) => attribute(tag, "type")?.toLowerCase() === "application/ld+json",
      ).length,
    ).toBeGreaterThan(0);
    for (const tag of relevantScripts) {
      expect(attribute(tag, "nonce"), tag).toBe(nonce);
    }

    const scriptPreloads = (html.match(/<link\b[^>]*>/gi) ?? []).filter(
      (tag) =>
        attribute(tag, "rel")?.toLowerCase() === "preload" &&
        attribute(tag, "as")?.toLowerCase() === "script",
    );
    expect(scriptPreloads.length).toBeGreaterThan(0);
    for (const tag of scriptPreloads) {
      expect(attribute(tag, "nonce"), tag).toBe(nonce);
    }
    nonces.push(nonce);
  }

  expect(nonces[0]).not.toBe(nonces[1]);
});

test("homepage and verification metadata are canonical and social-ready", async ({
  page,
}) => {
  await expectSocialMetadata(page, "/", `${SITE_URL}/`);
  await expectSocialMetadata(page, "/verify", `${SITE_URL}/verify`);
});

test("homepage publishes valid language alternates and Organization JSON-LD", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  for (const [language, expected] of [
    ["en", `${SITE_URL}/`],
    ["x-default", `${SITE_URL}/`],
  ] as const) {
    const href = await page
      .locator(`link[rel="alternate"][hreflang="${language}"]`)
      .getAttribute("href");
    expect(new URL(href ?? "").href, language).toBe(new URL(expected).href);
  }
  await expect(
    page.locator('link[rel="alternate"][hreflang="fa-IR"]'),
  ).toHaveCount(0);

  const organization = (await jsonLdRecords(page)).find(
    (value) => value["@type"] === "Organization",
  );
  expect(organization).toMatchObject({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "TenXPros",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon.svg`,
    sameAs: [`${PERSIAN_SITE_URL}/`],
  });
});

for (const route of ["/pricing", "/certification"] as const) {
  test(`${route} FAQ schema matches the FAQ rendered on that page`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const faq = (await jsonLdRecords(page)).find(
      (value) => value["@type"] === "FAQPage",
    );
    expect(faq?.["@id"]).toBe(`${SITE_URL}${route}#faq`);
    expect(Array.isArray(faq?.mainEntity)).toBe(true);

    const entities = (faq?.mainEntity ?? []) as Array<{
      name?: unknown;
      acceptedAnswer?: { text?: unknown };
    }>;
    expect(entities.length).toBeGreaterThan(5);
    await expect(page.locator("details")).toHaveCount(entities.length);

    for (const entity of entities) {
      const question = String(entity.name ?? "");
      const answer = String(entity.acceptedAnswer?.text ?? "");
      expect(question).not.toBe("");
      expect(answer).not.toBe("");

      const details = page.locator("details").filter({
        has: page.locator("summary", { hasText: question }),
      });
      await expect(details, question).toHaveCount(1);
      await expect(details.locator("summary"), question).toBeVisible();
      expect(await details.textContent()).toContain(answer);
      await details.locator("summary").click();
      await expect(details.getByText(answer, { exact: true }), answer).toBeVisible();
    }
  });
}

test("the generated social image is a 1200 by 630 PNG", async ({ request }) => {
  const response = await request.get("/opengraph-image");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toMatch(/^image\/png\b/i);

  const body = await response.body();
  expect(body.subarray(0, 8)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  expect(body.readUInt32BE(16)).toBe(1200);
  expect(body.readUInt32BE(20)).toBe(630);
});

test("strict CSP does not block the core public browser flows", async ({ page }) => {
  test.setTimeout(60_000);
  const violations: string[] = [];

  page.on("console", (message) => {
    if (CSP_VIOLATION.test(message.text())) {
      violations.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    if (CSP_VIOLATION.test(error.message)) {
      violations.push(`pageerror: ${error.message}`);
    }
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "";
    if (CSP_VIOLATION.test(failure)) {
      violations.push(`requestfailed: ${request.url()} (${failure})`);
    }
  });

  for (const route of ["/", "/pricing", "/apply", "/login", "/verify"] as const) {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.ok(), route).toBe(true);
    await expect(page.locator("body"), route).toBeVisible();
    expect(
      await page.locator("script").evaluateAll((scripts) =>
        scripts.filter((script) => Boolean((script as HTMLScriptElement).nonce))
          .length,
      ),
      route,
    ).toBeGreaterThan(0);
  }

  await page.goto("/apply");
  await expect(page.locator('input[name="email"]')).toBeEditable();
  await page.goto("/login");
  await expect(page.locator('input[name="password"]')).toBeEditable();
  await page.goto("/verify");
  await expect(page.locator('input[name="code"]')).toBeEditable();
  expect(violations).toEqual([]);
});

test("participant-facing public pages contain no 90-day program messaging", async ({
  request,
}) => {
  const participantNinetyDay =
    /\b(?:90|ninety)[\s\u2010-\u2015-]*days?\b/i;

  for (const route of PARTICIPANT_PUBLIC_ROUTES) {
    const response = await request.get(route, {
      headers: { accept: "text/html" },
    });
    expect(response.ok(), route).toBe(true);
    const html = await response.text();
    expect(html, route).not.toMatch(participantNinetyDay);
  }
});
