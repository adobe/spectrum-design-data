// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  assertStoredSnapshot,
  createDefaultSnapshot,
} from "../src/features/edit-session/state";
import { createGraySnapshot } from "./fixtures/customContrasts";
import { createStructureSnapshot } from "./fixtures/structures";

const defaults = createDefaultSnapshot();
for (const custom of [false, true]) {
  const snapshot = createGraySnapshot(custom);
  assert.doesNotThrow(() => assertStoredSnapshot(snapshot));
  assert.deepEqual(
    new Set(snapshot.colorSystem.scales.map((scale) => scale.id)),
    new Set(defaults.colorSystem.scales.map((scale) => scale.id)),
    "Contrast fixtures retain every shipped source identity.",
  );
  assert.equal(snapshot.colorSystem.scales[0].name, "Gray");
  assert.equal(
    snapshot.colorSystem.scales[0].customContrasts?.steps.length,
    custom ? 13 : undefined,
  );
  assert.equal(snapshot.colorSystem.scales[1].customContrasts, undefined);
  assert.deepEqual(
    snapshot.components,
    defaults.components,
    "Fixture setup never removes protected Component relationships.",
  );
  assert.deepEqual(snapshot.structures, defaults.structures);
}
const structure = createStructureSnapshot();
assert.doesNotThrow(() => assertStoredSnapshot(structure));
assert.equal(structure.structures!.structures[0].name, "Example structure");
assert.deepEqual(
  structure.structures!.structures.slice(1),
  defaults.structures!.structures,
);
assert.deepEqual(structure.components, defaults.components);
assert.deepEqual(
  createDefaultSnapshot(),
  defaults,
  "Fixture factories do not mutate shipped defaults.",
);
console.log(
  "Performance fixtures: valid complete snapshots, retained source identities, protected relationships and independent defaults passed.",
);
