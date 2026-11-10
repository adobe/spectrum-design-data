// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  removeColorTokenRecords,
  restoreColorTokenRecords,
} from "../src/features/color-system/colorTokenCleanup";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { tokenOverridesAtom } from "../src/features/tokens/overrides";
import { aliasesAtom } from "../src/features/tokens/aliasState";
import { resetTokenEdit } from "../src/features/tokens/canonicalIdentity";

const store = createStore();
const nativeId = crypto.randomUUID();
const conceptId = crypto.randomUUID();
const unrelatedId = crypto.randomUUID();
const originalEdits = {
  [conceptId]: {
    description: "Restore this description.",
    values: {},
    authoring: {
      assignments: {},
      identity: {
        sourceId: nativeId,
        conceptId,
        name: { property: "color", colorFamily: "test", scaleIndex: 100 },
        rows: { "[]": crypto.randomUUID() },
      },
    },
  },
  [nativeId]: { description: "Legacy description.", values: {} },
  [unrelatedId]: { description: "Unrelated description.", values: {} },
};
const override = {
  value: "#123456",
  editedAt: "2026-01-01T00:00:00Z",
  baseline: {
    name: { colorName: "test", contrastValue: "100" },
    value: "#ffffff",
  },
};
const originalOverrides = {
  [nativeId]: override,
  [conceptId]: override,
  [unrelatedId]: override,
};
const originalAliases = {
  schemaVersion: 1 as const,
  tokens: [
    {
      id: crypto.randomUUID(),
      name: "canonical-name",
      $ref: conceptId,
      contexts: ["[]"],
    },
    {
      id: crypto.randomUUID(),
      name: "legacy-name",
      $ref: nativeId,
      contexts: ["[]"],
    },
    {
      id: crypto.randomUUID(),
      name: "unrelated-name",
      $ref: unrelatedId,
      contexts: ["[]"],
    },
  ],
};
store.set(browserTokenEditsAtom, structuredClone(originalEdits));
store.set(tokenOverridesAtom, structuredClone(originalOverrides));
store.set(aliasesAtom, structuredClone(originalAliases));

const removed = removeColorTokenRecords(
  store.get,
  store.set,
  new Set([nativeId]),
);
assert.deepEqual(store.get(browserTokenEditsAtom), {
  [conceptId]: resetTokenEdit(originalEdits[conceptId]),
  [unrelatedId]: originalEdits[unrelatedId],
});
assert.deepEqual(store.get(tokenOverridesAtom), {
  [unrelatedId]: originalOverrides[unrelatedId],
});
assert.deepEqual(store.get(aliasesAtom).tokens, [originalAliases.tokens[2]]);
assert.deepEqual(
  Object.keys(removed.browserEdits).sort(),
  [nativeId, conceptId].sort(),
);
assert.deepEqual(
  removed.aliases.map((alias) => alias.id).sort(),
  originalAliases.tokens
    .slice(0, 2)
    .map((alias) => alias.id)
    .sort(),
);
assert.deepEqual(
  originalEdits[conceptId].description,
  "Restore this description.",
);

store.set(browserTokenEditsAtom, {
  ...store.get(browserTokenEditsAtom),
  [unrelatedId]: { ...originalEdits[unrelatedId], description: "Later edit." },
});
restoreColorTokenRecords(store.get, store.set, removed);
assert.deepEqual(store.get(browserTokenEditsAtom), {
  ...originalEdits,
  [unrelatedId]: { ...originalEdits[unrelatedId], description: "Later edit." },
});
assert.deepEqual(store.get(tokenOverridesAtom), originalOverrides);
assert.deepEqual(
  store
    .get(aliasesAtom)
    .tokens.map((alias) => alias.id)
    .sort(),
  originalAliases.tokens.map((alias) => alias.id).sort(),
);
restoreColorTokenRecords(store.get, store.set, removed);
assert.equal(
  store.get(aliasesAtom).tokens.length,
  3,
  "Undo does not duplicate aliases.",
);

const removedAgain = removeColorTokenRecords(
  store.get,
  store.set,
  new Set([nativeId]),
);
const retained = store.get(browserTokenEditsAtom)[conceptId];
const identity = retained.authoring!.identity!;
const addedContext = JSON.stringify([
  [crypto.randomUUID(), crypto.randomUUID()],
]);
const expandedIdentity = {
  ...identity,
  rows: { ...identity.rows, [addedContext]: crypto.randomUUID() },
};
store.set(browserTokenEditsAtom, {
  ...store.get(browserTokenEditsAtom),
  [conceptId]: {
    ...retained,
    authoring: { ...retained.authoring!, identity: expandedIdentity },
  },
});
restoreColorTokenRecords(store.get, store.set, removedAgain);
assert.equal(
  store.get(browserTokenEditsAtom)[conceptId].description,
  originalEdits[conceptId].description,
);
assert.deepEqual(
  store.get(browserTokenEditsAtom)[conceptId].authoring!.identity,
  expandedIdentity,
  "Undo preserves publication rows allocated after deletion.",
);

const removedAfterContext = removeColorTokenRecords(
  store.get,
  store.set,
  new Set([nativeId]),
);
const later = {
  ...store.get(browserTokenEditsAtom)[conceptId],
  description: "Keep the later edit to the inactive publication.",
};
store.set(browserTokenEditsAtom, {
  ...store.get(browserTokenEditsAtom),
  [conceptId]: later,
});
restoreColorTokenRecords(store.get, store.set, removedAfterContext);
assert.deepEqual(store.get(browserTokenEditsAtom)[conceptId], later);
console.log("Color cleanup preserves publication identities and scoped Undo.");
