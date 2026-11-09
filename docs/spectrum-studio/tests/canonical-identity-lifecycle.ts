// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  assertStoredSnapshot,
  createDefaultSnapshot,
  authoringSnapshotAtom,
  editSessionSnapshotAtom,
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
  resetAllAuthoringAtom,
} from "../src/features/edit-session/state";
import { upgradeCanonicalTokenIdentities } from "../src/features/edit-session/canonicalIdentityUpgrade";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import { tokenIdentity } from "../src/features/tokens/canonicalIdentity";
import { componentTokenCatalog } from "../src/features/components/references";
import { canonicalJson } from "../src/features/design-data/canonicalJson";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { resetBrowserTokenAtom } from "../src/features/tokens/browserState";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  readAuthoringRecord,
} from "../src/features/edit-session/storage";

const conceptId = "56d6a66d-931e-4f8b-bf07-c1a73e7924e8";
const seeded = createDefaultSnapshot();
const prototype = structuredClone(seeded);
prototype.browserTokenEdits = {};
const legacyRows = canonicalAliasRows(
  completeAliasSource(prototype),
  buildTshirtArtifacts(prototype),
);
const old = legacyRows.find(
  (row) => row.name === "accessory-gap-extra-large" && row.context === "[]",
)!;
const legacyTargets = componentTokenCatalog(prototype);
const seededTargets = componentTokenCatalog(seeded);
for (const component of prototype.components!.components)
  for (const assignment of component.assignments) {
    if (!assignment.$ref) continue;
    const target = seededTargets.find(
      (target) => target.id === assignment.$ref,
    )!;
    const identity = tokenIdentity(
      seeded.browserTokenEdits!,
      target.browserId!,
    )!;
    const legacy = legacyTargets.find(
      (candidate) =>
        candidate.browserId === identity.sourceId &&
        canonicalJson(candidate.context) === canonicalJson(target.context),
    );
    assert(
      legacy,
      `The prototype component target ${target.name} must be recoverable.`,
    );
    assignment.$ref = legacy.id;
  }
prototype.browserTokenEdits[old.token.id] = {
  values: {},
  description: "Preserve this authored description.",
  authoring: { assignments: { "[]": { kind: "literal", value: 17 } } },
};
prototype.aliases!.tokens.push({
  id: crypto.randomUUID(),
  name: "old-accessory-gap",
  $ref: old.id,
  contexts: [old.context],
});
assertStoredSnapshot(prototype);
console.log("Prototype fixture and legacy component references validated.");
const saved = structuredClone(prototype);
saved.browserTokenEdits![old.token.id].description =
  "Keep the separate saved state.";
const allocations = new Map<string, string>();
const upgraded = upgradeCanonicalTokenIdentities(prototype, allocations);
const upgradedSaved = upgradeCanonicalTokenIdentities(saved, allocations);
assertStoredSnapshot(upgraded);
assertStoredSnapshot(upgradedSaved);
assert.equal(
  upgraded.browserTokenEdits![conceptId].description,
  "Preserve this authored description.",
);
assert.equal(
  upgradedSaved.browserTokenEdits![conceptId].description,
  "Keep the separate saved state.",
);
assert.deepEqual(
  upgraded.browserTokenEdits![conceptId].authoring!.identity,
  upgradedSaved.browserTokenEdits![conceptId].authoring!.identity,
);
assert.equal(upgraded.aliases!.tokens[0].$ref, conceptId);
assert.deepEqual(
  upgraded.structures,
  prototype.structures,
  "Structure references remain generator coordinates.",
);
assert.deepEqual(
  upgraded.colorSystem.dataVisScales,
  prototype.colorSystem.dataVisScales,
);
assert(!upgraded.browserTokenEdits![old.token.id]);
const upgradedRows = canonicalAliasRows(
  completeAliasSource(upgraded),
  buildTshirtArtifacts(upgraded),
);
assert(
  upgradedRows
    .filter((row) => row.id === conceptId)
    .every((row) => row.token.value === 17),
);
assert.deepEqual(upgradeCanonicalTokenIdentities(upgraded), upgraded);
const migratedTargets = componentTokenCatalog(upgraded);
for (const component of upgraded.components!.components)
  for (const assignment of component.assignments)
    if (assignment.$ref)
      assert(
        migratedTargets.some((target) => target.id === assignment.$ref),
        `Migrated component reference ${assignment.$ref} must resolve.`,
      );
assert(
  migratedTargets
    .filter((target) => target.browserId === conceptId)
    .every((target) => target.value === "17px"),
);
console.log(
  "Canonical reconciliation and migrated component values validated.",
);
const conflict = structuredClone(prototype);
conflict.browserTokenEdits![conceptId] = {
  values: {},
  description: "Conflicting edits.",
};
assert.throws(() => upgradeCanonicalTokenIdentities(conflict), /conflict/i);
assert.equal(
  conflict.browserTokenEdits![old.token.id].description,
  "Preserve this authored description.",
);

const hidden = structuredClone(upgraded);
hidden.typography.hideFromPublishing = true;
const inactive = upgradeCanonicalTokenIdentities(hidden);
for (const [id, edit] of Object.entries(upgraded.browserTokenEdits!))
  assert.deepEqual(
    inactive.browserTokenEdits![id]?.authoring?.identity,
    edit.authoring?.identity,
  );

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}
const localStorage = new MemoryStorage();
const events = new EventTarget();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage,
    sessionStorage: new MemoryStorage(),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  },
});
try {
  localStorage.setItem(
    AUTHORING_STORAGE_KEY,
    JSON.stringify({
      version: 27,
      working: prototype,
      saved,
      isEditing: true,
      attachments: {},
      savedAttachments: {},
    }),
  );
  const record = readAuthoringRecord(
    assertStoredSnapshot,
    (value) => value,
    undefined,
    upgradeCanonicalTokenIdentities,
  )!;
  assert.equal(record.version, AUTHORING_RECORD_VERSION);
  assert.equal(
    record.working.browserTokenEdits![conceptId].description,
    "Preserve this authored description.",
  );
  assert.equal(
    record.saved.browserTokenEdits![conceptId].description,
    "Keep the separate saved state.",
  );
  assert.deepEqual(
    record.working.browserTokenEdits![conceptId].authoring!.identity,
    record.saved.browserTokenEdits![conceptId].authoring!.identity,
  );
  const { initializeAuthoringPersistence } =
    await import("../src/features/edit-session/persistence");
  const { flushPersistedState } = await import("../src/state/persist");
  const store = createStore();
  let dispose = initializeAuthoringPersistence(store, {
    validateScheduled: null,
  });
  console.log("Stored prototype restored.");
  store.set(enterEditModeAtom);
  const edits = structuredClone(store.get(browserTokenEditsAtom));
  edits[conceptId].description = "Saved canonical edit.";
  store.set(browserTokenEditsAtom, edits);
  store.set(saveEditAtom);
  console.log("Canonical edit saved.");
  const committed = structuredClone(store.get(editSessionSnapshotAtom));
  dispose();
  const reload = createStore();
  dispose = initializeAuthoringPersistence(reload, { validateScheduled: null });
  assert.deepEqual(reload.get(authoringSnapshotAtom), committed);
  const pendingBaseline = structuredClone(committed);
  const baselineIdentity =
    pendingBaseline.browserTokenEdits![conceptId].authoring!.identity!;
  const mobileContext = Object.keys(baselineIdentity.rows).find(
    (context) => context !== "[]",
  )!;
  delete baselineIdentity.rows[mobileContext];
  reload.set(editSessionSnapshotAtom, pendingBaseline);
  flushPersistedState();
  assert.deepEqual(
    reload.get(editSessionSnapshotAtom),
    committed,
    "Flush retains shared row UUIDs and applies the reconciled saved baseline in memory.",
  );
  reload.set(enterEditModeAtom);
  const unsaved = structuredClone(reload.get(browserTokenEditsAtom));
  unsaved[conceptId].description = "Cancel this edit.";
  reload.set(browserTokenEditsAtom, unsaved);
  flushPersistedState();
  reload.set(cancelEditAtom);
  assert.deepEqual(reload.get(authoringSnapshotAtom), committed);
  reload.set(enterEditModeAtom);
  const resetEdits = structuredClone(reload.get(browserTokenEditsAtom));
  const resetId = Object.keys(resetEdits).find((id) =>
    resetEdits[id].authoring?.identity?.sourceId.startsWith("spacing-"),
  )!;
  const retainedIdentity = structuredClone(
    resetEdits[resetId].authoring!.identity,
  );
  resetEdits[resetId].description = "Remove this override, not its identity.";
  reload.set(browserTokenEditsAtom, resetEdits);
  reload.set(resetBrowserTokenAtom, resetId);
  assert.equal(
    reload.get(browserTokenEditsAtom)[resetId].description,
    undefined,
  );
  assert.deepEqual(
    reload.get(browserTokenEditsAtom)[resetId].authoring!.identity,
    retainedIdentity,
  );
  const resetTargets = componentTokenCatalog(reload.get(authoringSnapshotAtom));
  for (const component of committed.components!.components)
    for (const assignment of component.assignments)
      if (assignment.$ref)
        assert(resetTargets.some((target) => target.id === assignment.$ref));
  reload.set(cancelEditAtom);
  reload.set(resetAllAuthoringAtom);
  assert.deepEqual(reload.get(browserTokenEditsAtom), seeded.browserTokenEdits);
  dispose();
} finally {
  Reflect.deleteProperty(globalThis, "window");
}
console.log(
  "Prototype reference migration, conflicts, independent snapshots, inactive IDs, save/reload, cancel, and reset pass.",
);
