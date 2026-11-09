// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  assertStoredSnapshot,
  authoringSnapshotAtom,
  createDefaultSnapshot,
  editSessionSnapshotAtom,
} from "../src/features/edit-session/state";
import { initializeAuthoringPersistence } from "../src/features/edit-session/persistence";
import { upgradePlatformScaleSnapshot } from "../src/features/edit-session/platformScaleUpgrade";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  readAuthoringRecord,
  writeAuthoringRecord,
} from "../src/features/edit-session/storage";
import { modeSetsAtom } from "../src/features/modes/state";
import { persistenceIssuesAtom } from "../src/state/persist";

const saved = createDefaultSnapshot();
assertStoredSnapshot(saved);
saved.modeSets = saved.modeSets.filter((set) => set.key !== "scale");
function removeNewContexts(value: unknown) {
  if (!value || typeof value !== "object") return;
  if ("rows" in value && value.rows && typeof value.rows === "object")
    for (const context of Object.keys(value.rows))
      if (context.includes("mode-set-platform-scale"))
        Reflect.deleteProperty(value.rows, context);
  for (const child of Object.values(value)) removeNewContexts(child);
}
removeNewContexts(saved.structures);
assertStoredSnapshot(saved);
const working = structuredClone(saved);
working.modeSets[0].name = "Keep my working mode name";
const original = structuredClone(working);
const upgraded = upgradePlatformScaleSnapshot(working);
assertStoredSnapshot(upgraded);
assert.deepEqual(working, original);
assert.deepEqual(upgradePlatformScaleSnapshot(upgraded), upgraded);
assert.deepEqual(upgraded.modeSets.slice(0, -1), working.modeSets);
const custom = structuredClone(upgraded);
custom.modeSets.at(-1)!.name = "Keep my platform scale name";
assert.deepEqual(upgradePlatformScaleSnapshot(custom), custom);
const sharedIdentities = new Map<string, string>();
assert.deepEqual(
  upgradePlatformScaleSnapshot(working, sharedIdentities),
  upgradePlatformScaleSnapshot(working, sharedIdentities),
  "Independent baselines allocate matching new row identities.",
);
custom.modeSets.at(-1)!.id = "custom-platform-scale";
assert.deepEqual(upgradePlatformScaleSnapshot(custom), custom);

const data = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  },
});
writeAuthoringRecord({
  version: 24,
  working,
  saved,
  isEditing: true,
  attachments: {},
  savedAttachments: {},
});
const store = createStore();
const stop = initializeAuthoringPersistence(store);
assert.deepEqual(store.get(persistenceIssuesAtom), []);
assert.equal(
  store.get(modeSetsAtom).find((set) => set.key === "scale")?.name,
  "Scale",
  "The Modes page's data source includes the upgraded mode set.",
);
assert.equal(store.get(modeSetsAtom)[0].name, "Keep my working mode name");
assert.deepEqual(
  store.get(editSessionSnapshotAtom)?.structures,
  store.get(authoringSnapshotAtom).structures,
  "Saved and working upgrades share generated row identities.",
);
assert.equal(
  store.get(editSessionSnapshotAtom)?.modeSets[0].name,
  saved.modeSets[0].name,
);
assert.ok(
  store
    .get(editSessionSnapshotAtom)
    ?.modeSets.some((set) => set.key === "scale"),
  "Cancel keeps the new shipped mode set in the independent saved baseline.",
);
stop();
assert.equal(
  JSON.parse(data.get(AUTHORING_STORAGE_KEY)!).version,
  AUTHORING_RECORD_VERSION,
);
writeAuthoringRecord({
  version: AUTHORING_RECORD_VERSION,
  working,
  saved,
  isEditing: false,
  attachments: {},
  savedAttachments: {},
});
const removed = readAuthoringRecord(assertStoredSnapshot);
assert.ok(removed);
assert.ok(!removed.working.modeSets.some((set) => set.key === "scale"));
assert.ok(!removed.saved.modeSets.some((set) => set.key === "scale"));
Reflect.deleteProperty(globalThis, "window");
console.log(
  "Platform scale restores into the Modes UI without losing saved edits.",
);
