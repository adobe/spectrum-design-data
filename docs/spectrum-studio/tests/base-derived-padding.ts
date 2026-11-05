// Copyright 2026 Adobe. All rights reserved.
// Base padding intent: Min height steps the Size scale, vertical padding is centered
// in Min height, and typed horizontal padding scales by the Type scale ratio.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import { formatTshirtName } from "../src/features/design-data/tshirtProfile";
import { tshirtFixtureReferences } from "./fixtures/tshirt";
import { centerInMinHeight } from "../src/features/structures/resolution";
import {
  EMPTY_STRUCTURE_PREVIEW,
  resolveStructureOptions,
  structureEditor,
} from "../src/features/structures/variants";
import { structureGeneration } from "../src/features/structures/model";

const LEFT = "a6e9b02a-e8c6-8728-8550-80f3ff512e33";
const MIN_HEIGHT = "0d911b7b-0994-8d52-bca7-6abe7b8ba874";

// Centering rounds to whole pixels and never goes below zero.
assert.deepEqual(centerInMinHeight(32, 18), { value: 7 });
assert.deepEqual(centerInMinHeight(24, 15), { value: 5 });
const clamped = centerInMinHeight(16, 20);
assert.equal(clamped.value, 0);
assert.match(clamped.issue!, /taller than Min height/);

function baseValues(snapshot: ReturnType<typeof createDefaultSnapshot>) {
  const base = snapshot.structures!.structures.find(
    (structure) => structure.name === "Base",
  )!;
  const rows = buildTshirtArtifacts(snapshot, "shipped").semantics.filter(
    (row) =>
      row.structureId === base.conceptId &&
      !row.optionId &&
      !row.token.name.element,
  );
  const pick = (prefix: string) =>
    ["extra-small", "small", "medium", "large", "extra-large"].map(
      (size) =>
        rows.find(
          (row) => formatTshirtName(row.token.name) === `${prefix}-${size}`,
        )!.target.value,
    );
  return {
    base,
    minHeight: pick("base-min-height"),
    vertical: pick("base-padding-vertical"),
    horizontal: pick("base-padding-horizontal"),
    radius: pick("base-corner-radius"),
  };
}

const snapshot = createDefaultSnapshot();
const shipped = baseValues(snapshot);
assert.deepEqual(shipped.minHeight, [20, 24, 32, 40, 48]);
assert.deepEqual(shipped.vertical, [3, 4, 7, 10, 13]);
assert.deepEqual(shipped.horizontal, [9, 11, 12, 14, 15]);

// Editing the single Medium horizontal value rescales every size by the Type scale ratio.
{
  const edited = structuredClone(snapshot);
  const base = edited.structures!.structures.find((s) => s.name === "Base")!;
  for (const binding of base.properties)
    if ("value" in binding && binding.value.kind === "number")
      binding.value = { ...binding.value, value: 16 };
  const values = baseValues(edited);
  assert.deepEqual(values.horizontal, [13, 14, 16, 18, 20]);
  assert.deepEqual(values.vertical, shipped.vertical);
  assert.deepEqual(values.radius, shipped.radius);
}

// Changing the Type scale ratio only moves the typed horizontal padding.
{
  const edited = structuredClone(snapshot);
  const typography = edited.scaleTypes!.find(
    (type) => type.id === "scale-type-typography",
  )!;
  typography.parameters = typography.parameters!.map((parameter) =>
    parameter.id === "ratio" ? { ...parameter, default: 1.25 } : parameter,
  );
  const values = baseValues(edited);
  assert.deepEqual(values.horizontal, [8, 10, 12, 15, 19]);
  assert.deepEqual(values.minHeight, shipped.minHeight);
  assert.deepEqual(values.radius, shipped.radius);
}

// Moving Min height re-centers vertical padding without touching horizontal padding.
{
  const edited = structuredClone(snapshot);
  const base = edited.structures!.structures.find((s) => s.name === "Base")!;
  const minHeight = base.properties.find(
    (binding) => binding.id === MIN_HEIGHT,
  )!;
  assert.ok("$ref" in minHeight);
  const references = tshirtFixtureReferences(edited);
  const current = references.find((ref) => ref.id === minHeight.$ref)!;
  minHeight.$ref = references.find(
    (ref) => ref.sourceId === current.sourceId && ref.value === 40,
  )!.id;
  const values = baseValues(edited);
  assert.deepEqual(values.minHeight, [24, 32, 40, 48, 56]);
  assert.deepEqual(values.vertical, [5, 8, 11, 14, 17]);
  assert.deepEqual(values.horizontal, shipped.horizontal);
}

// Hiding padding through an option prunes typed and derived targets, keeping Min height.
{
  const { base } = shipped;
  const editor = structureEditor(base);
  const horizontal = editor.properties.find(
    (p) => p.name === "Horizontal padding",
  )!;
  const vertical = editor.properties.find(
    (p) => p.name === "Vertical padding",
  )!;
  assert.ok(horizontal.kind === "variant" && vertical.kind === "variant");
  const none = resolveStructureOptions(base, {
    ...EMPTY_STRUCTURE_PREVIEW,
    options: {
      [horizontal.id]: horizontal.options.find((o) => o.name === "None")!.id,
      [vertical.id]: vertical.options.find((o) => o.name === "None")!.id,
    },
  }).structure;
  const targets = structureGeneration(none).applications.flatMap(
    (application) =>
      application.targets.kind === "custom"
        ? application.targets.bindingIds
        : [],
  );
  assert.ok(targets.includes(MIN_HEIGHT));
  assert.ok(!targets.includes(LEFT));
}

console.log(
  "Base derived padding: centering, Type scale ratio, Min height stepping and option pruning passed.",
);
