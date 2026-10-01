// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import test from "ava";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDocIndex } from "../../s2-docs-to-document-blocks/src/cli.js";
import { transformComponent } from "../../s2-docs-to-document-blocks/src/transformer.js";

const SCRIPT = fileURLToPath(
  new URL("../scripts/stage-components.js", import.meta.url),
);

test.beforeEach((t) => {
  const root = mkdtempSync(join(tmpdir(), "hub-stage-components-"));
  t.context = { root, from: join(root, "fetch"), to: join(root, "docs") };
});

test.afterEach.always((t) => {
  rmSync(t.context.root, { recursive: true, force: true });
});

function page(root, category, slug, text) {
  const dir = join(root, category);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${slug}.md`);
  writeFileSync(
    path,
    `---\ntitle: ${slug}\n---\n\n# ${slug}\n\n## Overview\n\n${text}\n`,
  );
  return path;
}

function stage({ from, to }, extra = []) {
  return execFileSync(
    process.execPath,
    [SCRIPT, "--from", from, "--to", to, ...extra],
    {
      encoding: "utf8",
      stdio: "pipe",
    },
  );
}

test("category migration removes all obsolete paths and publishes the incoming blocks", async (t) => {
  const { root, from, to } = t.context;
  const old = page(to, "navigation", "accordion", "Stale preview guidance.");
  const older = page(to, "feedback", "accordion", "Older guidance.");
  const omitted = page(to, "inputs", "button", "Omitted component stays.");
  const target = page(
    from,
    "containers",
    "accordion",
    "Fresh public Hub guidance.",
  );
  const jsonPath = join(root, "accordion.json");
  writeFileSync(
    jsonPath,
    JSON.stringify({ name: "accordion", description: "An accordion." }),
  );

  const output = stage(t.context);
  t.true(output.includes("removed 2 superseded path(s)"));
  t.false(existsSync(old));
  t.false(existsSync(older));
  t.true(existsSync(omitted));
  const index = buildDocIndex(to);
  t.is(index.size, 2);
  t.is(
    readFileSync(index.get("accordion"), "utf8"),
    readFileSync(target, "utf8"),
  );
  await transformComponent(jsonPath, index.get("accordion"), { dryRun: false });
  const blocks = JSON.parse(readFileSync(jsonPath, "utf8")).documentBlocks;
  t.true(JSON.stringify(blocks).includes("Fresh public Hub guidance."));
  t.false(JSON.stringify(blocks).includes("Stale"));
  t.true(stage(t.context).includes("unchanged 1, removed 0"));
});

test("dry run reports migrations without writing or removing either path", (t) => {
  const { from, to } = t.context;
  const old = page(to, "navigation", "accordion", "Old.");
  page(from, "containers", "accordion", "New.");
  t.true(stage(t.context, ["--dry-run"]).includes("removed 1"));
  t.is(readFileSync(old, "utf8").includes("Old."), true);
  t.false(existsSync(join(to, "containers", "accordion.md")));
});

test("duplicate incoming slugs fail before any staging mutation", (t) => {
  const { from, to } = t.context;
  const old = page(to, "navigation", "accordion", "Old.");
  page(from, "containers", "accordion", "New.");
  page(from, "feedback", "accordion", "Ambiguous.");
  const error = t.throws(() => stage(t.context));
  t.true(
    error.stderr.toString().includes('Duplicate component "accordion.md"'),
  );
  t.true(readFileSync(old, "utf8").includes("Old."));
  t.false(existsSync(join(to, "containers")));
});

test("document indexing rejects duplicate slugs with both paths", (t) => {
  const { to } = t.context;
  const first = page(to, "containers", "accordion", "New.");
  const second = page(to, "navigation", "accordion", "Old.");
  const error = t.throws(() => buildDocIndex(to));
  t.true(error.message.includes('Duplicate component slug "accordion"'));
  t.true(error.message.includes(first));
  t.true(error.message.includes(second));
});

test("published component blocks match the uniquely indexed Markdown", async (t) => {
  const root = fileURLToPath(
    new URL("../../../docs/s2-docs/components", import.meta.url),
  );
  const components = fileURLToPath(
    new URL("../../../packages/design-data/components", import.meta.url),
  );
  const index = buildDocIndex(root);
  t.true(index.size > 0);
  for (const [slug, markdown] of index) {
    const path = join(components, `${slug}.json`);
    if (!existsSync(path)) continue;
    const { blocks } = await transformComponent(path, markdown, {
      dryRun: true,
    });
    t.deepEqual(
      JSON.parse(readFileSync(path, "utf8")).documentBlocks,
      blocks,
      slug,
    );
  }
});
