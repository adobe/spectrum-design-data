// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { removeModeCapability } from "../src/features/modes/foundationSettings";
import { COLOR_PARAMETERS } from "../src/features/color-system/resolution";
import { synchronizeOpacityRows } from "../src/features/opacity/generation";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import { buildCascadeTokenInventory } from "../src/features/tokens/cascadeExport";
import { tokenOwningModeKey } from "../src/features/tokens/owningModes";

const source = createDefaultSnapshot();
const scheme = source.modeSets.find((axis) => axis.key === "colorScheme")!;
assert.ok(scheme.authoringCapabilities?.includes("color.scaleAdjustment"));
source.modeSets = [
  COLOR_PARAMETERS.filter(
    (capability) => capability !== "color.scaleAdjustment",
  ).reduce(
    (axis, capability) => removeModeCapability(axis, capability),
    scheme,
  ),
];
source.opacity = synchronizeOpacityRows(source);
const before = structuredClone(source);
const rows = canonicalAliasRows(
  completeAliasSource(source),
  undefined,
  "preserve-for-review",
);
const primitiveColors = rows.filter(
  (row) =>
    row.token.type === "colors" &&
    !row.token.paletteColorId &&
    !row.token.dataVis,
);
const changing = primitiveColors.find((row) =>
  primitiveColors.some(
    (other) => other.id === row.id && other.token.value !== row.token.value,
  ),
)!;
assert.ok(
  changing,
  "The fixture exercises real variation from scale adjustment alone.",
);
const contexts = primitiveColors.filter((row) => row.id === changing.id);
assert.equal(contexts.length, scheme.modes.length);
for (const row of contexts) {
  const pairs: [string, string][] = JSON.parse(row.context);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0][0], scheme.id);
  assert.equal(tokenOwningModeKey(row.token, source, row.context), row.context);
}
assert.ok(
  rows
    .filter((row) => row.token.paletteColorId)
    .every((row) => row.context === "[]"),
  "Palette literals remain independent of adaptive color modes.",
);
const inventory = buildCascadeTokenInventory({
  base: source.colorSystem,
  opacity: source.opacity,
  modeSets: source.modeSets,
  activeModes: [],
  activeTokens: [],
  overrides: source.tokenOverrides,
  browserEdits: source.browserTokenEdits!,
  taxonomy: source.taxonomy,
  rules: source.rules,
});
assert.ok(changing.token.sourceId);
const references = inventory.colorReferences.filter(
  (target) => target.id === changing.token.sourceId,
);
assert.equal(references.length, scheme.modes.length);
assert.equal(
  new Set(references.map((target) => target.rowId)).size,
  scheme.modes.length,
);
for (const row of contexts) {
  const pairs: [string, string][] = JSON.parse(row.context);
  const mode = scheme.modes.find((mode) => mode.id === pairs[0][1])!;
  const reference = references.find(
    (target) => target.context === row.context,
  )!;
  assert.ok(reference);
  const output = inventory.tokens.find(
    (token) => token.uuid === reference.rowId,
  )!;
  assert.ok(output);
  assert.equal(
    output.name[scheme.key] ??
      scheme.modes.find((mode) => mode.id === scheme.defaultModeId)!.key,
    mode.key,
  );
  assert.equal(output.value, row.token.value);
}
assert.deepEqual(source, before);
console.log(
  "Scale-adjustment-only modes retain alias, export and Impact contexts without changing palette literals.",
);
