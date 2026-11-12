// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import { createStore } from "jotai";
import {
  authoringSourceSnapshotAtom,
  enterEditModeAtom,
} from "../src/features/edit-session/state";
import {
  saveStyleAtom,
  stylesDocumentAtom,
} from "../src/features/styles/state";
import { componentTokenCatalog } from "../src/features/components/references";
import { createScopedStyleCatalog } from "../src/features/components/scopedStyleCatalog";
import type { StylesDocument } from "../src/features/styles/model";
import { assertAuthoringUpdates } from "../src/state/authoringGuards";

const store = createStore();
store.set(enterEditModeAtom);
const original = store.get(stylesDocumentAtom);
const recipe = original.recipes.find((item) =>
  Object.values(item.differences).some((difference) => difference.fontWeight),
)!;
assert.ok(recipe);
const optionId = Object.keys(recipe.differences).find(
  (id) => recipe.differences[id].fontWeight,
)!;
function withWeight(document: StylesDocument, weight: number): StylesDocument {
  return {
    ...document,
    recipes: document.recipes.map((item) =>
      item.id === recipe.id
        ? {
            ...item,
            differences: {
              ...item.differences,
              [optionId]: {
                ...item.differences[optionId],
                fontWeight: { value: weight },
              },
            },
          }
        : item,
    ),
  };
}
store.set(
  saveStyleAtom,
  withWeight(original, 510).recipes.find((item) => item.id === recipe.id)!,
);
const vocabulary = store.get(authoringSourceSnapshotAtom).taxonomy;
store.set(
  saveStyleAtom,
  withWeight(store.get(stylesDocumentAtom), 515).recipes.find(
    (item) => item.id === recipe.id,
  )!,
);
const before = store.get(authoringSourceSnapshotAtom);
assert.equal(before.taxonomy, vocabulary);
const proposed = withWeight(store.get(stylesDocumentAtom), 520).recipes.find(
  (item) => item.id === recipe.id,
)!;
const originalTo = Color.Space.prototype.to;
let conversions = 0;
Color.Space.prototype.to = new Proxy(originalTo, {
  apply(target, receiver, args) {
    conversions++;
    return Reflect.apply(target, receiver, args);
  },
});
try {
  store.set(saveStyleAtom, proposed);
  assert.equal(
    conversions,
    0,
    "A warm Style variant edit does not regenerate Foundation colors.",
  );
} finally {
  Color.Space.prototype.to = originalTo;
}
const next = store.get(stylesDocumentAtom);
assert.equal(
  next.recipes.find((item) => item.id === recipe.id),
  proposed,
);
assert.equal(next.publications, original.publications);
const after = store.get(authoringSourceSnapshotAtom);
const cold = componentTokenCatalog(after);
const resolve = createScopedStyleCatalog();
const scoped = resolve(before, after);
assert.deepEqual(scoped, cold, "Scoped and complete canonical catalogs agree.");
const third = { ...after, styles: withWeight(next, 530) };
const warmed = resolve(after, third);
assert.deepEqual(warmed, componentTokenCatalog(third));
const previous = new Map(scoped.map((token) => [token.id, token]));
assert(
  warmed.some((token) => token.ownerId === recipe.id && token.value === 530),
);
for (const token of warmed)
  if (token.ownerId !== recipe.id) assert.equal(token, previous.get(token.id));

assert.throws(() =>
  store.set(stylesDocumentAtom, {
    ...next,
    publications: [...next.publications, next.publications[0]],
  }),
);
assert.equal(store.get(stylesDocumentAtom), next);
const components = structuredClone(after.components!);
const assignment = components.components
  .flatMap((component) => component.assignments)
  .find((item) => item.$ref)!;
assignment.$ref = crypto.randomUUID();
assert.throws(() =>
  assertAuthoringUpdates(
    store.get,
    new Map<string, unknown>([
      ["design/styles", withWeight(next, 540)],
      ["components", components],
    ]),
  ),
);
assert.equal(store.get(stylesDocumentAtom), next);
console.log(
  "Style variant acceptance: zero warm Foundation color work, exact complete-catalog parity, shared unrelated targets, stable publications and guarded mixed/invalid proposals passed.",
);
