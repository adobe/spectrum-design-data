// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import gapData from "../src/data/design-data-gaps.json" with { type: "json" };
import {
  crosswalkFieldDefaults,
  crosswalkHandoff,
  crosswalkIssues,
  crosswalkLifecycle,
  taxonomyCrosswalk,
  toComparisonName,
  toDesignDataName,
  type TaxonomyCrosswalk,
} from "../src/features/design-data/taxonomyCrosswalk";

const root = fileURLToPath(new URL("..", import.meta.url));

// The shipped crosswalk is valid and every rule points at a real gap and RFC.
assert.deepEqual(crosswalkIssues(taxonomyCrosswalk), []);
const gapIds = new Set(gapData.gaps.map((gap) => gap.id));
for (const rule of taxonomyCrosswalk.rules) {
  assert.ok(gapIds.has(rule.gapId), `${rule.id}: unknown gap ${rule.gapId}`);
  assert.ok(
    existsSync(`${root}/${rule.rfc}`),
    `${rule.id}: missing ${rule.rfc}`,
  );
}

// Foundation property defaults come from the crosswalk, not a second table.
assert.deepEqual(crosswalkFieldDefaults("property"), {
  colors: "color",
  spacing: "spacing",
  size: "size",
  radius: "corner-radius",
  elevation: "shadow",
  opacity: "opacity",
});

// Primitive colors: property is added first, text scale steps become numbers.
assert.deepEqual(
  Object.entries(
    toDesignDataName(
      { colorFamily: "blue", scaleIndex: "100" },
      { tokenType: "colors" },
    ),
  ),
  [
    ["property", "color"],
    ["colorFamily", "blue"],
    ["scaleIndex", 100],
  ],
);
// An explicit Studio property is kept.
assert.deepEqual(
  toDesignDataName({ property: "background color" }, { tokenType: "colors" }),
  { property: "background color" },
);
// Legacy saved keys only translate for their token type.
assert.deepEqual(
  toDesignDataName(
    { colorName: "blue", contrastValue: "200" },
    { tokenType: "colors" },
  ),
  { property: "color", colorFamily: "blue", scaleIndex: 200 },
);
assert.deepEqual(
  toDesignDataName({ colorName: "blue" }, { tokenType: "spacing" }),
  { property: "spacing", colorName: "blue" },
);

// Term spellings, including arrays, then key renames.
assert.deepEqual(
  toDesignDataName({
    property: "corner radius",
    size: ["small", "extra large"],
    fontWeight: "regular weight",
    axis: "horizontal",
  }),
  {
    property: "corner-radius",
    size: ["s", "xl"],
    weight: "regular",
    orientation: "horizontal",
  },
);
// A key rename never overwrites a field that is already present.
assert.deepEqual(toDesignDataName({ axis: "x", orientation: "y" }), {
  axis: "x",
  orientation: "y",
});

// Studio-only fields stay in output names but are ignored when comparing.
const rendered = { colorFamily: "blue", renderingBehavior: "opaque" };
assert.equal(
  toDesignDataName(rendered, { tokenType: "colors" }).renderingBehavior,
  "opaque",
);
assert.deepEqual(toComparisonName(rendered, { tokenType: "colors" }), {
  property: "color",
  colorFamily: "blue",
});

// Translating twice changes nothing.
for (const name of [
  { colorName: "red", contrastValue: "300" },
  { property: "drop shadow", size: "medium", axis: "vertical" },
]) {
  const once = toDesignDataName(name, { tokenType: "colors" });
  assert.deepEqual(toDesignDataName(once, { tokenType: "colors" }), once);
}

// Validation catches unsafe rules.
const broken: TaxonomyCrosswalk = {
  ...taxonomyCrosswalk,
  rules: [
    taxonomyCrosswalk.rules[0],
    { ...taxonomyCrosswalk.rules[0], rfc: "" },
    {
      ...taxonomyCrosswalk.rules[0],
      id: "XW-900",
      kind: "rename-term",
      studio: { key: "size", terms: { small: "s", tiny: "s" } },
      designData: { field: "size" },
    },
  ],
};
const issues = crosswalkIssues(broken);
assert.ok(issues.some((issue) => issue.includes("duplicate rule id")));
assert.ok(issues.some((issue) => issue.includes("needs an RFC")));
assert.ok(issues.some((issue) => issue.includes("same design-data value")));

// Rules retire once design-data publishes the Studio vocabulary.
const sizeRule = taxonomyCrosswalk.rules.find(
  (rule) => rule.kind === "rename-term" && rule.studio.key === "size",
)!;
const axisRule = taxonomyCrosswalk.rules.find(
  (rule) => rule.kind === "rename-key" && rule.studio.key === "axis",
)!;
const lifecycle = crosswalkLifecycle(taxonomyCrosswalk, {
  fields: new Set(["property", "axis"]),
  terms: new Map([["size", new Set(Object.keys(sizeRule.studio.terms ?? {}))]]),
  rfcs: new Set([sizeRule.rfc]),
});
assert.ok(lifecycle.readyToRetire.includes(sizeRule.id));
assert.ok(lifecycle.readyToRetire.includes(axisRule.id));
assert.equal(lifecycle.readyToRetire.length, 2);
assert.ok(
  lifecycle.missingRfc.every(
    (id) =>
      taxonomyCrosswalk.rules.find((rule) => rule.id === id)!.rfc !==
      sizeRule.rfc,
  ),
);

// Tripwire: once design-data publishes Studio's vocabulary, the rule must be deleted.
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const fieldsDir = `${repoRoot}/packages/design-data/fields`;
const designDataFields = new Set<string>();
const designDataTerms = new Map<string, Set<string>>();
for (const file of readdirSync(fieldsDir).filter((name) =>
  name.endsWith(".json"),
)) {
  const field = JSON.parse(readFileSync(`${fieldsDir}/${file}`, "utf8")) as {
    name: string;
    registry?: string | null;
  };
  designDataFields.add(field.name);
  if (!field.registry) continue;
  const registry = JSON.parse(
    readFileSync(`${repoRoot}/${field.registry}`, "utf8"),
  ) as { values?: { id: string }[] };
  designDataTerms.set(
    field.name,
    new Set((registry.values ?? []).map((value) => value.id)),
  );
}
assert.ok(designDataFields.has("property"), "design-data fields not found");
assert.deepEqual(
  crosswalkLifecycle(taxonomyCrosswalk, {
    fields: designDataFields,
    terms: designDataTerms,
  }).readyToRetire,
  [],
  "design-data now covers these rules: delete them and run pnpm crosswalk:handoff",
);

// The agent handoff page is generated from the rules and never edited by hand.
assert.equal(
  readFileSync(`${root}/docs/rfcs/design-data-handoff.md`, "utf8"),
  crosswalkHandoff(),
  "docs/rfcs/design-data-handoff.md is stale: run pnpm crosswalk:handoff",
);

console.log("taxonomy-crosswalk: ok");
