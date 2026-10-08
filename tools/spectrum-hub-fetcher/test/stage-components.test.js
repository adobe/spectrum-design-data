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
import { dirname, join } from "node:path";
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

function page(root, platform, slug, text, targets = [slug]) {
  const path = join(root, "web", platform, "components", `${slug}.md`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `---\ntitle: ${slug}\nplatform: ${platform}\ndesign_data_targets:\n${targets
      .map((t) => `  - ${t}`)
      .join("\n")}\n---\n\n# ${slug}\n\n## Overview\n\n${text}\n`,
  );
  return path;
}

function stage({ from, to }, extra = []) {
  return execFileSync(
    process.execPath,
    [SCRIPT, "--from", from, "--to", to, ...extra],
    { encoding: "utf8", stdio: "pipe" },
  );
}

test("stages RSP and SWC pages as separate files mirroring the Hub IA", (t) => {
  const { from, to } = t.context;
  const rsp = page(from, "rsp", "accordion", "RSP guidance.");
  const swc = page(from, "swc", "accordion", "SWC guidance.");

  t.true(stage(t.context).includes("added 2, updated 0, unchanged 0"));
  t.is(
    readFileSync(join(to, "web/rsp/components/accordion.md"), "utf8"),
    readFileSync(rsp, "utf8"),
  );
  t.is(
    readFileSync(join(to, "web/swc/components/accordion.md"), "utf8"),
    readFileSync(swc, "utf8"),
  );
  t.true(stage(t.context).includes("unchanged 2"));
});

test("pages absent from a partial run are kept; --prune removes them", (t) => {
  const { from, to } = t.context;
  const omitted = page(to, "rsp", "button", "Omitted component stays.");
  page(from, "rsp", "accordion", "Fresh.");

  stage(t.context);
  t.true(existsSync(omitted));

  t.true(stage(t.context, ["--prune"]).includes("removed 1 stale page(s)"));
  t.false(existsSync(omitted));
  t.true(existsSync(join(to, "web/rsp/components/accordion.md")));
});

test("dry run writes and removes nothing", (t) => {
  const { from, to } = t.context;
  const stale = page(to, "rsp", "button", "Stale.");
  page(from, "rsp", "accordion", "New.");

  t.true(stage(t.context, ["--dry-run", "--prune"]).includes("removed 1"));
  t.true(existsSync(stale));
  t.false(existsSync(join(to, "web/rsp/components/accordion.md")));
});

test("document index maps every design_data_targets entry to the RSP page", (t) => {
  const { to } = t.context;
  const combined = page(to, "rsp", "color-handle-and-loupe", "Fused.", [
    "color-handle",
    "color-loupe",
  ]);
  page(to, "swc", "color-handle-and-loupe", "SWC only.", ["color-handle"]);

  const index = buildDocIndex(join(to, "web/rsp/components"));
  t.is(index.size, 2);
  t.is(index.get("color-handle"), combined);
  t.is(index.get("color-loupe"), combined);
});

test("document indexing rejects duplicate targets with both paths", (t) => {
  const { to } = t.context;
  const first = page(to, "rsp", "accordion", "One.");
  const second = page(to, "rsp", "accordion-two", "Two.", ["accordion"]);
  const error = t.throws(() => buildDocIndex(join(to, "web/rsp/components")));
  t.true(error.message.includes('Duplicate component slug "accordion"'));
  t.true(error.message.includes(first));
  t.true(error.message.includes(second));
});

test("staged RSP page publishes its blocks through the transform", async (t) => {
  const { root, from, to } = t.context;
  page(from, "rsp", "accordion", "Fresh public Hub guidance.");
  stage(t.context);
  const jsonPath = join(root, "accordion.json");
  writeFileSync(
    jsonPath,
    JSON.stringify({ name: "accordion", description: "An accordion." }),
  );

  const index = buildDocIndex(join(to, "web/rsp/components"));
  await transformComponent(jsonPath, index.get("accordion"), { dryRun: false });
  const blocks = JSON.parse(readFileSync(jsonPath, "utf8")).documentBlocks;
  t.true(JSON.stringify(blocks).includes("Fresh public Hub guidance."));
});

test("published component blocks match the uniquely indexed Markdown", async (t) => {
  const root = fileURLToPath(
    new URL("../../../docs/s2-docs/web/rsp/components", import.meta.url),
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
