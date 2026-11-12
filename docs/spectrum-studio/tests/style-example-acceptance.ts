// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import { createStore } from "jotai";
import { captureSnapshot } from "../src/features/edit-session/state";
import { stylesDocumentAtom } from "../src/features/styles/state";
import { componentTokenCatalog } from "../src/features/components/references";
import { assertAuthoringUpdates } from "../src/state/authoringGuards";
import { editModeAtom } from "../src/state/view/editMode";

const store = createStore();
store.set(editModeAtom, true);
const before = captureSnapshot(store.get);
const catalog = componentTokenCatalog(before);
const styles = store.get(stylesDocumentAtom);
const recipe = styles.recipes[0];
const previous = styles.examples[recipe.id]?.icon;
const next = {
  ...styles,
  examples: {
    ...styles.examples,
    [recipe.id]: { icon: previous === "Add" ? "Checkmark" : "Add" },
  },
};
const originalTo = Color.Space.prototype.to;
let conversions = 0;
Color.Space.prototype.to = new Proxy(originalTo, {
  apply(target, receiver, args) {
    conversions++;
    return Reflect.apply(target, receiver, args);
  },
});
try {
  store.set(stylesDocumentAtom, next);
  assert.equal(
    conversions,
    0,
    "An example-only edit does not regenerate the Component token catalog.",
  );
} finally {
  Color.Space.prototype.to = originalTo;
}
assert.equal(store.get(stylesDocumentAtom), next);
assert.equal(next.recipes, styles.recipes);
assert.equal(next.publications, styles.publications);
assert.deepEqual(
  componentTokenCatalog(captureSnapshot(store.get)),
  catalog,
  "Example icons cannot change any complete canonical Component target.",
);
assert.throws(() =>
  store.set(stylesDocumentAtom, {
    ...next,
    publications: [...next.publications, next.publications[0]],
  }),
);
assert.equal(store.get(stylesDocumentAtom), next);
const components = structuredClone(before.components!);
const reference = components.components
  .flatMap((component) => component.assignments)
  .find((assignment) => assignment.$ref !== undefined)!;
assert.ok(reference.$ref);
reference.$ref = crypto.randomUUID();
assert.throws(() =>
  assertAuthoringUpdates(
    store.get,
    new Map<string, unknown>([
      ["design/styles", next],
      ["components", components],
    ]),
  ),
);
console.log(
  "Style examples: no token regeneration, complete output parity, unchanged identities, invalid-publication and mixed-proposal rejection passed.",
);
