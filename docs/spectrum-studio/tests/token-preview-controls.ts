// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { authoringSnapshotAtom } from "../src/features/edit-session/state";
import { browserTokensAtom } from "../src/features/tokens/browserState";
import { savedBrowserTokensAtom } from "../src/features/tokens/browserSavedState";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import {
  resetModeAtom,
  displayedModeIdsAtom,
} from "../src/features/modes/preview";
import { modeSetsAtom } from "../src/features/modes/state";
import {
  setPreviewParameterAtom,
  previewOverridesAtom,
  clearPreviewParametersAtom,
} from "../src/features/modes/previewState";

const store = createStore();
const baseline = store.get(authoringSnapshotAtom);
const saved = store.get(savedBrowserTokensAtom);
const edits = store.get(browserTokenEditsAtom);
const initial = store.get(browserTokensAtom);
const colorSet = store
  .get(modeSetsAtom)
  .find((set) => set.key === "colorScheme");
assert.ok(colorSet);
const dark = colorSet.modes.find((mode) => mode.key === "dark");
assert.ok(dark);
store.set(resetModeAtom, { modeSetKey: colorSet.key, modeId: dark.id });
assert.ok(
  store
    .get(browserTokensAtom)
    .some(
      (token) =>
        token.type === "colors" &&
        initial.find((source) => source.id === token.id)?.value !== token.value,
    ),
  "Mode selection updates displayed color token values.",
);
store.set(resetModeAtom, {
  modeSetKey: colorSet.key,
  modeId: colorSet.defaultModeId,
});
assert.deepEqual(store.get(browserTokensAtom), initial);

const text = initial.find((token) => token.id === "typography-font-size-100");
assert.ok(text);
store.set(setPreviewParameterAtom, {
  parameterId: "typography.textZoom",
  value: 2,
});
assert.notEqual(
  store.get(browserTokensAtom).find((token) => token.id === text.id)?.value,
  text.value,
  "Adaptive text size updates the existing displayed token.",
);
store.set(clearPreviewParametersAtom, ["typography.textZoom"]);
assert.deepEqual(
  store.get(browserTokensAtom),
  initial,
  "Reset restores mode-generated values.",
);
store.set(setPreviewParameterAtom, {
  parameterId: "color.backgroundLightness",
  value: 0.42,
});
store.set(resetModeAtom, { modeSetKey: colorSet.key, modeId: dark.id });
assert.equal(
  store.get(previewOverridesAtom)["color.backgroundLightness"],
  undefined,
);
assert.equal(store.get(displayedModeIdsAtom)[colorSet.key], dark.id);
assert.deepEqual(
  store.get(authoringSnapshotAtom),
  baseline,
  "Preview controls do not edit authoring data.",
);
assert.deepEqual(
  store.get(savedBrowserTokensAtom),
  saved,
  "Preview controls do not change saved token baselines.",
);
assert.deepEqual(
  store.get(browserTokenEditsAtom),
  edits,
  "Preview controls create no token overrides.",
);
console.log(
  "Token mode selection, adaptive values, reset and saved-baseline isolation passed.",
);
