import fs from "node:fs";
import path from "node:path";

/**
 * Refuses to build if the source carries scaffolding, an em dash, or an AI
 * credit.
 *
 * The house style in README.md and .claude/RESPONSIBLE_AI_USE.md are rules a
 * reader has to remember. This makes three of them mechanical, so a
 * judge never opens a page that says "coming soon" and nobody has to notice an
 * em dash by eye.
 *
 * Ported from the wiki repo's audit of the same name, with its boundary intact:
 * these rules match publishing scaffolds, not the ordinary scientific words
 * "sample", "draft", "pending" or "placeholder", which occur in legitimate
 * prose throughout this repository.
 */

const projectRoot = process.cwd();
// Everything a reader of the repository sees as text: the site, the model
// code, the scripts, the video scenes and the subtitles the videos show.
const scanTargets = [
  "app",
  "components",
  "src",
  "lib",
  "content",
  "python_models",
  "scripts",
  "manim_videos",
  "public/code",
  "public/videos",
];
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "out",
  "__pycache__",
  "media",
  "pdb",
]);
const textExtensions = new Set([
  ".css",
  ".js",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
  ".py",
  ".vtt",
  ".json",
]);

const rules = [
  {
    id: "filler-copy",
    label: "filler copy",
    pattern: /\blorem(?:\s+ipsum)?\b/giu,
  },
  {
    // WETLAB_TODO.md is a real file this repo cites, so a TODO that is part of
    // a filename is not an unfinished marker.
    id: "unfinished-code-marker",
    label: "unfinished TODO/FIXME marker",
    pattern: /(?<![A-Z_])\b(?:TODO|FIXME)\b(?!\.md)/gu,
  },
  {
    id: "coming-soon",
    label: "coming-soon copy",
    pattern: /\bcoming\s+soon\b/giu,
  },
  {
    id: "tbd-tba",
    label: "TBD/TBA marker",
    pattern: /\b(?:TBD|TBA)\b/gu,
  },
  {
    id: "synthetic-person",
    label: "synthetic person or team-member name",
    pattern: /\b(?:Member Name|First Last|Jane Doe|John Doe)\b/gu,
  },
  {
    id: "insert-marker",
    label: "unresolved insert marker",
    pattern: /\[(?:insert|add)\s+[^\]\n]{1,100}\]/giu,
  },
  {
    id: "placeholder-date",
    label: "placeholder date",
    pattern: /\b(?:(?:DD|MM|YYYY)(?:[./-](?:DD|MM|YYYY)){1,2}|00[./-]00[./-](?:00|0000))\b/gu,
  },
  {
    id: "mock-or-fake-content",
    label: "explicitly mock, dummy, or fake content",
    pattern: /\b(?:mock|dummy|fake)\s+(?:copy|content|cost|data|description|economics|fee|figure|metric|number|price|result|text|value)s?\b/giu,
  },
  {
    id: "visible-placeholder",
    label: "obvious visible placeholder",
    pattern: /\bplaceholder\s+(?:copy|content|data|date|description|figure|image|link|number|result|text|value)s?\b/giu,
  },
  {
    // House style: never an em dash, anywhere, including the Sandyx flavour
    // text and the video subtitles. Written as an escape so this file passes.
    id: "em-dash",
    label: "em dash",
    pattern: /\u2014/gu,
  },
  {
    // .claude/RESPONSIBLE_AI_USE.md: no AI signature or credit in committed
    // content. The rule matches the credit forms rather than a bare name.
    id: "ai-credit",
    label: "AI signature or credit",
    pattern: /(?:Co-Authored-By:\s*\S*(?:Claude|GPT|Copilot)|Claude-Session|\b(?:generated|written|created|authored)\s+(?:by|with|using)\s+(?:Claude|ChatGPT|GPT-\d|Copilot|an?\s+(?:AI|LLM))\b)/giu,
  },
];

/**
 * The deliberate boundary of this audit. If a rule ever starts matching one of
 * these ordinary sentences, fail before scanning anything.
 */
const legitimateProse = [
  "The sample reads yellow before cleavage.",
  "The sample size and controls are reported with the result.",
  "Replace placeholder names before the final attribution freeze.",
  "Draft calibration entries are not evaluated.",
  "The assay data are pending independent review.",
  "House style: see the House style section of README.md.",
  "Every CALIBRATION entry is mirrored in WETLAB_TODO.md.",
  "Read the value as a range, not a fixed number.",
];

function matches(rule, text) {
  rule.pattern.lastIndex = 0;
  return rule.pattern.test(text);
}

for (const rule of rules) {
  for (const text of legitimateProse) {
    if (matches(rule, text)) {
      console.error(
        `Content audit rule "${rule.id}" is too broad; it matched legitimate prose: ${JSON.stringify(text)}`,
      );
      process.exit(2);
    }
  }
}

function walk(targetPath) {
  if (!fs.existsSync(targetPath)) return [];
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    return textExtensions.has(path.extname(targetPath)) ? [targetPath] : [];
  }
  if (!stat.isDirectory() || ignoredDirectories.has(path.basename(targetPath))) {
    return [];
  }
  return fs.readdirSync(targetPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) return walk(entryPath);
    if (!entry.isFile() || !textExtensions.has(path.extname(entry.name))) return [];
    return [entryPath];
  });
}

function sourceLocation(content, index) {
  const before = content.slice(0, index);
  return { line: before.split("\n").length, column: index - before.lastIndexOf("\n") };
}

// This file spells out the patterns it looks for, so it is the one file it
// cannot scan.
const self = path.join(projectRoot, "scripts", "check-content-integrity.mjs");
const files = scanTargets
  .flatMap((target) => walk(path.join(projectRoot, target)))
  .filter((filePath) => filePath !== self);
const findings = [];

for (const filePath of files) {
  const relativePath = path.relative(projectRoot, filePath);
  const content = fs.readFileSync(filePath, "utf8");
  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    for (const match of content.matchAll(rule.pattern)) {
      const { line, column } = sourceLocation(content, match.index ?? 0);
      findings.push({
        column,
        file: relativePath,
        fragment: match[0].trim(),
        label: rule.label,
        line,
        rule: rule.id,
      });
    }
  }
}

if (findings.length > 0) {
  console.error(
    `Content integrity audit failed with ${findings.length} finding${findings.length === 1 ? "" : "s"}:`,
  );
  findings
    .sort(
      (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column,
    )
    .forEach((f) => {
      console.error(`- ${f.file}:${f.line}:${f.column} [${f.rule}] ${f.label}`);
      console.error(`  ${JSON.stringify(f.fragment)}`);
    });
  console.error(
    "Replace the scaffolding with sourced content, or narrow the named rule only when the prose is demonstrably legitimate.",
  );
  process.exit(1);
}

console.log(
  `Content integrity audit passed: ${files.length} authored text files checked across ${scanTargets.join(", ")}.`,
);
