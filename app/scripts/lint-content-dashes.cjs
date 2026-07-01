/**
 * Content dash lint. Fails (exit 1) if any forbidden dash-like character appears
 * in content: U+2014 (em dash), U+2013 (en dash), U+2015 (horizontal bar),
 * U+2212 (minus sign). The editorial rule is: use a comma, colon, parentheses,
 * or the plain ASCII hyphen only. Wired into `pnpm build` so the build fails on
 * any violation.
 *
 * Test files are skipped because they legitimately contain these characters
 * inside detection regexes; this script also skips itself.
 */
const fs = require("fs");
const path = require("path");

// Keys built from code points so this file contains no literal forbidden chars.
const FORBIDDEN = {
  [String.fromCharCode(0x2014)]: "U+2014 em dash",
  [String.fromCharCode(0x2013)]: "U+2013 en dash",
  [String.fromCharCode(0x2015)]: "U+2015 horizontal bar",
  [String.fromCharCode(0x2212)]: "U+2212 minus sign",
};
const CHARS = Object.keys(FORBIDDEN);

const ROOTS = ["src", "prisma/seed"];
const EXT = new Set([".ts", ".tsx", ".css", ".md", ".mdx"]);

function excluded(p) {
  return (
    p.includes("node_modules") ||
    p.includes(`${path.sep}tests${path.sep}`) ||
    /\.test\.tsx?$/.test(p) ||
    p.endsWith("lint-content-dashes.cjs")
  );
}

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (excluded(p)) continue;
    if (e.isDirectory()) yield* walk(p);
    else if (EXT.has(path.extname(p))) yield p;
  }
}

const violations = [];
for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const lines = fs.readFileSync(file, "utf-8").split("\n");
    lines.forEach((line, i) => {
      for (const ch of CHARS) {
        if (line.includes(ch)) {
          violations.push(`${file}:${i + 1}  ${FORBIDDEN[ch]}  ->  ${line.trim().slice(0, 100)}`);
        }
      }
    });
  }
}

if (violations.length) {
  console.error(
    `\nContent dash lint FAILED: ${violations.length} forbidden character(s) found.\n` +
      `Use a comma, colon, parentheses, or a plain ASCII hyphen instead.\n`,
  );
  for (const v of violations) console.error("  " + v);
  console.error("");
  process.exit(1);
}
console.log("Content dash lint passed: no U+2014, U+2013, U+2015, or U+2212 in content.");
