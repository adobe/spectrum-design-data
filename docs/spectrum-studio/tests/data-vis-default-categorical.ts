// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  createDefaultSnapshot,
  restoreAuthoringSnapshotAtom,
} from "../src/features/edit-session/state";
import {
  dataVisUiSwatchesAtom,
  resolvedCategoricalTokensAtom,
} from "../src/features/color-system/data-vis/state";
import { uiSwatchKey } from "../src/features/color-system/data-vis/resolution";

const store = createStore();
const snapshot = createDefaultSnapshot();
store.set(restoreAuthoringSnapshotAtom, snapshot);
const scale = snapshot.colorSystem.dataVisScales.find(
  (scale) => scale.id === "data-vis-categorical",
);
assert.ok(scale?.kind === "categorical", "The default Categorical scale ships");
const swatches = new Set(store.get(dataVisUiSwatchesAtom).map((s) => s.id));
const missing = scale.members.filter(
  (member) => !swatches.has(uiSwatchKey(member.source)),
);
assert.deepEqual(
  missing.map((member) => member.id),
  [],
  "Every default Categorical color links to a published UI swatch",
);
const tokens = store
  .get(resolvedCategoricalTokensAtom)
  .filter((token) => token.dataVis?.scaleId === scale.id);
assert.equal(tokens.length, 20);
for (const token of tokens)
  assert.ok(
    token.value,
    `${token.name} has no color: ${token.validationError}`,
  );
console.log("data-vis-default-categorical: ok");
