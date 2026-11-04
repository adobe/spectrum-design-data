// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  assertStoredSnapshot,
  createDefaultSnapshot,
  type EditSessionSnapshot,
} from "../src/features/edit-session/state";
import { compareAuthoring } from "../src/features/changelog/registry";
import { readPath } from "../src/features/changelog/contract";
import {
  itemResetPlan,
  manualTokenResetPlan,
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";
import type { ChangeField } from "../src/features/changelog/changes";
import { createNewTokenEdit } from "../src/features/tokens/creationFlow";
import { structureSlot } from "../src/features/structures/model";
import {
  encodeStructureSource,
  decodeStructureSource,
} from "../src/features/edit-session/structureSourceCodec";

const shipped = createDefaultSnapshot();
function reviewField(
  name: string,
  mutate: (snapshot: EditSessionSnapshot) => void,
  matches: (field: ChangeField) => boolean,
) {
  const working = structuredClone(shipped);
  working.platforms[0].name = "Keep this unrelated edit";
  mutate(working);
  assertStoredSnapshot(working);
  const field = compareAuthoring(shipped, working)
    .groups.flatMap((group) => group.items)
    .flatMap((item) => item.fields)
    .find(matches);
  assert.ok(field?.address, `${name} needs a field-level reset address.`);
  const reset = prepareChangeReset(
    { ...working, attachments: {} },
    sourceResetPlan(`Restore ${name}`, [field.address]),
  );
  assert.deepEqual(
    readPath(reset, field.address.path),
    readPath(shipped, field.address.path),
    `${name} resets to its shipped value.`,
  );
  assert.equal(reset.platforms[0].name, "Keep this unrelated edit");
}
const endsWith = (key: string) => (field: ChangeField) =>
  field.address?.path.at(-1) === key;

reviewField(
  "Color scale type",
  (snapshot) => {
    snapshot.colorSystem.settings.colorScaleType = "opaque";
  },
  endsWith("colorScaleType"),
);
reviewField(
  "Opacity-linked default stops",
  (snapshot) => {
    snapshot.colorSystem.settings.syncDefaultStopsWithOpacity = true;
  },
  endsWith("syncDefaultStopsWithOpacity"),
);

reviewField(
  "Registry category applicability",
  (snapshot) => {
    snapshot.taxonomy!.categories[0].appliesTo = "raw";
  },
  endsWith("appliesTo"),
);
for (const key of ["backgroundBlend", "colorSourceCurveOffset"] as const)
  reviewField(
    key,
    (snapshot) => {
      snapshot.colorSystem.settings[key] += 0.01;
    },
    endsWith(key),
  );
reviewField(
  "Color interpolation",
  (snapshot) => {
    snapshot.colorSystem.scales[0].interpolation = "oklch";
  },
  endsWith("interpolation"),
);
for (const channel of ["lightness", "hue", "chroma"] as const)
  reviewField(
    `${channel} absolute adjustment`,
    (snapshot) => {
      const mode = snapshot.modeSets
        .find((set) => set.key === "colorScheme")!
        .modes.find((mode) => mode.key === "wireframe")!;
      const adjustment = mode.foundations.color!.scaleAdjustment!;
      assert.equal(adjustment.method, "absolute");
      if (adjustment.method === "absolute") adjustment.color[channel] += 0.01;
    },
    (field) =>
      field.address?.path.includes("scaleAdjustment") === true &&
      field.address.path.at(-1) === channel,
  );
reviewField(
  "Adjustment method",
  (snapshot) => {
    snapshot.modeSets
      .find((set) => set.key === "colorScheme")!
      .modes.find(
        (mode) => mode.key === "wireframe",
      )!.foundations.color!.scaleAdjustment = {
      method: "relative",
      hue: 20,
      chroma: 50,
    };
  },
  (field) => field.address?.path.at(-1) === "scaleAdjustment",
);
reviewField(
  "Registered variant category",
  (snapshot) => {
    const list = snapshot.structures!.structures.find(
      (item) => item.name === "List-item",
    )!;
    const density = list.editor!.properties.find(
      (item) => item.name === "Density",
    )!;
    assert.equal(density.kind, "variant");
    if (density.kind === "variant") delete density.categoryId;
  },
  (field) =>
    field.address?.path.includes("editor") === true &&
    field.address.path.at(-1) === "properties",
);
reviewField(
  "Structure numeric layout value",
  (snapshot) => {
    const structure = snapshot.structures!.structures[0];
    const binding = structure.properties.find(
      (item) => structureSlot(item) === "paddingLeft",
    )!;
    structure.properties = structure.properties.map((item) =>
      item.id === binding.id
        ? {
            id: item.id,
            classification: item.classification,
            value: { kind: "number", value: 5, unit: "px" },
          }
        : item,
    );
  },
  (field) =>
    field.address?.path.includes("properties") === true &&
    field.address.path.at(-1) === "properties",
);
reviewField(
  "Structure numeric leaf value",
  (snapshot) => {
    const structure = snapshot.structures!.structures[0];
    for (const element of structure.elements!.filter(
      (item) => item.kind === "workflowIcon",
    ))
      if (element.kind !== "structureReference")
        element.bindings = element.bindings.map((item) =>
          item.slot === "size"
            ? {
                id: item.id,
                slot: item.slot,
                family: item.family,
                value: { kind: "number", value: 5, unit: "px" },
              }
            : item,
        );
  },
  (field) =>
    field.address?.path.includes("elements") === true &&
    field.address.path.at(-1) === "elements",
);

const disabled = structuredClone(shipped);
disabled.platforms[0].name = "Keep this unrelated edit";
disabled.components!.components = [];
const scale = disabled.colorSystem.scales.find((item) => item.customContrasts)!;
scale.disabledCustomContrasts = scale.customContrasts;
delete scale.customContrasts;
assertStoredSnapshot(disabled);
assert.deepEqual(
  decodeStructureSource(encodeStructureSource(disabled)),
  disabled,
);
const scaleChange = compareAuthoring(shipped, disabled)
  .groups.flatMap((group) => group.items)
  .find((item) =>
    item.address?.path.some(
      (part) => typeof part === "object" && part.id === scale.id,
    ),
  );
assert.ok(scaleChange);
assert.ok(
  scaleChange.fields.some((field) =>
    field.address?.path.includes("disabledCustomContrasts"),
  ),
);
const restoredScale = prepareChangeReset(
  { ...disabled, attachments: {} },
  itemResetPlan(scaleChange),
);
assert.deepEqual(
  restoredScale.colorSystem.scales.find((item) => item.id === scale.id),
  shipped.colorSystem.scales.find((item) => item.id === scale.id),
);
assert.equal(restoredScale.platforms[0].name, "Keep this unrelated edit");
assert.deepEqual(restoredScale.components, disabled.components);

const manual = structuredClone(shipped);
manual.platforms[0].name = "Keep this unrelated edit";
const family = manual.taxonomy!.categories.find(
  (category) => category.key === "colorFamily",
)!;
const familyTerm = manual.taxonomy!.terms.find(
  (term) => term.categoryId === family.id,
)!;
const draft = createNewTokenEdit(
  manual.taxonomy!,
  { tier: "raw", type: "colors", terms: { [family.id]: familyTerm.id } },
  manual.browserTokenEdits ?? {},
  [],
);
manual.browserTokenEdits = { ...manual.browserTokenEdits, ...draft };
assertStoredSnapshot(manual);
const restoredManual = prepareChangeReset(
  { ...manual, attachments: {} },
  manualTokenResetPlan(manual),
);
assert.deepEqual(restoredManual.browserTokenEdits, shipped.browserTokenEdits);
assert.equal(restoredManual.platforms[0].name, "Keep this unrelated edit");
console.log(
  "Combined schema review: Registry applicability, color settings/interpolation, mode adjustments, variant categories, retained custom contrasts and unbound manual drafts have reset coverage that preserves unrelated edits.",
);
