// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { createDataVisSnapshot } from "./fixtures/dataVis";
import {
  assertStoredSnapshot,
  authoringSourceSnapshotAtom,
  restoreAuthoringSnapshotAtom,
  saveEditAtom,
  editSessionSnapshotAtom,
  enterEditModeAtom,
} from "../src/features/edit-session/state";
import { upgradeCanonicalTokenIdentities } from "../src/features/edit-session/canonicalIdentityUpgrade";
import { addModeSetAtom } from "../src/features/modes/state";
import { createMode, type ModeSet } from "../src/features/modes/model";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import {
  isTokenIdentity,
  tokenIdentity,
} from "../src/features/tokens/canonicalIdentity";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import { tokenStableKey, tokenUuid } from "../src/features/tokens/model";

const store = createStore();
const initial = createDataVisSnapshot();
store.set(restoreAuthoringSnapshotAtom, {
  ...initial,
  components: { ...initial.components!, components: [] },
});
store.set(enterEditModeAtom);
const modes = Array.from({ length: 3 }, (_, index) => ({
  ...createMode(),
  key: `scope-${index}`,
  name: `Scope ${index}`,
}));
const axis: ModeSet = {
  id: crypto.randomUUID(),
  key: "scopedSave",
  name: "Scoped save",
  description: "",
  modes,
  defaultModeId: modes[0].id,
  authoringCapabilities: [],
};
store.set(addModeSetAtom, axis);
const source = store.get(authoringSourceSnapshotAtom);
const category = source.colorSystem.dataVisScales.find(
  (scale) => scale.kind === "categorical",
)!;
assert.equal(category.kind, "categorical");
const upstream = category.members[0].source;
assert.equal(upstream.kind, "ui-swatch");
const uiId = tokenUuid(tokenStableKey(upstream.scaleId, upstream.contrastId));
const original = tokenIdentity(source.browserTokenEdits!, uiId)!;
assert.ok(original);
const context = canonicalTokenModeKey(
  Object.fromEntries(
    source.modeSets.map((set) => [
      set.id,
      set.id === axis.id ? modes[1].id : set.defaultModeId,
    ]),
  ),
);
store.set(browserTokenEditsAtom, {
  ...source.browserTokenEdits,
  [original.conceptId]: {
    ...source.browserTokenEdits![original.conceptId],
    values: { [context]: { value: "#111111", baseline: "#333333" } },
  },
});
const before = structuredClone(store.get(authoringSourceSnapshotAtom));
const upgraded = upgradeCanonicalTokenIdentities(before);
for (const edit of Object.values(upgraded.browserTokenEdits!)) {
  const identity = edit.authoring?.identity;
  if (!identity) continue;
  const seen = new Set<string>();
  const repeated = Object.entries(identity.rows).filter(([, uuid]) => {
    if (seen.has(uuid)) return true;
    seen.add(uuid);
    return false;
  });
  assert.ok(
    isTokenIdentity(identity),
    `Invalid publication ${identity.sourceId}: ${JSON.stringify(repeated.slice(0, 3))}`,
  );
}
assertStoredSnapshot(upgraded);
assert.deepEqual(store.get(authoringSourceSnapshotAtom), before);
store.set(saveEditAtom);
assert.deepEqual(
  store.get(authoringSourceSnapshotAtom),
  store.get(editSessionSnapshotAtom),
);
const saved = store.get(editSessionSnapshotAtom)!;
const current = tokenIdentity(saved.browserTokenEdits!, uiId)!;
for (const uuid of Object.values(original.rows))
  assert.ok(Object.values(current.rows).includes(uuid));
console.log("Scoped Save preserves valid, unique publication identities.");
