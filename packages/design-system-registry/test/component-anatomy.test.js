/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseAnatomyBlock,
  extractAnatomyBlock,
  parsePartLine,
  toKebabCase,
} from "../scripts/extract-component-anatomy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REGISTRY_PATH = join(__dirname, "../registry/component-anatomy.json");

// --- Unit tests for parsing helpers ---

test("toKebabCase converts display names", (t) => {
  t.is(toKebabCase("Action Button"), "action-button");
  t.is(toKebabCase("hold icon"), "hold-icon");
  t.is(toKebabCase("label"), "label");
  t.is(toKebabCase("cover image"), "cover-image");
});

test("parsePartLine extracts name and annotation", (t) => {
  t.deepEqual(parsePartLine("- label"), { name: "label", annotation: null });
  t.deepEqual(parsePartLine("  - cover image (optional)"), {
    name: "cover image",
    annotation: "optional",
  });
  t.deepEqual(parsePartLine("- preview (asset)"), {
    name: "preview",
    annotation: "asset",
  });
  t.is(parsePartLine("-   "), null);
});

test("parseAnatomyBlock: button anatomy", (t) => {
  const result = parseAnatomyBlock("button\n- label");
  t.is(result.componentName, "button");
  t.is(result.parts.length, 1);
  t.is(result.parts[0].id, "label");
  t.is(result.parts[0].optional, false);
});

test("parseAnatomyBlock: slider with optional parts", (t) => {
  const block = `slider
- label (optional)
- value (optional)
- track
- fill
- handle`;
  const result = parseAnatomyBlock(block);
  t.is(result.componentName, "slider");
  t.is(result.parts.length, 5);
  t.is(result.parts[0].id, "label");
  t.is(result.parts[0].optional, true);
  t.is(result.parts[2].id, "track");
  t.is(result.parts[2].optional, false);
});

test("parseAnatomyBlock: deduplicates by ID", (t) => {
  const block = `tabs
- tab item (selected)
- tab item
- selection indicator`;
  const result = parseAnatomyBlock(block);
  const ids = result.parts.map((p) => p.id);
  t.deepEqual(ids, ["tab-item", "selection-indicator"]);
});

test("parseAnatomyBlock: compound line with and", (t) => {
  const block = `help text (placed under the input)
- icon (optional) and text (description or error message)`;
  const result = parseAnatomyBlock(block);
  t.is(result.componentName, "help text");
  t.is(result.parts.length, 2);
  t.is(result.parts[0].id, "icon");
  t.is(result.parts[0].optional, true);
  t.is(result.parts[1].id, "text");
  t.is(result.parts[1].optional, false);
});

test("parseAnatomyBlock: strips root annotation", (t) => {
  const block = `help text (placed under the input)
- icon (optional)`;
  const result = parseAnatomyBlock(block);
  t.is(result.componentName, "help text");
});

test("extractAnatomyBlock: extracts from markdown", (t) => {
  const md = `# Button

## Anatomy

\`\`\`
button
- label
\`\`\`

## Component options
`;
  const block = extractAnatomyBlock(md);
  t.truthy(block);
  t.true(block.includes("button"));
  t.true(block.includes("- label"));
});

test("extractAnatomyBlock: returns null when no anatomy section", (t) => {
  const md = `# Link\n\n## Overview\n\nSome text.`;
  t.is(extractAnatomyBlock(md), null);
});

// --- Tests against the generated registry file ---

const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));

test("generated registry has type and description", (t) => {
  t.is(registry.type, "component-anatomy");
  t.truthy(registry.description);
});

test("generated registry has 60+ components", (t) => {
  const count = Object.keys(registry.components).length;
  t.true(count >= 60, `Expected 60+ components, got ${count}`);
});

test("button has label", (t) => {
  const parts = registry.components.button.parts.map((p) => p.id);
  t.deepEqual(parts, ["label"]);
});

test("slider has track, fill, handle", (t) => {
  const parts = registry.components.slider.parts.map((p) => p.id);
  t.true(parts.includes("track"));
  t.true(parts.includes("fill"));
  t.true(parts.includes("handle"));
});

test("slider label is optional, track is not", (t) => {
  const slider = registry.components.slider;
  const label = slider.parts.find((p) => p.id === "label");
  const track = slider.parts.find((p) => p.id === "track");
  t.is(label.optional, true);
  t.is(track.optional, false);
});

test("checkbox has control and label", (t) => {
  const parts = registry.components.checkbox.parts.map((p) => p.id);
  t.deepEqual(parts, ["control", "label"]);
});

test("standard-dialog has 10+ parts", (t) => {
  const count = registry.components["standard-dialog"].parts.length;
  t.true(count >= 10, `Expected 10+ parts, got ${count}`);
});

test("action-button hold-icon is optional", (t) => {
  const ab = registry.components["action-button"];
  const holdIcon = ab.parts.find((p) => p.id === "hold-icon");
  t.truthy(holdIcon);
  t.is(holdIcon.optional, true);
});

test("tabs deduplicated tab-item", (t) => {
  const parts = registry.components.tabs.parts.map((p) => p.id);
  const tabItemCount = parts.filter((p) => p === "tab-item").length;
  t.is(tabItemCount, 1);
});

// --- Curation tests ---

test("numbering artifacts are normalized to base term", (t) => {
  const ag = registry.components["action-group"];
  const ids = ag.parts.map((p) => p.id);
  t.false(ids.includes("action-button-1"));
  t.false(ids.includes("action-button-2"));
  t.true(ids.includes("action-button"));
});

test("background (token object) is removed from anatomy", (t) => {
  for (const [, component] of Object.entries(registry.components)) {
    const ids = component.parts.map((p) => p.id);
    t.false(
      ids.includes("background"),
      "background should be removed (it is a token object, not anatomy)",
    );
  }
});

test("-area suffixes are renamed to base terms", (t) => {
  const dialog = registry.components["standard-dialog"];
  const ids = dialog.parts.map((p) => p.id);
  t.true(ids.includes("header"));
  t.true(ids.includes("body"));
  t.true(ids.includes("footer"));
  t.false(ids.includes("header-area"));
  t.false(ids.includes("body-area"));
  t.false(ids.includes("footer-area"));
});

test("small-divider renamed to divider", (t) => {
  const accordion = registry.components["accordion"];
  const ids = accordion.parts.map((p) => p.id);
  t.true(ids.includes("divider"));
  t.false(ids.includes("small-divider"));
});

test("composite parts are tagged with tier", (t) => {
  const cards = registry.components["cards"];
  const checkbox = cards.parts.find((p) => p.id === "checkbox");
  t.truthy(checkbox);
  t.is(checkbox.tier, "composite");
});

test("all part IDs are kebab-case", (t) => {
  for (const [componentId, component] of Object.entries(registry.components)) {
    for (const part of component.parts) {
      t.regex(
        part.id,
        /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
        `${componentId} part "${part.id}" is not kebab-case`,
      );
    }
  }
});

test("all components have at least one part", (t) => {
  for (const [componentId, component] of Object.entries(registry.components)) {
    t.true(component.parts.length > 0, `${componentId} has no anatomy parts`);
  }
});

test("no duplicate part IDs within a component", (t) => {
  for (const [componentId, component] of Object.entries(registry.components)) {
    const ids = component.parts.map((p) => p.id);
    const unique = new Set(ids);
    t.is(
      ids.length,
      unique.size,
      `${componentId} has duplicate part IDs: ${ids}`,
    );
  }
});
