// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { tmpdir } from "node:os";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { fontDirs, resetFontCache } from "../src/fonts.js";
import { randomUUID } from "node:crypto";
import {
  createDesignDataTools,
  fontSummary,
} from "../src/tools/design-data.js";

// These tests call the real design-data-primer handler, which does a
// best-effort registry.npmjs.org freshness check. Disable it here so this
// file stays hermetic (no real network call, no flakiness in air-gapped CI)
// — the check itself is covered by test/dataset-freshness.test.js.
process.env.DESIGN_DATA_SKIP_VERSION_CHECK = "1";

const EXPECTED_TOOLS = [
  "design-data-primer",
  "design-data-query",
  "design-data-suggest",
  "design-data-refinements",
  "design-data-component-tokens",
  "design-data-component",
  "design-data-component-search",
  "design-data-resolve",
  "design-data-guideline-list",
  "design-data-guideline",
  "design-data-visual-recipe",
  "design-data-render",
  "design-data-font-status",
];

// ── design-data-suggest (wasm-backed) ────────────────────────────────────────

test("design-data-suggest returns ranked compact results with final values", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const results = await tools["design-data-suggest"].handler({
    intent: "accent background color",
    limit: 5,
  });
  t.true(Array.isArray(results));
  t.true(results.length > 0);
  for (const r of results) {
    t.true(Object.hasOwn(r, "name"), "result has name");
    t.true(Object.hasOwn(r, "confidence"), "result has confidence");
    t.true(Object.hasOwn(r, "layer"), "result has layer");
    t.is(typeof r.confidence, "number");
    t.true(r.confidence > 0 && r.confidence <= 1);
    // name must be a resolved name (e.g. legacyKey), never the raw
    // "<file>:<index>" cascade graph key, and no file paths are sent.
    t.false(
      /\.json:\d+$/.test(r.name),
      `name "${r.name}" looks like a raw graph key, not a resolved name`,
    );
    t.false(Object.hasOwn(r, "file"));
  }
  // Aliases are followed: a suggested token always carries its final value.
  t.true(results.some((r) => typeof r.value === "string"));
});

test("design-data-suggest respects limit", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const results = await tools["design-data-suggest"].handler({
    intent: "color",
    limit: 3,
  });
  t.true(results.length <= 3);
});

test("design-data-suggest returns empty array for unrecognized intent", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const results = await tools["design-data-suggest"].handler({
    intent: "zzz-no-match-xyzzy",
    limit: 5,
  });
  t.deepEqual(results, []);
});

// ── component not-found error ────────────────────────────────────────────────

const TMP = join(tmpdir(), "design-data-mcp-test-" + randomUUID().slice(0, 8));

test.before(() => mkdirSync(TMP, { recursive: true }));
test.after(() => rmSync(TMP, { recursive: true, force: true }));

test("design-data-component throws for unknown component id", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const tool = tools["design-data-component"];
  const err = await t.throwsAsync(() =>
    tool.handler({ id: "zzz-nonexistent-component-xyz" }),
  );
  t.truthy(err);
  t.true(
    err.message.includes("zzz-nonexistent-component-xyz") ||
      err.message.includes("not installed"),
    `Expected error about missing component, got: ${err.message}`,
  );
});

// ── design-data-guideline-list ────────────────────────────────────────────────

test("design-data-guideline-list returns catalog with guidelines array", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const result = await tools["design-data-guideline-list"].handler({});
  t.true(
    Array.isArray(result.guidelines),
    "result.guidelines should be an array",
  );
  t.is(typeof result.total, "number");
  t.true(result.total > 0, "should have at least one guideline");
  // Each entry has the expected catalog shape
  for (const entry of result.guidelines) {
    t.true(typeof entry.slug === "string", "entry.slug should be a string");
    t.true(typeof entry.title === "string", "entry.title should be a string");
    t.true(
      typeof entry.category === "string",
      "entry.category should be a string",
    );
  }
});

test("design-data-guideline-list filters by category", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const result = await tools["design-data-guideline-list"].handler({
    category: "designing",
  });
  t.true(result.guidelines.every((g) => g.category === "designing"));
});

test("design-data-guideline-list total matches guidelines length", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const result = await tools["design-data-guideline-list"].handler({});
  t.is(result.total, result.guidelines.length);
});

// ── design-data-guideline ─────────────────────────────────────────────────────

test("design-data-guideline returns a guideline document with documentBlocks", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const result = await tools["design-data-guideline"].handler({ id: "colors" });
  t.is(result.name, "colors");
  t.truthy(result.title);
  t.truthy(result.category);
  t.true(Array.isArray(result.documentBlocks));
  t.true(
    result.documentBlocks.length > 0,
    "colors should have at least one block",
  );
  for (const block of result.documentBlocks) {
    t.truthy(block.type, "each block has a type");
    t.truthy(block.content, "each block has content");
  }
});

test("design-data-guideline throws for unknown guideline id", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const err = await t.throwsAsync(() =>
    tools["design-data-guideline"].handler({ id: "zzz-nonexistent-guideline" }),
  );
  t.truthy(err);
  t.true(
    err.message.includes("zzz-nonexistent-guideline") ||
      err.message.includes("not installed"),
    `Expected error about missing guideline, got: ${err.message}`,
  );
});

// ── MCP tool annotations ──────────────────────────────────────────────────────

test("each tool has required MCP annotations", (t) => {
  for (const tool of createDesignDataTools()) {
    t.truthy(tool.annotations, `${tool.name} should have annotations`);
    t.is(
      typeof tool.annotations.title,
      "string",
      `${tool.name} annotations.title should be a string`,
    );
    t.true(
      tool.annotations.title.length > 0,
      `${tool.name} annotations.title should be non-empty`,
    );
    t.is(
      tool.annotations.readOnlyHint,
      true,
      `${tool.name} readOnlyHint should be true`,
    );
    t.is(
      tool.annotations.openWorldHint,
      false,
      `${tool.name} openWorldHint should be false`,
    );
  }
});

test("design-data-visual-recipe returns a recipe and design-data-render returns SVG", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const recipe = await tools["design-data-visual-recipe"].handler({
    id: "action-button",
  });
  t.is(recipe.component, "action-button");
  const svg = await tools["design-data-render"].handler({
    component: "action-button",
    colorScheme: "dark",
  });
  t.true(svg.startsWith("<svg"));
});

test("design-data-render rejects a component without a recipe", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  await t.throwsAsync(
    tools["design-data-render"].handler({ component: "zzz-no-recipe" }),
    { message: /no visual recipe/ },
  );
});

// ── structural tests ──────────────────────────────────────────────────────────

test("createDesignDataTools exposes thirteen tools", (t) => {
  const tools = createDesignDataTools();
  t.is(tools.length, 13);
  t.deepEqual(
    tools.map(({ name }) => name),
    EXPECTED_TOOLS,
  );
});

test("each tool schema rejects unknown properties", (t) => {
  for (const tool of createDesignDataTools()) {
    t.is(
      tool.inputSchema.additionalProperties,
      false,
      `${tool.name} should set additionalProperties: false`,
    );
  }
});

test("query and resolve require their primary argument", (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );

  t.deepEqual(tools["design-data-query"].inputSchema.required, ["filter"]);
  t.deepEqual(tools["design-data-resolve"].inputSchema.required, ["property"]);
});

test("design-data-component and design-data-guideline require id", (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );

  t.deepEqual(tools["design-data-component"].inputSchema.required, ["id"]);
  t.deepEqual(tools["design-data-guideline"].inputSchema.required, ["id"]);
});

test("design-data-guideline-list category is not required", (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const schema = tools["design-data-guideline-list"].inputSchema;
  t.falsy(schema.required, "category should not be required");
});

// ── path-traversal containment (security) ────────────────────────────────────
//
// Both design-data-component and design-data-guideline take a user-supplied `id`
// that is joined into a file path. Verify that crafted ids cannot escape the
// intended subdirectory. The containment check in loadDataFile should throw
// "Invalid <subdir> id" before any filesystem read.
//
// The assertions allow two error messages:
//   "Invalid …"       — the containment check fired (expected path in CI where the
//                        @adobe/spectrum-design-data package is installed).
//   "not installed"   — loadDataFile couldn't locate pkgRoot (the package is absent
//                        from the test env), so the containment check was never reached.
//                        Still a safe outcome: no file was read. The "Not found:" guard
//                        below ensures we never silently pass a plain missing-file error.

test("design-data-component rejects path-traversal id with ..", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const err = await t.throwsAsync(() =>
    tools["design-data-component"].handler({ id: "../../package" }),
  );
  t.truthy(err);
  t.true(
    err.message.includes("Invalid") || err.message.includes("not installed"),
    `Expected containment or not-installed error, got: ${err.message}`,
  );
  // Must NOT expose "not found" (which would mean the containment check was skipped)
  t.false(
    err.message.startsWith("Not found:"),
    "Should reject before reaching the filesystem not-found check",
  );
});

test("design-data-guideline rejects path-traversal id with ..", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const err = await t.throwsAsync(() =>
    tools["design-data-guideline"].handler({ id: "../../package" }),
  );
  t.truthy(err);
  t.true(
    err.message.includes("Invalid") || err.message.includes("not installed"),
    `Expected containment or not-installed error, got: ${err.message}`,
  );
  t.false(
    err.message.startsWith("Not found:"),
    "Should reject before reaching the filesystem not-found check",
  );
});

test("design-data-component rejects absolute path as id", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const err = await t.throwsAsync(() =>
    tools["design-data-component"].handler({ id: "/etc/passwd" }),
  );
  t.truthy(err);
  t.true(
    err.message.includes("Invalid") || err.message.includes("not installed"),
    `Expected containment or not-installed error, got: ${err.message}`,
  );
  t.false(
    err.message.startsWith("Not found:"),
    "Should reject before reaching the filesystem not-found check",
  );
});

// ── design-data-primer provenance ────────────────────────────────────────────

test("design-data-primer returns provenance with designDataVersion", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const result = await tools["design-data-primer"].handler({});
  t.truthy(result.provenance, "provenance should be present");
  t.is(
    result.provenance.source,
    "embedded",
    "provenance.source should be 'embedded'",
  );
  t.is(
    typeof result.provenance.designDataVersion,
    "string",
    "provenance.designDataVersion should be a string",
  );
  t.regex(
    result.provenance.designDataVersion,
    /^\d+\.\d+\.\d+/,
    "provenance.designDataVersion should look like a semver",
  );
});

test("design-data-component-search finds a component by name and by text", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const { results, total } = await tools[
    "design-data-component-search"
  ].handler({ query: "button", limit: 3 });
  t.is(total, results.length);
  t.true(results.length <= 3);
  t.is(results[0].id, "button");
  const byText = await tools["design-data-component-search"].handler({
    query: "perform an action or to navigate",
  });
  t.true(byText.results.some((r) => r.id === "button"));
  t.deepEqual(tools["design-data-component-search"].inputSchema.required, [
    "query",
  ]);
});

// ── query / resolve / primer behavior ────────────────────────────────────────

const byName = () =>
  Object.fromEntries(createDesignDataTools().map((tool) => [tool.name, tool]));

test("design-data-query component=button returns tokens bound to the component", async (t) => {
  const results = await byName()["design-data-query"].handler({
    filter: "component=button",
  });
  t.true(results.total > 0);
  const narrowed = await byName()["design-data-query"].handler({
    filter: "component=button,state=hover",
  });
  t.true(narrowed.total > 0);
  t.true(narrowed.total < results.total);
});

test("design-data-query shows each token's tier and filters by it", async (t) => {
  const query = byName()["design-data-query"];
  const semantic = await query.handler({
    filter: "tier=semantic,property=color",
  });
  t.true(semantic.total > 0);
  for (const token of semantic.tokens) t.is(token.tier, "semantic");
  const primitive = await query.handler({
    filter: "tier=primitive,property=color",
  });
  t.true(primitive.total > 0);
  for (const token of primitive.tokens) t.is(token.tier, "primitive");
});

test("design-data-primer explains tiers and lists a field's allowed tiers", async (t) => {
  const primer = await byName()["design-data-primer"].handler({});
  t.regex(primer.tokenTiers, /tier=<tier>/);
  t.regex(primer.semanticSpecificity, /refinements/);
  t.deepEqual(primer.fieldTiers.scaleIndex.allowedTokenTiers, [
    "primitive",
    "semantic",
  ]);
  t.is(primer.fieldTiers.state.impliesTokenTier, "semantic");
});

test("design-data-query is capped, compact and says how to narrow", async (t) => {
  const query = byName()["design-data-query"];
  const wide = await query.handler({ filter: "property=*color*" });
  t.true(wide.total > 25);
  t.is(wide.shown, 25);
  t.is(wide.tokens.length, 25);
  t.regex(wide.hint, /Showing 25 of \d+/);
  // The point of the cap: a broad query stays small enough to read.
  t.true(JSON.stringify(wide).length < 12_000);
  for (const token of wide.tokens) {
    t.false(Object.hasOwn(token, "raw"));
    t.false(/\.json:\d+$/.test(token.name));
  }
  const raised = await query.handler({ filter: "component=button", limit: 3 });
  t.is(raised.shown, 3);
  const full = await query.handler({
    filter: "component=button",
    limit: 2,
    detail: "full",
  });
  t.true(Object.hasOwn(full.tokens[0], "raw"));
});

test("design-data-query follows aliases to a final value", async (t) => {
  const { tokens } = await byName()["design-data-query"].handler({
    filter: "property=padding",
    limit: 200,
  });
  const small = tokens.find((tok) => tok.name === "container-padding-small");
  t.is(small?.value, "12px");
  // Every shown token with a name has a value or is a composite we cannot flatten.
  const unresolved = tokens.filter(
    (tok) => tok.value === undefined && tok.values === undefined,
  );
  t.is(unresolved.length, 0, JSON.stringify(unresolved.slice(0, 2)));
});

test("design-data-query gives per-mode values when an alias depends on a mode it does not name", async (t) => {
  const query = byName()["design-data-query"];
  const find = async (filter, key) =>
    (await query.handler({ filter, limit: 200 })).tokens.find(
      (tok) => tok.name === key,
    );
  // No colorScheme in its own name, but its target differs by colorScheme.
  const content = await find(
    "property=content-color",
    "accent-content-color-default",
  );
  t.is(content.value, undefined);
  t.deepEqual(Object.keys(content.values.colorScheme).sort(), [
    "dark",
    "light",
    "wireframe",
  ]);
  t.not(content.values.colorScheme.light, content.values.colorScheme.dark);
  const shadow = await find("property=color", "drop-shadow-dragged-color");
  t.is(shadow.values.colorScheme.dark, "rgba(0, 0, 0, 0.6)");
  // A value that is the same in every mode stays a single value.
  const padding = await find("property=padding", "container-padding-small");
  t.is(padding.value, "12px");
  t.is(padding.values, undefined);
});

test("every alias value is explained by at most one mode-set", async (t) => {
  t.timeout(60_000);
  // tokenValue varies one mode-set at a time. That is complete only while a token's value
  // depends on a single mode-set. A token that needs a combination (a high-contrast value
  // that differs only in dark, say) would show a wrong value, so check every combination.
  const wasm = await import("@adobe/design-data-wasm");
  const ds = wasm.Dataset.embedded();
  const sets = ds.primer().modeSets;
  const offenders = [];
  const checked = new Set();
  for (const token of ds.query("")) {
    const name = token.raw.name ?? {};
    if (token.raw.value !== undefined || !name.legacyKey) continue;
    const ref = `{${name.legacyKey}}`;
    const pinned = {};
    for (const { name: set } of sets) if (name[set]) pinned[set] = name[set];
    // Aliases of the same target with the same pinned modes resolve alike: check one.
    const group = `${token.raw.$ref}|${JSON.stringify(pinned)}`;
    if (checked.has(group)) continue;
    checked.add(group);
    const free = sets.filter(({ name: set }) => !pinned[set]);
    const valueOf = (context) =>
      ds.resolveReference(ref, { ...pinned, ...context })?.value;
    const varying = free.filter(
      ({ name: set, modes }) =>
        new Set(modes.map((mode) => valueOf({ [set]: mode }))).size > 1,
    );
    // Every combination of the free mode-sets must match the value from changing
    // only the one varying set (or the default when none varies).
    let combos = [{}];
    for (const { name: set, modes } of free) {
      combos = combos.flatMap((c) =>
        modes.map((mode) => ({ ...c, [set]: mode })),
      );
    }
    const only = varying.length === 1 ? varying[0].name : undefined;
    const bad =
      varying.length > 1 ||
      combos.some(
        (combo) =>
          valueOf(combo) !== valueOf(only ? { [only]: combo[only] } : {}),
      );
    if (bad) offenders.push(name.legacyKey);
  }
  t.deepEqual(
    offenders,
    [],
    "these tokens depend on a combination of mode-sets: tokenValue in src/tools/design-data.js must resolve combinations",
  );
});

test("design-data-query clamps limit at both ends", async (t) => {
  const query = byName()["design-data-query"];
  for (const [limit, shown] of [
    [-1, 1],
    [0, 25],
    [null, 25],
    ["abc", 25],
    [1000, 200],
  ]) {
    const result = await query.handler({ filter: "property=*color*", limit });
    t.is(result.shown, shown, `limit ${limit}`);
  }
});

test("design-data-query lists active tokens before deprecated ones", async (t) => {
  const { tokens } = await byName()["design-data-query"].handler({
    filter: "property=size",
    limit: 200,
  });
  const firstDeprecated = tokens.findIndex((tok) => tok.deprecated);
  t.true(firstDeprecated > 0);
  t.true(tokens.slice(firstDeprecated).every((tok) => tok.deprecated));
});

test("design-data-query description lists only filterable fields", (t) => {
  const { description } = byName()["design-data-query"];
  t.regex(description, /component=button/);
  t.notRegex(description, /property=color-\*/);
});

test("design-data-resolve with a component narrows candidateCount", async (t) => {
  const resolve = byName()["design-data-resolve"];
  const wide = await resolve.handler({ property: "color" });
  const narrow = await resolve.handler({
    property: "color",
    component: "button",
  });
  t.true(narrow.candidateCount > 0);
  t.true(narrow.candidateCount < wide.candidateCount);
  t.true(
    Object.keys(resolve.inputSchema.properties).includes("component") &&
      Object.keys(resolve.inputSchema.properties).includes("variant") &&
      Object.keys(resolve.inputSchema.properties).includes("state"),
  );
});

test("design-data-resolve rejects when narrowing matches nothing", async (t) => {
  await t.throwsAsync(
    () =>
      byName()["design-data-resolve"].handler({
        property: "background-color",
        component: "no-such-component",
      }),
    { message: /with narrowing/ },
  );
});

test("design-data-resolve does not pick a deprecated token when an active one matches", async (t) => {
  const resolve = byName()["design-data-resolve"];
  // `size` has 112 deprecated and 28 active tokens.
  const result = await resolve.handler({ property: "size" });
  t.false(result.deprecated);
  const strict = await resolve.handler({
    property: "size",
    excludeDeprecated: true,
  });
  t.false(strict.deprecated);
  t.true(strict.candidateCount < result.candidateCount);
  // Every background-color token is deprecated: the pick is flagged, not hidden.
  const onlyDeprecated = await resolve.handler({
    property: "background-color",
    colorScheme: "dark",
  });
  t.true(onlyDeprecated.deprecated);
});

test("design-data-primer reports mode-set modes", async (t) => {
  const { modeSets } = await byName()["design-data-primer"].handler({});
  t.true(modeSets.colorScheme.includes("dark"));
  t.true(modeSets.scale.includes("mobile"));
  t.true(modeSets.contrast.includes("high"));
});

// ── PNG rendering ─────────────────────────────────────────────────────────────

const FONT_FIXTURE = fileURLToPath(
  new URL(
    "../../../sdk/core/src/raster/fonts/SourceSans3VF-Upright.ttf",
    import.meta.url,
  ),
);

test("design-data-render returns a PNG image block with the font status", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const result = await tools["design-data-render"].handler({
    component: "badge",
    format: "png",
    pixelRatio: 1,
    fontPath: FONT_FIXTURE,
  });
  t.is(result.content.length, 2);
  const [image, text] = result.content;
  t.is(image.type, "image");
  t.is(image.mimeType, "image/png");
  const png = Buffer.from(image.data, "base64");
  t.is(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  t.true(png.readUInt32BE(16) > 20 && png.readUInt32BE(20) > 10);
  const info = JSON.parse(text.text);
  t.true(info.font.found);
  t.false(info.font.fallback);
  t.is(info.font.using, FONT_FIXTURE);
  t.deepEqual(info.diagnostics, []);
  t.is(info.font.searched, undefined, "the long folder list is left out");
});

test.serial(
  "design-data-render tells the model when it fell back to the bundled font",
  async (t) => {
    const tools = Object.fromEntries(
      createDesignDataTools().map((tool) => [tool.name, tool]),
    );
    const empty = mkdtempSync(join(tmpdir(), "dd-empty-"));
    const saved = {
      HOME: process.env.HOME,
      DESIGN_DATA_FONT: process.env.DESIGN_DATA_FONT,
    };
    process.env.HOME = empty;
    delete process.env.DESIGN_DATA_FONT;
    try {
      const status = await tools["design-data-font-status"].handler({});
      if (status.found) {
        t.pass("this machine has the real font in a system folder");
        return;
      }
      t.true(status.fallback);
      t.regex(status.help, /Brand Center/);
      t.true(Array.isArray(status.searched));
      const result = await tools["design-data-render"].handler({
        component: "badge",
        format: "png",
        pixelRatio: 1,
      });
      const info = JSON.parse(result.content[1].text);
      t.true(info.font.fallback);
      t.is(info.font.using, "bundled Source Sans 3");
      t.regex(info.font.help, /DESIGN_DATA_FONT/);
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  },
);

test("design-data-render validates format and pixelRatio", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const render = tools["design-data-render"].handler;
  await t.throwsAsync(render({ component: "badge", format: "gif" }), {
    message: /format must be/,
  });
  await t.throwsAsync(
    render({
      component: "badge",
      format: "png",
      pixelRatio: 9,
      fontPath: FONT_FIXTURE,
    }),
    { message: /pixelRatio/ },
  );
  await t.throwsAsync(
    render({
      component: "zzz-no-recipe",
      format: "png",
      fontPath: FONT_FIXTURE,
    }),
    { message: /no visual recipe/ },
  );
});

test("design-data-font-status checks a given font file", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const status = await tools["design-data-font-status"].handler({
    fontPath: FONT_FIXTURE,
  });
  t.true(status.found);
  t.is(status.using, FONT_FIXTURE);
  t.true(Array.isArray(status.searched));
});

test("the server passes an image block through to the client", async (t) => {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { InMemoryTransport } =
    await import("@modelcontextprotocol/sdk/inMemory.js");
  const { createMCPServer } = await import("../src/index.js");
  const [a, b] = InMemoryTransport.createLinkedPair();
  const server = createMCPServer();
  const client = new Client({ name: "t", version: "0" });
  await Promise.all([server.connect(a), client.connect(b)]);
  const res = await client.callTool({
    name: "design-data-render",
    arguments: {
      component: "badge",
      format: "png",
      pixelRatio: 1,
      fontPath: FONT_FIXTURE,
    },
  });
  t.falsy(res.isError);
  t.deepEqual(
    res.content.map((c) => c.type),
    ["image", "text"],
  );
  t.is(res.content[0].mimeType, "image/png");
  const svg = await client.callTool({
    name: "design-data-render",
    arguments: { component: "badge" },
  });
  t.is(svg.content[0].type, "text");
  t.true(svg.content[0].text.startsWith("<svg"));
  const list = await client.listTools();
  t.true(list.tools.some((x) => x.name === "design-data-font-status"));
  await client.close();
});

test("the font status sent to the model caps the related families", (t) => {
  const status = {
    found: false,
    fallback: true,
    rejected: [],
    related: ["a", "b", "c", "d", "e", "f", "g"],
    searched: ["/x"],
    help: "h",
  };
  const short = fontSummary(status);
  t.deepEqual(short.related, ["a", "b", "c", "d", "e"]);
  t.is(short.relatedMore, 2);
  t.is(short.searched, undefined);
  t.deepEqual(fontSummary(status, true).searched, ["/x"]);
  const few = fontSummary({ ...status, related: ["a"] });
  t.deepEqual(few.related, ["a"]);
  t.is(few.relatedMore, undefined);
});

test.serial(
  "a font found on the machine that will not draw is skipped, not fatal",
  async (t) => {
    const tools = Object.fromEntries(
      createDesignDataTools().map((tool) => [tool.name, tool]),
    );
    const home = mkdtempSync(join(tmpdir(), "dd-bad-font-"));
    // Identifies as Adobe Clean Spectrum VF (so it is chosen) but has no outlines.
    const dir = fontDirs({ home })[0];
    mkdirSync(dir, { recursive: true });
    const broken = join(dir, "AdobeCleanSpectrumVF-Roman.ttf");
    writeFileSync(broken, fakeTrueType("Adobe Clean Spectrum VF"));
    const saved = {
      HOME: process.env.HOME,
      DESIGN_DATA_FONT: process.env.DESIGN_DATA_FONT,
    };
    process.env.HOME = home;
    delete process.env.DESIGN_DATA_FONT;
    resetFontCache();
    try {
      const result = await tools["design-data-render"].handler({
        component: "badge",
        format: "png",
        pixelRatio: 1,
      });
      t.is(result.content[0].type, "image", "a picture is still drawn");
      const { font } = JSON.parse(result.content[1].text);
      t.is(font.rejected[0].origin, broken);
      t.regex(font.rejected[0].reason, /^cannot be drawn/);
      t.regex(
        font.help,
        /AdobeCleanSpectrumVF-Roman\.ttf but it cannot be drawn/,
      );
      t.not(font.using, broken);
      // A font the user named must fail loudly instead.
      await t.throwsAsync(
        tools["design-data-render"].handler({
          component: "badge",
          format: "png",
          fontPath: broken,
        }),
        { message: /font /i },
      );
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
      resetFontCache();
    }
  },
);

// A TrueType file with only a name table: it identifies, but cannot be parsed as a font.
function fakeTrueType(family) {
  const u16 = (s) => Buffer.from(s, "utf16le").swap16();
  const [f, sub] = [u16(family), u16("Regular")];
  const name = Buffer.alloc(30);
  name.writeUInt16BE(2, 2);
  name.writeUInt16BE(30, 4);
  [
    [1, 0, f.length],
    [2, f.length, sub.length],
  ].forEach(([id, off, len], i) => {
    [3, 1, 0x409, id, len, off].forEach((v, k) =>
      name.writeUInt16BE(v, 6 + 12 * i + 2 * k),
    );
  });
  const table = Buffer.concat([name, f, sub]);
  const head = Buffer.alloc(28);
  head.writeUInt32BE(0x00010000, 0);
  head.writeUInt16BE(1, 4);
  head.write("name", 12, "latin1");
  head.writeUInt32BE(28, 20);
  head.writeUInt32BE(table.length, 24);
  return Buffer.concat([head, table, Buffer.alloc(2048)]);
}

test("design-data-render applies the icon field and flags options.icon", async (t) => {
  const tools = Object.fromEntries(
    createDesignDataTools().map((tool) => [tool.name, tool]),
  );
  const render = tools["design-data-render"].handler;
  const base = { component: "button", format: "png", pixelRatio: 1 };
  const png = async (extra) => {
    const out = await render({ ...base, fontPath: FONT_FIXTURE, ...extra });
    return {
      img: out.content[0].data,
      diagnostics: JSON.parse(out.content[1].text).diagnostics,
    };
  };
  const dflt = await png({});
  const edit = await png({ icon: { set: "workflow", name: "edit" } });
  t.deepEqual(edit.diagnostics, []);
  t.not(edit.img, dflt.img, "edit icon differs from the default add icon");
  const viaOption = await png({ options: { icon: "edit" } });
  t.is(viaOption.img, dflt.img);
  t.regex(viaOption.diagnostics.join("\n"), /option 'icon'.*ignored/);
  const bad = await png({ icon: { set: "workflow", name: "no-such-icon" } });
  t.true(bad.diagnostics.length > 0);
});

test.serial(
  "design-data-render SVG layout ignores fontPath and DESIGN_DATA_FONT",
  async (t) => {
    const render = createDesignDataTools().find(
      (tool) => tool.name === "design-data-render",
    ).handler;
    const args = { component: "button", label: "AVAVAV To Ty" };
    const saved = process.env.DESIGN_DATA_FONT;
    try {
      delete process.env.DESIGN_DATA_FONT;
      const plain = await render(args);
      // The fixture's unkerned widths differ from the built-in table, so using it would show.
      t.is(await render({ ...args, fontPath: FONT_FIXTURE }), plain);
      process.env.DESIGN_DATA_FONT = FONT_FIXTURE;
      t.is(await render(args), plain);
    } finally {
      if (saved === undefined) delete process.env.DESIGN_DATA_FONT;
      else process.env.DESIGN_DATA_FONT = saved;
    }
  },
);

test("design-data-refinements returns specificity and neighbors", async (t) => {
  const result = await byName()["design-data-refinements"].handler({
    token: "neutral-subdued-content-color-hover",
  });
  t.is(result.specificity.tier, "semantic");
  t.true(result.specificity.purposeFields.includes("variant"));
  t.is(result.broader[0].name, "neutral-content-color-hover");
  t.deepEqual(result.broader[0].fields, { variant: "subdued" });
  const byFields = await byName()["design-data-refinements"].handler({
    token: "property=corner-radius scaleIndex=500",
  });
  t.is(byFields.specificity.tier, "primitive");
  await t.throwsAsync(() =>
    byName()["design-data-refinements"].handler({ token: "no-such-token" }),
  );
});

test("design-data-query compact tokens list purposeFields", async (t) => {
  const result = await byName()["design-data-query"].handler({
    filter: "uuid=f24eb871-6419-4cef-88a2-cca8548ae31e",
  });
  t.deepEqual(result.tokens[0].purposeFields.sort(), [
    "colorRole",
    "object",
    "state",
  ]);
});

test("design-data-component-tokens unpacks a type style into resolved sub-values", async (t) => {
  const { bindings } = await byName()["design-data-component-tokens"].handler({
    component: "text-field",
    limit: 200,
  });
  const styles = bindings.filter((b) => b.property === "type-style");
  t.true(styles.length > 0);
  for (const b of styles) {
    t.is(b.value, undefined);
    t.is(b.values, undefined);
    t.regex(b.token, /component-\w+-\w+/);
    for (const key of ["fontFamily", "fontSize", "fontWeight", "lineHeight"]) {
      const sub = b.style[key];
      t.true(sub.value !== undefined || sub.values !== undefined, key);
      t.notRegex(JSON.stringify(sub), /[{][a-z-]+[}]/);
    }
  }
  const medium = styles.find((b) => b.token === "component-m-regular");
  t.deepEqual(medium.style.fontSize.values.scale.desktop, "14px");
  t.deepEqual(medium.style.fontSize.values.scale.mobile, "17px");
  t.is(medium.style.fontWeight.value, "regular");
});

test("design-data-component-tokens lists what a component uses, by context and state", async (t) => {
  const tool = byName()["design-data-component-tokens"];
  const background = await tool.handler({
    component: "action-button",
    context: "background",
    state: "hover",
  });
  t.true(background.total > 0);
  for (const b of background.bindings) {
    t.regex(b.context, /background/i);
    t.true(!b.when?.state || JSON.stringify(b.when.state).includes("hover"));
    t.true(b.value !== undefined || b.values !== undefined);
  }
  t.true(background.bindings.some((b) => b.when?.state?.includes("hover")));
  t.true(background.otherStates.length > 0);
  t.false(background.otherStates.includes("hover"));
  const capped = await tool.handler({ component: "action-button", limit: 3 });
  t.is(capped.shown, 3);
  t.regex(capped.hint, /Narrow/);
  await t.throwsAsync(() => tool.handler({ component: "no-such-component" }));
});

test("design-data-component-tokens narrows by option values and collapses a mode to one value", async (t) => {
  const tool = byName()["design-data-component-tokens"];
  const all = await tool.handler({ component: "button", limit: 500 });
  const accent = await tool.handler({
    component: "button",
    limit: 500,
    options: { variant: "accent", style: "fill" },
    colorScheme: "light",
  });
  t.true(accent.total > 0 && accent.total < all.total);
  for (const b of accent.bindings) {
    const variant = b.when?.variant;
    t.true(variant === undefined || [variant].flat().includes("accent"));
    t.is(b.values?.colorScheme, undefined);
  }
  t.true(accent.bindings.some((b) => typeof b.value === "string"));
});

test("design-data-query filters by purpose fields and sorts by specificity", async (t) => {
  const query = byName()["design-data-query"];
  const accent = await query.handler({
    filter: "tier=semantic,object=background,colorRole=accent",
    sort: "specificity",
  });
  t.true(accent.total > 0);
  for (const token of accent.tokens) {
    t.true(token.purposeFields.includes("colorRole"));
    t.true(token.purposeFields.includes("object"));
  }
  const counts = accent.tokens
    .filter((tk) => !tk.deprecated)
    .map((tk) => tk.purposeFields.length);
  t.deepEqual(
    counts,
    [...counts].sort((a, b) => b - a),
  );
});
