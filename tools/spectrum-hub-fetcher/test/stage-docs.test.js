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
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assignSlugs, canonicalGuidelinePath } from "../src/hub-map.js";
import { renderPage } from "../src/markdown.js";
import { parseDoc } from "../../s2-docs-to-document-blocks/src/md-parser.js";
import { buildGuideline } from "../../s2-docs-to-document-blocks/src/guideline-builder.js";

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
    extra: { hub_path: path },
  });
  const file = join(root, category, `${slug}.md`);
  mkdirSync(join(root, category), { recursive: true });
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

test("staging reconciles slugs when a colliding Hub path disappears", (t) => {
  const options = t.context;
  const oldPath = "/foundations/content-design/voice-and-tone";
  const path = "/content/voice-and-tone";
  const oldSlugs = assignSlugs([oldPath, path]);
  const newSlug = assignSlugs([path]).get(path);
  t.is(newSlug, "voice-and-tone");

  const oldFiles = [oldPath, path].map((old) => {
    const slug = oldSlugs.get(old);
    t.not(slug, newSlug);
    return {
      markdown: writePage(options.to, slug, old, PREVIEW),
      json: writeGuideline(options.guidelinesDir, slug, `${PREVIEW}${old}`),
    };
  });
  writePage(options.from, newSlug, path, PUBLIC);

  const legacy = writePage(
    options.to,
    "legacy-only",
    "/page/legacy-only/",
    "https://s2.spectrum.corp.adobe.com",
  );
  const unrelated = writePage(
    options.to,
    "other-hub-page",
    "/content/other-hub-page",
    PREVIEW,
  );
  const legacyJson = writeGuideline(
    options.guidelinesDir,
    "legacy-only",
    "https://s2.spectrum.corp.adobe.com/page/legacy-only/",
  );
  const unrelatedJson = writeGuideline(
    options.guidelinesDir,
    "other-hub-page",
    `${PREVIEW}/content/other-hub-page`,
  );

  const githubOutput = join(options.root, "github-output");
  const output = stage(options, [], { GITHUB_OUTPUT: githubOutput });
  t.true(
    readFileSync(githubOutput, "utf8").includes(
      "guideline_count_decrease_allowed=true",
    ),
  );
  t.true(output.includes("removed 2 superseded Markdown and 2 guideline JSON"));
  for (const file of oldFiles) {
    t.false(existsSync(file.markdown));
    t.false(existsSync(file.json));
  }
  for (const file of [legacy, unrelated, legacyJson, unrelatedJson]) {
    t.true(existsSync(file));
  }
  const markdown = readFileSync(
    join(options.to, "designing", `${newSlug}.md`),
    "utf8",
  );
  const { doc } = buildGuideline(parseDoc(markdown), newSlug);
  t.is(doc.name, newSlug);
  t.is(doc.sourceUrl, `${PUBLIC}${path}`);
  const secondOutput = join(options.root, "second-output");
  stage(options, [], { GITHUB_OUTPUT: secondOutput });
  t.is(
    readFileSync(secondOutput, "utf8"),
    "guideline_json_removed=0\nguideline_count_decrease_allowed=false\n",
  );
});

test("staging reconciles generated orphans even when their Markdown is missing", (t) => {
  const options = t.context;
  const old = "/foundations/content-design/voice-and-tone";
  const json = writeGuideline(
    options.guidelinesDir,
    "content-design-voice-and-tone",
    `${PREVIEW}${old}`,
  );
  writePage(options.from, "voice-and-tone", "/content/voice-and-tone", PUBLIC);

  t.true(
    stage(options).includes(
      "removed 0 superseded Markdown and 1 guideline JSON",
    ),
  );
  t.false(existsSync(json));
});

test("staging removes both old Containers paths in favor of the public path", (t) => {
  const options = t.context;
  const paths = [
    "/foundations/visual-language/containers",
    "/foundations/layout-and-structure/containers",
  ];
  const slugs = assignSlugs(paths);
  const oldFiles = paths.map((path) => ({
    markdown: writePage(options.to, slugs.get(path), path, PREVIEW),
    json: writeGuideline(
      options.guidelinesDir,
      slugs.get(path),
      `${PREVIEW}${path}`,
    ),
  }));
  writePage(options.from, "containers", paths[1], PUBLIC);

  stage(options);
  for (const file of oldFiles) {
    t.false(existsSync(file.markdown));
    t.false(existsSync(file.json));
  }
  t.true(existsSync(join(options.to, "designing", "containers.md")));
});

test("staging dry run reports superseded files without changing them", (t) => {
  const options = t.context;
  const path = "/content/voice-and-tone";
  const old = writePage(options.to, "content-voice-and-tone", path, PREVIEW);
  const json = writeGuideline(
    options.guidelinesDir,
    "content-voice-and-tone",
    `${PREVIEW}${path}`,
  );
  writePage(options.from, "voice-and-tone", path, PUBLIC);

  const githubOutput = join(options.root, "github-output");
  t.true(
    stage(options, ["--dry-run"], {
      GITHUB_OUTPUT: githubOutput,
    }).includes("[dry-run] superseded:"),
  );
  t.true(
    readFileSync(githubOutput, "utf8").includes(
      "guideline_count_decrease_allowed=false",
    ),
  );
  t.true(existsSync(old));
  t.true(existsSync(json));
  t.false(existsSync(join(options.to, "designing", "voice-and-tone.md")));
});

test("a category move preserves JSON whose slug is still incoming", (t) => {
  const options = t.context;
  const path = "/support/developer-overview";
  const old = writePage(options.to, "developer-overview", path, PREVIEW);
  const json = writeGuideline(
    options.guidelinesDir,
    "developer-overview",
    `${PREVIEW}${path}`,
  );
  writePage(options.from, "developer-overview", path, PUBLIC, "developing");

  stage(options);
  t.false(existsSync(old));
  t.true(existsSync(json));
  t.true(existsSync(join(options.to, "developing", "developer-overview.md")));
});

test("staging refuses mismatched JSON before changing any files", (t) => {
  const options = t.context;
  const path = "/content/voice-and-tone";
  const old = writePage(options.to, "content-voice-and-tone", path, PREVIEW);
  const json = writeGuideline(
    options.guidelinesDir,
    "content-voice-and-tone",
    `${PUBLIC}/content/other-page`,
  );
  writePage(options.from, "voice-and-tone", path, PUBLIC);

  const error = t.throws(() => stage(options));
  t.true(error.stderr.includes("Cannot reconcile unrelated guideline"));
  t.true(existsSync(old));
  t.true(existsSync(json));
  t.false(existsSync(join(options.to, "designing", "voice-and-tone.md")));
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
  const path = "/content/voice-and-tone";
  const old = writePage(options.to, "content-voice-and-tone", path, PREVIEW);
  const json = writeGuideline(
    options.guidelinesDir,
    "content-voice-and-tone",
    `${PREVIEW}${path}`,
  );

  const error = t.throws(() => stage(options));
  t.true(error.stderr.includes("No markdown found"));
  t.true(existsSync(old));
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

for (const [slug, facts] of Object.entries(CONTENT_FACTS)) {
  test(`published ${slug} preserves content facts through staging and transformation`, (t) => {
    const source = readFileSync(
      new URL(`../../../docs/s2-docs/designing/${slug}.md`, import.meta.url),
      "utf8",
    );
    mkdirSync(join(t.context.from, "designing"), { recursive: true });
    writeFileSync(join(t.context.from, "designing", `${slug}.md`), source);
    stage(t.context);
    const staged = readFileSync(
      join(t.context.to, "designing", `${slug}.md`),
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
