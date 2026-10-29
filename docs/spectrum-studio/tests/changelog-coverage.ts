// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import {
  CHANGE_DOMAINS,
  assertDomainCoverage,
  compareAuthoring,
} from "../src/features/changelog/registry";
import { readPath, restorePath } from "../src/features/changelog/contract";
import {
  assertChangeSchemaCoverage,
  assertImpactSourceCoverage,
} from "../scripts/check-changelog-coverage";
import {
  itemResetPlan,
  prepareChangeReset,
} from "../src/features/changelog/resetPlans";
import schema from "../src/data/design-system.schema.json" with { type: "json" };

const shipped = createDefaultSnapshot();
const baseline = compareAuthoring(shipped, structuredClone(shipped));
assert.deepEqual(baseline.groups, []);
assert.ok(baseline.slots.length > 0);
assert.equal(
  new Set(baseline.slots.map((slot) => slot.id)).size,
  baseline.slots.length,
);
assert.deepEqual(
  Object.keys(CHANGE_DOMAINS).sort(),
  Object.keys(shipped).sort(),
);
const unsupported = { ...shipped, unregisteredDomain: {} };
assert.throws(
  () => assertDomainCoverage(unsupported),
  /no registered coverage/,
);
const changedSchema = structuredClone(schema);
Object.assign(changedSchema.definitions.Platform.properties, {
  futureSavedField: { type: "string" },
});
assert.throws(
  () => assertChangeSchemaCoverage(changedSchema),
  /Authoring fields changed/,
);
const changedVariant = structuredClone(schema);
Object.assign(changedVariant.definitions.Platform.properties, {
  name: { anyOf: [{ type: "string" }, { type: "number" }] },
});
assert.throws(
  () => assertChangeSchemaCoverage(changedVariant),
  /Authoring fields changed/,
  "type and union changes are checked, not just property names",
);

assertImpactSourceCoverage(["color"], 'category: "color"');
assert.throws(
  () => assertImpactSourceCoverage(["motion"], 'category: "color"'),
  /without a foundation impact source/,
);
assertImpactSourceCoverage(["motion"], "", { motion: "Documented exemption." });

const working = structuredClone(shipped);
working.platforms[0].name = "Renamed platform";
working.typography.textZoom += 0.1;
working.typography.maxTextSize += 1;
const comparison = compareAuthoring(shipped, working);
const platform = comparison.groups.find((group) => group.id === "platforms")!
  .items[0];
assert.equal(platform.fields.length, 1);
assert.equal(platform.fields[0].key, "Name");
assert.ok(platform.address);
const restored = restorePath(working, shipped, platform.address);
assert.equal(restored.platforms[0].name, shipped.platforms[0].name);
assert.equal(restored.typography.textZoom, working.typography.textZoom);
const typography = comparison.groups
  .find((group) => group.id === "foundations")!
  .items.find((item) => item.sourceKind === "typography")!;
const zoom = typography.fields.find((field) => field.key === "Text zoom")!;
const fieldReset = restorePath(working, shipped, zoom.address!);
assert.equal(fieldReset.typography.textZoom, shipped.typography.textZoom);
assert.equal(fieldReset.typography.maxTextSize, working.typography.maxTextSize);
assert.throws(
  () => restorePath(restored, shipped, platform.address!),
  /updated/,
);
assert.equal(readPath(working, platform.address.path) !== undefined, true);

const withRemoval = structuredClone(shipped);
withRemoval.platforms = [];
const removed = compareAuthoring(shipped, withRemoval).groups.find(
  (group) => group.id === "platforms",
)!.items[0];
assert.equal(removed.kind, "removed");
assert.equal(
  restorePath(withRemoval, shipped, removed.address!).platforms.length,
  1,
);
assert.equal(
  compareAuthoring(shipped, withRemoval).slots.filter(
    (slot) => slot.category === "platforms",
  ).length,
  baseline.slots.filter((slot) => slot.category === "platforms").length,
);
const added = structuredClone(shipped);
added.platforms.push({ id: "test-platform", name: "Test platform" });
assert.equal(
  compareAuthoring(shipped, added).slots.filter(
    (slot) => slot.category === "platforms",
  ).length,
  baseline.slots.filter((slot) => slot.category === "platforms").length + 1,
);

const modeEdit = structuredClone(shipped);
const colorSet = modeEdit.modeSets.find((set) => set.key === "colorScheme")!;
const dark = colorSet.modes.find((mode) => mode.key === "dark")!;
dark.foundations.color = {
  ...dark.foundations.color,
  backgroundLightness: 0.2,
};
assert.ok(
  compareAuthoring(shipped, modeEdit).slots.some(
    (slot) =>
      slot.category === "modes" && slot.foundation === "color" && slot.changed,
  ),
);
const attachments = compareAuthoring(shipped, shipped, {
  [colorSet.id]: ["color"],
});
assert.equal(attachments.groups[0].id, "modes");
assert.ok(attachments.slots.some((slot) => slot.changed));
colorSet.name = "Updated color scheme";
const modeComparison = compareAuthoring(shipped, modeEdit);
const modeParent = modeComparison.groups
  .find((group) => group.id === "modes")!
  .items.find((item) => item.sourceKind === "mode-set")!;
assert.equal(
  modeParent.address,
  undefined,
  "metadata cards cannot restore the whole mode set after child modes are separated",
);
const restoredParent = prepareChangeReset(
  { ...modeEdit, attachments: {} },
  itemResetPlan(modeParent),
);
assert.equal(
  restoredParent.modeSets.find((set) => set.id === colorSet.id)!.name,
  shipped.modeSets.find((set) => set.id === colorSet.id)!.name,
);
assert.equal(
  restoredParent.modeSets
    .find((set) => set.id === colorSet.id)!
    .modes.find((mode) => mode.id === dark.id)!.foundations.color
    .backgroundLightness,
  0.2,
);

console.log(
  "changelog coverage: registered sources, union inventories and scoped reset addresses passed",
);
