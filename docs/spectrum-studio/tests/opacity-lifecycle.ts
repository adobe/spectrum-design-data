// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { editModeAtom } from "../src/state/view/editMode";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { modeSetsAtom, replaceModeSetAtom } from "../src/features/modes/state";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import {
  opacityDocumentAtom,
  opacityResultAtom,
  updateOpacityLevelAtom,
  addOpacityLevelAtom,
  sortOpacityLevelsAtom,
  removeOpacityLevelAtom,
  restoreOpacityLevelAtom,
  resetOpacityOverrideAtom,
} from "../src/features/opacity/state";
import { DEFAULT_SHADOW_OPACITY_ID } from "../src/features/opacity/defaults";
import {
  authoringSnapshotAtom,
  assertStoredSnapshot,
  restoreAuthoringSnapshotAtom,
} from "../src/features/edit-session/state";

const store = createStore();
const initial = store.get(opacityDocumentAtom);
const id = initial.levels[0].id;
assert.throws(
  () => store.set(updateOpacityLevelAtom, { id, value: 0.44 }),
  /edit mode/,
);
store.set(editModeAtom, true);
store.set(modeSelectionAtom, { colorScheme: "mode-dark" });
store.set(updateOpacityLevelAtom, { id, value: 0.44 });
assert.deepEqual(store.get(opacityDocumentAtom), initial);
assert.equal(store.get(opacityResultAtom).levels[0].value, 0.44);
assert.equal(store.get(opacityResultAtom).levels[0].overridden, true);
store.set(resetOpacityOverrideAtom, id);
assert.equal(store.get(opacityResultAtom).levels[0].value, 0.02);
assert.equal(store.get(opacityResultAtom).levels[0].overridden, false);
store.set(modeSelectionAtom, { colorScheme: "mode-light" });
store.set(updateOpacityLevelAtom, { id, value: 0.44 });
assert.equal(store.get(opacityDocumentAtom).levels[0].value, 0.44);
assert.equal(store.get(opacityResultAtom).levels[0].value, 0.44);
assert.throws(
  () => store.set(removeOpacityLevelAtom, DEFAULT_SHADOW_OPACITY_ID),
  /opacity token|shadows/i,
);
assert.ok(
  store
    .get(opacityDocumentAtom)
    .levels.some((level) => level.id === DEFAULT_SHADOW_OPACITY_ID),
);

const added = store.set(addOpacityLevelAtom);
assert.equal(store.get(opacityDocumentAtom).levels.at(-1)?.id, added);
assert.equal(
  Object.keys(store.get(opacityDocumentAtom).levels.at(-1)!.rows).length,
  2,
);
const identities = new Set(
  store.get(opacityDocumentAtom).levels.map((level) => level.id),
);
store.set(sortOpacityLevelsAtom);
assert.equal(store.get(opacityDocumentAtom).levels[0].id, added);
assert.deepEqual(
  new Set(store.get(opacityDocumentAtom).levels.map((level) => level.id)),
  identities,
);
const removed = store.set(removeOpacityLevelAtom, added);
store.set(restoreOpacityLevelAtom, removed);
assert.deepEqual(store.get(opacityDocumentAtom).levels[0], removed.level);
store.set(removeOpacityLevelAtom, added);

const axis = store
  .get(modeSetsAtom)
  .find((set) => set.id === "mode-set-color-scheme")!;
store.set(replaceModeSetAtom, {
  ...axis,
  modes: [
    ...axis.modes,
    {
      ...axis.modes[1],
      id: "mode-dim",
      key: "dim",
      name: "Dim",
      foundations: { color: { backgroundLightness: 0.2 } },
    },
  ],
});
assert.ok(
  store
    .get(opacityDocumentAtom)
    .levels.every((level) => Object.keys(level.rows).length === 3),
);
const snapshot = store.get(authoringSnapshotAtom);
assertStoredSnapshot(snapshot);
const restored = createStore();
restored.set(restoreAuthoringSnapshotAtom, snapshot);
assert.deepEqual(
  restored.get(opacityDocumentAtom),
  store.get(opacityDocumentAtom),
);
assert.deepEqual(
  restored.get(browserTokenEditsAtom),
  store.get(browserTokenEditsAtom),
);
console.log(
  "Opacity lifecycle: editing, manual reset, sorting, shadow protection, Undo and saved identities pass.",
);
