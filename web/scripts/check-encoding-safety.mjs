import fs from "node:fs";
import path from "node:path";

const srcRoot = path.resolve(process.cwd(), "src");
const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
]);

const knownMojibakeTokens = [
  "蝺刻?",
  "??蝣?",
  "敺齒鈭?",
  "?桀?",
  "?唳??伐?",
  "甇文",
  "餈質馱",
  "撠",
  "隢",
  "蝯",
  "憪?",
  "撣",
  "頨思遢",
];

function walk(dirPath, collector) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, collector);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (textExtensions.has(ext)) {
      collector.push(fullPath);
    }
  }
}

const files = [];
walk(srcRoot, files);

const issues = [];
for (const filePath of files) {
  const content = fs.readFileSync(filePath, "utf8");
  if (content.includes("\uFFFD")) {
    issues.push(`${filePath}: contains Unicode replacement character (�).`);
  }
  if (/[\uE000-\uF8FF]/u.test(content)) {
    issues.push(`${filePath}: contains private-use Unicode characters (possible mojibake).`);
  }
  for (const token of knownMojibakeTokens) {
    if (content.includes(token)) {
      issues.push(`${filePath}: contains known mojibake token "${token}".`);
    }
  }
}

if (issues.length > 0) {
  console.error("Encoding safety check failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Encoding safety check passed for ${files.length} source files.`);
