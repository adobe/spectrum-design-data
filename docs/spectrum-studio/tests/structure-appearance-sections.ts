// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  APPEARANCE_SECTIONS,
  APPEARANCE_SLOT_SECTIONS,
  appearanceSectionsFor,
} from "../src/panels/structures/appearanceSections";

assert.deepEqual(
  APPEARANCE_SECTIONS.map((section) => section.label),
  ["Layout", "Typography", "Color", "Elevation"],
  "Sections appear in a fixed order.",
);

const ids = new Set(APPEARANCE_SECTIONS.map((section) => section.id));
for (const [slot, section] of Object.entries(APPEARANCE_SLOT_SECTIONS))
  assert(ids.has(section), `${slot} maps to a known section.`);

for (const slot of [
  "direction",
  "horizontal",
  "vertical",
  "width",
  "minWidth",
  "maxHeight",
  "gap",
  "paddingTop",
  "radiusBottomLeft",
] as const)
  assert.equal(APPEARANCE_SLOT_SECTIONS[slot], "layout");
assert.equal(APPEARANCE_SLOT_SECTIONS.fontSize, "typography");
assert.equal(APPEARANCE_SLOT_SECTIONS.elevation, "elevation");

assert.deepEqual(
  appearanceSectionsFor(["elevation", "gap", "direction"]).map(
    (section) => section.id,
  ),
  ["layout", "elevation"],
  "Only used sections are shown, in display order.",
);
assert.deepEqual(
  appearanceSectionsFor(["fontSize"], ["layout"]).map((section) => section.id),
  ["layout", "typography"],
  "Extra sections can be requested for non-slot controls.",
);
assert.deepEqual(appearanceSectionsFor([]), []);

console.log("Structure appearance sections passed.");
