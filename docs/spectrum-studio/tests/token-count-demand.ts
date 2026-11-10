// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { mock } from "node:test";
import { createStore } from "jotai";
import {
  colorTokenSetAtom,
  generatedColorTokensAtom,
  overriddenTokenCountAtom,
  staleTokenCountAtom,
} from "../src/features/tokens/state";
import { tokenOverridesAtom } from "../src/features/tokens/overrides";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { isPaletteToken } from "../src/features/tokens/model";
import { tokenIdentity } from "../src/features/tokens/canonicalIdentity";

const unused = mock.method(colorTokenSetAtom, "read", () => {
  throw new Error("Empty edit counts must not request generated color values.");
});
try {
  const empty = createStore();
  assert.ok(
    Object.values(empty.get(browserTokenEditsAtom)).some(
      (edit) => edit.authoring?.identity,
    ),
    "Shipped publication identities must not count as authored edits.",
  );
  assert.equal(empty.get(overriddenTokenCountAtom), 0);
  assert.equal(empty.get(staleTokenCountAtom), 0);
  assert.equal(unused.mock.callCount(), 0);
} finally {
  unused.mock.restore();
}

const store = createStore();
const original = store
  .get(generatedColorTokensAtom)
  .find((token) => !isPaletteToken(token))!;
const override = {
  value: original.value,
  baseline: { name: original.name, value: original.value },
  editedAt: "2026-01-01T00:00:00.000Z",
};
store.set(tokenOverridesAtom, { [original.uuid]: override });
assert.equal(store.get(overriddenTokenCountAtom), 1);
assert.equal(store.get(staleTokenCountAtom), 0);
store.set(tokenOverridesAtom, {
  [original.uuid]: {
    ...override,
    baseline: {
      ...override.baseline,
      value: original.value === "#abcdef" ? "#fedcba" : "#abcdef",
    },
  },
});
assert.equal(store.get(overriddenTokenCountAtom), 1);
assert.equal(store.get(staleTokenCountAtom), 1);
store.set(tokenOverridesAtom, {});
const baselineEdits = store.get(browserTokenEditsAtom);
const identity = tokenIdentity(baselineEdits, original.uuid);
assert.ok(identity);
store.set(browserTokenEditsAtom, {
  ...baselineEdits,
  [identity.conceptId]: {
    ...baselineEdits[identity.conceptId],
    description: "Count demand fixture",
  },
});
assert.deepEqual(
  tokenIdentity(store.get(browserTokenEditsAtom), original.uuid),
  identity,
);
const canonical = store.get(colorTokenSetAtom).tokens;
assert.equal(
  store.get(overriddenTokenCountAtom),
  canonical.filter((token) => token.nameOverridden || token.valueOverridden)
    .length,
);
assert.equal(
  store.get(staleTokenCountAtom),
  canonical.filter((token) => token.stale).length,
);
store.set(browserTokenEditsAtom, baselineEdits);
assert.equal(store.get(overriddenTokenCountAtom), 0);
assert.equal(store.get(staleTokenCountAtom), 0);
console.log(
  "Edit counts skip unused generation and retain canonical override, stale, browser-edit and reset behavior.",
);
