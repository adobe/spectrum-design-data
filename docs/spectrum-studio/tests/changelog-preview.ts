// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  buildChangeGroups,
  defaultColorDocument,
  generateDocumentTokens,
} from "../src/features/changelog/changes";
import { createValuePreview } from "../src/features/tokens/valuePreview";
import { resolveToken } from "../src/features/tokens/model";
import { SPACING_DEFAULTS } from "../src/features/spacing/defaults";
import { ELEVATION_DEFAULTS } from "../src/features/elevation/defaults";
import {
  elevationChanges,
  elevationTokenChanges,
} from "../src/features/elevation/changes";
import { tshirtTokenChanges } from "../src/features/design-data/tshirtChanges";
import { createTshirtFixture } from "./fixtures/tshirt";

const baseline = generateDocumentTokens(defaultColorDocument);
const resolved = baseline.map((token) => resolveToken(token, undefined));
const original = structuredClone(resolved[0]);
const updated = resolved.map((token, index) =>
  index === 0 ? { ...token, value: "#123456", valueOverridden: true } : token,
);
const groups = buildChangeGroups(
  defaultColorDocument,
  updated,
  undefined,
  baseline,
);
const fields = groups.find((group) => group.id === "tokens")!.items[0].fields;
const changedValue = fields.find((field) => field.key === "Value")!;
assert.equal(changedValue.before, original.generated.value);
assert.equal(changedValue.after, "#123456");
assert.deepEqual(
  changedValue.beforePreview,
  createValuePreview("color", original.generated.value),
);
assert.deepEqual(
  changedValue.afterPreview,
  createValuePreview("color", "#123456"),
);
assert.equal(changedValue.generated, false);
assert.equal(
  groups[0].count,
  fields.length,
  "preview metadata does not add changed fields",
);
assert.deepEqual(
  resolved[0],
  original,
  "preview adapters preserve source values",
);

for (const removed of [false, true]) {
  const document = structuredClone(defaultColorDocument);
  const spacing = structuredClone(SPACING_DEFAULTS);
  const scale = spacing.scales[0];
  if (removed) spacing.scales.shift();
  else scale.base = 12;
  const change = buildChangeGroups(
    document,
    resolved,
    undefined,
    baseline,
    undefined,
    undefined,
    spacing,
  )
    .find((group) => group.id === "foundations")!
    .items.find((item) => item.id === scale.id)!;
  if (removed) {
    assert.ok(
      change.fields.every(
        (field) =>
          field.after === undefined && field.afterPreview === undefined,
      ),
      "removed values do not fabricate a new preview",
    );
  } else {
    const base = change.fields.find((field) => field.key === "Base")!;
    assert.equal(
      base.beforePreview,
      undefined,
      "an inherited formula base is not a recorded explicit override",
    );
    assert.deepEqual(
      base.afterPreview,
      createValuePreview("block", scale.base!, "px"),
    );
  }
  for (const field of change.fields.filter((field) => field.key !== "Base"))
    assert.equal(field.afterPreview, undefined);
}

const elevation = structuredClone(ELEVATION_DEFAULTS);
elevation.color = "#123456";
const color = elevationChanges(ELEVATION_DEFAULTS, elevation)[0].fields.find(
  (field) => field.key === "color",
)!;
assert.deepEqual(
  color.beforePreview,
  createValuePreview("shadow-color", ELEVATION_DEFAULTS.color),
);
assert.deepEqual(
  color.afterPreview,
  createValuePreview("shadow-color", "#123456"),
);
const oldShadow = {
  id: "shadow",
  type: "elevation" as const,
  groupId: "scale",
  groupLabel: "Scale",
  unit: "" as const,
  name: "old",
  generatedName: "old",
  value: "0 2px 4px #0008",
  generatedValue: "0 2px 4px #0008",
};
const newShadow = { ...oldShadow, value: "0 4px 8px #0008" };
const shadowChanges = elevationTokenChanges(
  [{ modeKey: "[]", sources: [newShadow], baseline: [oldShadow] }],
  new Set(),
);
assert.deepEqual(
  shadowChanges[0].fields[0].beforePreview,
  createValuePreview("shadow", oldShadow.value),
);
assert.deepEqual(
  shadowChanges[0].fields[0].afterPreview,
  createValuePreview("shadow", newShadow.value),
);

const fixture = createTshirtFixture();
const latest = structuredClone(fixture.bundle);
latest.semantics[0].target.value = Number(latest.semantics[0].target.value) + 1;
const semanticField = tshirtTokenChanges(fixture.bundle, latest)[0].fields.find(
  (field) => field.key.startsWith("Resolved value"),
)!;
assert.equal(semanticField.beforePreview?.kind, "block");
assert.equal(semanticField.afterPreview?.kind, "block");
assert.equal(semanticField.generated, true);
for (const item of tshirtTokenChanges(fixture.bundle, latest))
  for (const field of item.fields.filter(
    (field) => !field.key.startsWith("Resolved value"),
  )) {
    assert.equal(field.beforePreview, undefined);
    assert.equal(
      field.afterPreview,
      undefined,
      "alias references and names stay text-only",
    );
  }
console.log(
  "Changelog before/after preview and count-preservation checks passed.",
);
