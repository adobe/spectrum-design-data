// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { elementsSurfaceStyleAtom } from "../src/state/view/elementsSurface";
import { appColorSchemeAtom } from "../src/state/view/appAppearance";
import { colorSystemDocumentAtom } from "../src/features/color-system/state";
import { modeSetsAtom } from "../src/features/modes/state";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { activeModesAtom } from "../src/features/modes/selection";
import { previewOverridesAtom } from "../src/features/modes/previewState";
import { modePreviewSurface } from "../src/features/color-system/previewSurface";
import { authoringSnapshotAtom } from "../src/features/edit-session/state";

const store = createStore();
const before = store.get(authoringSnapshotAtom);
const light = store.get(elementsSurfaceStyleAtom);
assert.equal(light["--elements-preview-foreground"], "#000000");
store.set(appColorSchemeAtom, "dark");
assert.deepEqual(
  store.get(elementsSurfaceStyleAtom),
  light,
  "Studio's appearance must not choose opacity preview colors.",
);
const sets = store.get(modeSetsAtom);
const scheme = sets.find((set) => set.key === "colorScheme")!;
const darkMode = scheme.modes.find((mode) => mode.key === "dark")!;
store.set(modeSelectionAtom, { [scheme.key]: darkMode.id });
const dark = store.get(elementsSurfaceStyleAtom);
assert.equal(dark["--elements-preview-foreground"], "#ffffff");
assert.notEqual(dark["--checkerboard-base"], light["--checkerboard-base"]);
assert.deepEqual(
  modePreviewSurface(
    store.get(colorSystemDocumentAtom),
    store.get(activeModesAtom),
    sets,
  ),
  dark,
  "Dialog-local modes resolve exactly the same surface as Opacity Elements.",
);
store.set(previewOverridesAtom, { "color.backgroundLightness": 0.6 });
assert.notDeepEqual(store.get(elementsSurfaceStyleAtom), dark);
const local = modePreviewSurface(
  store.get(colorSystemDocumentAtom),
  sets.map((set) => set.modes.find((mode) => mode.id === set.defaultModeId)!),
  sets,
);
assert.deepEqual(
  local,
  light,
  "Local named modes ignore global adaptive overrides.",
);
assert.equal(store.get(modeSelectionAtom)[scheme.key], darkMode.id);
assert.deepEqual(store.get(authoringSnapshotAtom), before);
console.log(
  "Authored opacity surfaces, local mode isolation and appearance independence passed.",
);
