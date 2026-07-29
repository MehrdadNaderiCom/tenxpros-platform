const { readFileSync, readdirSync, statSync } = require("node:fs");
const { extname, join, relative } = require("node:path");

const roots = ["src"];
const extensions = new Set([".ts", ".tsx"]);
const failures = [];

function visit(directory) {
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    if (statSync(absolute).isDirectory()) {
      visit(absolute);
      continue;
    }
    if (!extensions.has(extname(entry))) continue;

    const lines = readFileSync(absolute, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/[—–…]/u.test(line)) {
        failures.push(`${relative(".", absolute)}:${index + 1}: نشانه نگارشی ممنوع`);
      }
      if (/[\u0600-\u06ff].*(?:\.\.\.|--)/u.test(line)) {
        failures.push(`${relative(".", absolute)}:${index + 1}: سه‌نقطه یا خط تیره دوتایی در متن`);
      }
      if (/[\u064a\u0643]/u.test(line)) {
        failures.push(`${relative(".", absolute)}:${index + 1}: ی یا ک عربی در متن فارسی`);
      }
    });
  }
}

for (const root of roots) visit(root);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Content punctuation and Persian glyph checks passed.");
