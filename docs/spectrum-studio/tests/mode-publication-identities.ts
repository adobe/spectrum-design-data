// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  authoringSourceSnapshotAtom,
  enterEditModeAtom,
} from "../src/features/edit-session/state";
import { componentTokenCatalog } from "../src/features/components/references";
import { componentsDocumentAtom } from "../src/features/components/documentState";
import { previewOverridesAtom } from "../src/features/modes/previewState";
import {
  removeModeSetAtom,
  restoreModeSetAtom,
} from "../src/features/modes/state";
import {
  isTokenIdentity,
  reconcileTokenIdentityRows,
} from "../src/features/tokens/canonicalIdentity";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import type { BrowserTokenEdits } from "../src/features/tokens/browserEditTypes";

const store = createStore();
store.set(enterEditModeAtom);
const before = structuredClone(store.get(authoringSourceSnapshotAtom));
const scheme = before.modeSets.find((axis) => axis.key === "colorScheme")!;
const remaining = before.modeSets.filter((axis) => axis.id !== scheme.id);
const key = (mode: string) => canonicalTokenModeKey({ [scheme.id]: mode });
const rows: Record<string, string> = Object.fromEntries(
  scheme.modes.map((mode) => [key(mode.id), crypto.randomUUID()]),
);
const id = crypto.randomUUID();
const edit: BrowserTokenEdits = {
  [id]: {
    values: {},
    authoring: {
      assignments: {},
      identity: {
        sourceId: "mode-publication-fixture",
        conceptId: id,
        name: { property: "opacity" },
        rows,
      },
    },
  },
};
const original = structuredClone(edit);
const collapsed = reconcileTokenIdentityRows(
  edit,
  before.modeSets,
  remaining,
  new Map([["mode-publication-fixture", new Set(["[]"])]]),
);
const identity = collapsed[id].authoring!.identity!;
assert.equal(identity.rows["[]"], rows[key(scheme.defaultModeId)]);
assert.equal(identity.rows[key(scheme.defaultModeId)], undefined);
for (const mode of scheme.modes.filter(
  (mode) => mode.id !== scheme.defaultModeId,
))
  assert.equal(identity.rows[key(mode.id)], rows[key(mode.id)]);
assert.ok(isTokenIdentity(identity));
assert.deepEqual(
  reconcileTokenIdentityRows(
    collapsed,
    remaining,
    before.modeSets,
    new Map([["mode-publication-fixture", new Set(Object.keys(rows))]]),
  ),
  original,
  "Restoring the axis restores its original row mapping, not replacement UUIDs.",
);
assert.deepEqual(edit, original);

const fresh = structuredClone(collapsed);
fresh[id].authoring!.identity!.rows = { "[]": identity.rows["[]"] };
const expanded = reconcileTokenIdentityRows(
  fresh,
  remaining,
  before.modeSets,
  new Map([["mode-publication-fixture", new Set(Object.keys(rows))]]),
)[id].authoring!.identity!;
assert.equal(expanded.rows[key(scheme.defaultModeId)], identity.rows["[]"]);
assert.ok(isTokenIdentity(expanded));
assert.equal(Object.keys(expanded.rows).length, scheme.modes.length);
for (const mode of scheme.modes.filter(
  (mode) => mode.id !== scheme.defaultModeId,
))
  assert.ok(!Object.values(rows).includes(expanded.rows[key(mode.id)]));
assert.deepEqual(fresh[id].authoring!.identity!.rows, {
  "[]": identity.rows["[]"],
});
const allocations: { sourceId: string; context: string }[] = [];
const shared = reconcileTokenIdentityRows(
  fresh,
  remaining,
  before.modeSets,
  new Map([["mode-publication-fixture", new Set(Object.keys(rows))]]),
  (sourceId, context) => {
    allocations.push({ sourceId, context });
    return rows[context];
  },
);
assert.deepEqual(shared, original);
assert.deepEqual(
  allocations,
  scheme.modes
    .filter((mode) => mode.id !== scheme.defaultModeId)
    .map((mode) => ({
      sourceId: "mode-publication-fixture",
      context: key(mode.id),
    })),
  "Shared allocations fill only missing rows; existing default publications still take precedence.",
);
assert.deepEqual(fresh[id].authoring!.identity!.rows, {
  "[]": identity.rows["[]"],
});
const contrast = before.modeSets.find((axis) => axis.key === "contrast")!;
const ambiguous = structuredClone(edit);
ambiguous[id].authoring!.identity!.rows = {
  [key(scheme.defaultModeId)]: crypto.randomUUID(),
  [canonicalTokenModeKey({ [contrast.id]: contrast.defaultModeId })]:
    crypto.randomUUID(),
};
const beforeAmbiguous = structuredClone(ambiguous);
assert.throws(
  () =>
    reconcileTokenIdentityRows(
      ambiguous,
      before.modeSets,
      [],
      new Map([["mode-publication-fixture", new Set(["[]"])]]),
    ),
  /ambiguous default publications/,
);
assert.deepEqual(ambiguous, beforeAmbiguous);

const published = new Map(
  componentTokenCatalog(before).map((token) => [token.id, token]),
);
const removed = store.set(removeModeSetAtom, scheme.id);
const after = store.get(authoringSourceSnapshotAtom);
const current = new Map(
  componentTokenCatalog(after).map((token) => [token.id, token]),
);
for (const component of before.components!.components)
  for (const assignment of component.assignments) {
    if (!assignment.$ref) continue;
    assert.ok(
      current.has(assignment.$ref),
      "Surviving default references keep their published IDs.",
    );
    assert.deepEqual(
      current.get(assignment.$ref)!.value,
      published.get(assignment.$ref)!.value,
    );
  }
assert.deepEqual(after.components, before.components);
for (const entry of Object.values(after.browserTokenEdits!))
  if (entry.authoring?.identity)
    assert.ok(isTokenIdentity(entry.authoring.identity));
store.set(restoreModeSetAtom, {
  modeSet: scheme,
  index: before.modeSets.findIndex((axis) => axis.id === scheme.id),
  tokenValues: removed,
});
assert.deepEqual(
  store.get(authoringSourceSnapshotAtom).browserTokenEdits,
  before.browserTokenEdits,
);
assert.deepEqual(
  store.get(authoringSourceSnapshotAtom).components,
  before.components,
);
const colorAssignment = before
  .components!.components.flatMap((component) =>
    component.assignments.map((assignment) => ({ component, assignment })),
  )
  .find(
    ({ assignment }) =>
      assignment.$ref && published.get(assignment.$ref)?.property === "color",
  )!;
assert.ok(colorAssignment);
const originalTarget = published.get(colorAssignment.assignment.$ref!)!;
const darkTarget = [...published.values()].find(
  (token) =>
    token.browserId === originalTarget.browserId &&
    token.context.colorScheme === "dark" &&
    !token.outputError,
)!;
assert.ok(darkTarget);
const components = structuredClone(before.components!);
const darkAssignment = components.components
  .find((component) => component.id === colorAssignment.component.id)!
  .assignments.find(
    (assignment) => assignment.id === colorAssignment.assignment.id,
  )!;
darkAssignment.$ref = darkTarget.id;
darkAssignment.options = {
  ...darkAssignment.options,
  ...Object.fromEntries(
    Object.entries(darkTarget.context).map(([axis, mode]) => [
      axis,
      String(mode),
    ]),
  ),
};
store.set(componentsDocumentAtom, components);
store.set(previewOverridesAtom, { "color.backgroundLightness": 0.4 });
const beforeRejected = structuredClone(store.get(authoringSourceSnapshotAtom));
assert.throws(
  () => store.set(removeModeSetAtom, scheme.id),
  /no longer published or available/,
);
assert.deepEqual(store.get(authoringSourceSnapshotAtom), beforeRejected);
assert.deepEqual(store.get(previewOverridesAtom), {
  "color.backgroundLightness": 0.4,
});
console.log(
  "Mode removal preserves default publications, inactive identities, references and exact Undo mappings.",
);
