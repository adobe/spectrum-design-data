// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { mock } from "node:test";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { upgradeCanonicalTokenIdentities } from "../src/features/edit-session/canonicalIdentityUpgrade";
import { prepareAuthoringResult } from "../src/features/edit-session/recordPreparation";
import { AUTHORING_RECORD_VERSION } from "../src/features/edit-session/storage";

const source = createDefaultSnapshot();
const before = structuredClone(source);
const allocation = mock.method(crypto, "randomUUID");
try {
  const reconciled = upgradeCanonicalTokenIdentities(source);
  assert.deepEqual(reconciled, before);
  assert.equal(JSON.stringify(reconciled), JSON.stringify(before));
  assert.equal(reconciled.styles, source.styles);
  assert.equal(reconciled.styles!.publications, source.styles!.publications);
  assert.equal(reconciled.components, source.components);
  assert.equal(allocation.mock.callCount(), 0);

  const recipe = source.styles!.recipes[0];
  const originalIcon = source.styles!.examples[recipe.id]?.icon;
  const icon = originalIcon === "Add" ? "Checkmark" : "Add";
  source.styles!.examples[recipe.id] = { icon };
  const changed = upgradeCanonicalTokenIdentities(source);
  assert.equal(changed.styles!.examples[recipe.id].icon, icon);
  assert.equal(changed.styles, source.styles);
  assert.equal(changed.components, source.components);
  assert.equal(allocation.mock.callCount(), 0);

  const prepared = prepareAuthoringResult({
    version: AUTHORING_RECORD_VERSION,
    working: source,
    saved: source,
    isEditing: true,
    attachments: {},
    savedAttachments: {},
  });
  assert.equal(prepared.stylePublicationsChanged, false);
  assert.equal(prepared.browserTokenEditsChanged, false);
  assert.equal(prepared.savedChanged, false);
  assert.deepEqual(prepared.record.working, source);
  assert.deepEqual(prepared.record.saved, source);
  assert.equal(allocation.mock.callCount(), 0);
} finally {
  allocation.mock.restore();
}
console.log(
  "Canonical identity reconciliation: zero no-op allocations, shared publications/assignments, mutable-input revalidation and truthful worker change flags passed.",
);
