// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import test from "ava";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalGuidelinePath } from "../src/hub-map.js";
import { renderPage } from "../src/markdown.js";
import { parseDoc } from "../../s2-docs-to-document-blocks/src/md-parser.js";
import { buildGuideline } from "../../s2-docs-to-document-blocks/src/guideline-builder.js";
import { buildGuidelineIndex } from "../../s2-docs-to-document-blocks/src/cli.js";

const SCRIPT = fileURLToPath(
  new URL("../scripts/stage-docs.js", import.meta.url),
);
const PREVIEW = "https://preview.spectrum.adobe.com";
const PUBLIC = "https://spectrum.adobe.com";

test.beforeEach((t) => {
  const root = mkdtempSync(
    fileURLToPath(new URL("../.stage-docs-", import.meta.url)),
  );
  t.context = {
    root,
    from: join(root, "fetch"),
    to: join(root, "docs"),
    guidelinesDir: join(root, "guidelines"),
  };
});

test.afterEach.always((t) => {
  rmSync(t.context.root, { recursive: true, force: true });
});

function writePage(root, slug, path, origin, category = "designing") {
  const markdown = renderPage({
    title: "Guidance",
    category,
    sourceUrl: `${origin}${path}`,
    sections: [{ heading: "Overview", level: 2, text: "Useful guidance." }],
    extra: { hub_path: path, slug },
  });
  const file = join(root, category, `${slug}.md`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, markdown);
  return file;
}

function writeGuideline(root, slug, sourceUrl) {
  mkdirSync(root, { recursive: true });
  const file = join(root, `${slug}.json`);
  writeFileSync(file, JSON.stringify({ name: slug, sourceUrl }));
  return file;
}

function stage(options, extra = [], env = {}) {
  return execFileSync(
    process.execPath,
    [
      SCRIPT,
      "--from",
      options.from,
      "--to",
      options.to,
      "--guidelines-dir",
      options.guidelinesDir,
      ...extra,
    ],
    { encoding: "utf8", stdio: "pipe", env: { ...process.env, ...env } },
  );
}

test("staging mirrors the Hub path and keeps slug/category in frontmatter", (t) => {
  const options = t.context;
  writePage(options.from, "voice-and-tone", "/content/voice-and-tone", PUBLIC);
  writePage(
    options.from,
    "fonts",
    "/foundations/typography/fonts",
    PUBLIC,
    "designing",
  );

  t.true(stage(options).includes("added 2, updated 0, unchanged 0"));
  const staged = join(options.to, "content", "voice-and-tone.md");
  t.true(existsSync(join(options.to, "foundations/typography/fonts.md")));
  const { frontmatter } = parseDoc(readFileSync(staged, "utf8"));
  t.is(frontmatter.slug, "voice-and-tone");
  t.is(frontmatter.category, "designing");
  t.true(stage(options).includes("unchanged 2"));

  const index = buildGuidelineIndex(options.to);
  t.is(index.get("voice-and-tone"), staged);
  const { doc } = buildGuideline(
    parseDoc(readFileSync(staged, "utf8")),
    "voice-and-tone",
  );
  t.is(doc.sourceUrl, `${PUBLIC}/content/voice-and-tone`);
});

test("staging preserves pages absent from the fetch", (t) => {
  const options = t.context;
  const omitted = writePage(
    options.to,
    "other",
    "/content/other-hub-page",
    PUBLIC,
  );
  const target = join(options.to, "content", "other-hub-page.md");
  writePage(options.from, "voice-and-tone", "/content/voice-and-tone", PUBLIC);

  stage(options);
  t.true(existsSync(omitted));
  t.false(existsSync(target) && false);
  t.true(existsSync(join(options.to, "content", "voice-and-tone.md")));
});

test("a re-slugged Hub page removes its obsolete guideline JSON only", (t) => {
  const options = t.context;
  const path = "/content/voice-and-tone";
  const stale = writeGuideline(
    options.guidelinesDir,
    "content-voice-and-tone",
    `${PREVIEW}${path}`,
  );
  const legacy = writeGuideline(
    options.guidelinesDir,
    "legacy-only",
    "https://s2.spectrum.corp.adobe.com/page/legacy-only/",
  );
  const unrelated = writeGuideline(
    options.guidelinesDir,
    "other-hub-page",
    `${PUBLIC}/content/other-hub-page`,
  );
  writePage(options.from, "voice-and-tone", path, PUBLIC);

  const githubOutput = join(options.root, "github-output");
  t.true(
    stage(options, [], { GITHUB_OUTPUT: githubOutput }).includes(
      "removed 1 guideline JSON",
    ),
  );
  t.true(
    readFileSync(githubOutput, "utf8").includes(
      "guideline_count_decrease_allowed=true",
    ),
  );
  t.false(existsSync(stale));
  t.true(existsSync(legacy));
  t.true(existsSync(unrelated));

  const secondOutput = join(options.root, "second-output");
  stage(options, [], { GITHUB_OUTPUT: secondOutput });
  t.is(
    readFileSync(secondOutput, "utf8"),
    "guideline_json_removed=0\nguideline_count_decrease_allowed=false\n",
  );
});

test("staging dry run changes nothing", (t) => {
  const options = t.context;
  const path = "/content/voice-and-tone";
  const json = writeGuideline(
    options.guidelinesDir,
    "content-voice-and-tone",
    `${PREVIEW}${path}`,
  );
  writePage(options.from, "voice-and-tone", path, PUBLIC);

  t.true(stage(options, ["--dry-run"]).includes("[dry-run] 1 hub page(s)"));
  t.true(existsSync(json));
  t.false(existsSync(join(options.to, "content", "voice-and-tone.md")));
});

test("staging rejects conflicting incoming aliases before writing files", (t) => {
  const options = t.context;
  writePage(
    options.from,
    "content-design-voice-and-tone",
    "/foundations/content-design/voice-and-tone",
    PUBLIC,
  );
  writePage(options.from, "voice-and-tone", "/content/voice-and-tone", PUBLIC);

  const error = t.throws(() => stage(options));
  t.true(error.stderr.includes("Multiple fetched pages resolve to"));
  t.false(existsSync(options.to));
});

test("an empty fetch cannot remove staged or generated guidance", (t) => {
  const options = t.context;
  const json = writeGuideline(
    options.guidelinesDir,
    "content-voice-and-tone",
    `${PREVIEW}/content/voice-and-tone`,
  );

  const error = t.throws(() => stage(options));
  t.true(error.stderr.includes("No markdown found"));
  t.true(existsSync(json));
});

test("published Hub guidelines have no preview sources or duplicate page identities", (t) => {
  const guidelinesDir = new URL(
    "../../../packages/design-data/guidelines/",
    import.meta.url,
  );
  const manifest = JSON.parse(
    readFileSync(new URL("manifest.json", guidelinesDir), "utf8"),
  );
  t.deepEqual(
    readdirSync(guidelinesDir)
      .filter((file) => file.endsWith(".json") && file !== "manifest.json")
      .map((file) => basename(file, ".json"))
      .sort(),
    manifest.guidelines.map((entry) => entry.slug).sort(),
  );
  const identities = new Set();
  for (const entry of manifest.guidelines) {
    if (!entry.sourceUrl) continue;
    const url = new URL(entry.sourceUrl);
    t.not(url.hostname, "preview.spectrum.adobe.com", entry.slug);
    if (
      url.hostname !== "spectrum.adobe.com" &&
      url.hostname !== "main--spectrum-hub--adobe.aem.live"
    ) {
      continue;
    }
    const identity = canonicalGuidelinePath(url.pathname);
    t.false(identities.has(identity), `${entry.slug}: ${identity}`);
    identities.add(identity);
  }
});

function normalizeProse(text) {
  return text
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const CONTENT_FACTS = {
  "writing-for-errors": [
    "Choose the message first, then the component",
    "Use plain language, and avoid jargon",
    "Don't blame the user, even if the error is their fault",
    "Save “sorry” for serious errors",
    "Use passive voice sparingly",
  ],
  "typography-system": [
    "Spectrum recommends ExtraBold as the heaviest font weight for most use cases",
    "In limited cases, products may use the Black font weight to support product-specific branding",
    "Black should be reserved for heading type styles and used at 18 px or larger to maintain legibility",
  ],
  containers: [
    "they group related concepts together into distinct areas",
    "Emphasized containers should be used sparingly",
    "When deciding whether a container should be emphasized, consider the rest of the page",
    "While there are exceptions, generally only one group at a time should be emphasized on a page",
    "For example, a group of related cards can use a drop shadow, but not every element on a page should have a drop shadow",
    "If the whole container is interactive, hover is shown through a slightly more prominent drop shadow",
    "spacing is used to create separation between concepts",
    "Borders can also be used around objects as an alternate style to a background color, and should be used without a fill",
  ],
};

const PUBLISHED_DOCS = fileURLToPath(
  new URL("../../../docs/s2-docs", import.meta.url),
);

for (const [slug, facts] of Object.entries(CONTENT_FACTS)) {
  test(`published ${slug} preserves content facts through staging and transformation`, (t) => {
    const sourcePath = buildGuidelineIndex(PUBLISHED_DOCS).get(slug);
    t.truthy(sourcePath, `docs/s2-docs has a page for ${slug}`);
    const source = readFileSync(sourcePath, "utf8");
    const { frontmatter } = parseDoc(source);
    const fetched = join(t.context.from, frontmatter.category, `${slug}.md`);
    mkdirSync(dirname(fetched), { recursive: true });
    writeFileSync(fetched, source);
    stage(t.context);
    const staged = readFileSync(
      join(t.context.to, `${frontmatter.hub_path.slice(1)}.md`),
      "utf8",
    );
    const { doc } = buildGuideline(parseDoc(staged), slug);
    const canonical = JSON.parse(
      readFileSync(
        new URL(
          `../../../packages/design-data/guidelines/${slug}.json`,
          import.meta.url,
        ),
        "utf8",
      ),
    );
    t.deepEqual(
      doc,
      canonical,
      "checked-in JSON must match the staged source transform",
    );
    const prose = normalizeProse(
      doc.documentBlocks.map((block) => block.content ?? "").join(" "),
    );
    for (const fact of facts) {
      t.true(
        normalizeProse(staged).includes(normalizeProse(fact)),
        `Markdown: ${fact}`,
      );
      t.true(prose.includes(normalizeProse(fact)), `documentBlocks: ${fact}`);
    }
  });
}
