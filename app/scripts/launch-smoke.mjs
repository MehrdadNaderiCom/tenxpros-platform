function argValue(name) {
  const exactIndex = process.argv.indexOf(name);
  if (exactIndex !== -1) return process.argv[exactIndex + 1];

  const prefixed = process.argv.find((argument) => argument.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : undefined;
}

const baseUrl = (
  argValue("--base-url") ??
  process.env.LAUNCH_SMOKE_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.APP_URL ??
  "http://localhost:3003"
).replace(/\/$/, "");
const verifyCode = argValue("--verify-code") ?? process.env.LAUNCH_SMOKE_VERIFY_CODE;

const failures = [];
const warnings = [];

async function checkRoute(route, expectation = {}) {
  const response = await fetch(`${baseUrl}${route}`, { redirect: expectation.redirect ? "manual" : "follow" });
  const status = response.status;

  if (expectation.redirect) {
    const location = response.headers.get("location") ?? "";
    const ok = [301, 302, 303, 307, 308].includes(status) && location.includes(expectation.redirect);
    printResult(route, ok, `${status} -> ${location || "missing location"}`);
    if (!ok) failures.push(`${route} expected redirect to ${expectation.redirect}, got ${status}`);
    return;
  }

  if (expectation.jsonOk) {
    let ok = false;
    try {
      const body = await response.json();
      ok = response.ok && body.ok === true;
    } catch {
      ok = false;
    }
    printResult(route, ok, `${status}`);
    if (!ok) failures.push(`${route} expected JSON { ok: true }, got ${status}`);
    return;
  }

  const ok = status >= 200 && status < 400;
  printResult(route, ok, `${status}`);
  if (!ok) failures.push(`${route} expected HTTP < 400, got ${status}`);
}

function printResult(route, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"} ${route.padEnd(16)} ${detail}`);
}

console.log("TenXPros launch smoke check");
console.log(`Base URL: ${baseUrl}`);
console.log("");

await checkRoute("/");
await checkRoute("/apply");
await checkRoute("/pricing");
await checkRoute("/login");
await checkRoute("/api/health", { jsonOk: true });
await checkRoute("/admin", { redirect: "/login" });
await checkRoute("/portal", { redirect: "/login" });

if (verifyCode) {
  await checkRoute(`/verify/${verifyCode}`);
} else {
  warnings.push("/verify/[code] skipped because no --verify-code or LAUNCH_SMOKE_VERIFY_CODE was provided");
}

if (warnings.length) {
  console.log("");
  console.log("Warnings:");
  for (const warning of warnings) console.log(`  - ${warning}`);
}

if (failures.length) {
  console.log("");
  console.error("FAIL: launch smoke check failed.");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("");
console.log("PASS: launch smoke check passed.");
