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
import { componentsDocumentAtom } from "../src/features/components/documentState";
import {
  clearComponentTokenCatalogCache,
  componentTokenCatalog,
  type ComponentTokenSource,
} from "../src/features/components/references";
import { createScopedStyleCatalog } from "../src/features/components/scopedStyleCatalog";
import type { StyleRecipe } from "../src/features/styles/model";

const store = createStore();
store.set(enterEditModeAtom);
const source = store.get(authoringSourceSnapshotAtom);
const recipe = source.styles!.recipes[0];
const target = componentTokenCatalog(source).find(
  (token) => token.ownerId === recipe.id && token.property === "font-weight",
)!;
assert.ok(target);
const category = source.taxonomy!.categories.find(
  (item) => item.key === "property",
)!;
const term = source.taxonomy!.terms.find(
  (item) => item.categoryId === category.id && item.value === "font-weight",
)!;
assert.ok(term);
const components = structuredClone(source.components!);
components.components[0].assignments.push({
  id: crypto.randomUUID(),
  property: { categoryId: category.id, termId: term.id },
  $ref: target.id,
  options: Object.fromEntries(
    Object.entries(target.context).map(([key, value]) => [key, String(value)]),
  ),
});
store.set(componentsDocumentAtom, components);
const withWeight = (weight: number): StyleRecipe => {
  const current = store.get(stylesDocumentAtom).recipes[0];
  return {
    ...current,
    appearance: { ...current.appearance, fontWeight: { value: weight } },
  };
};
store.set(saveStyleAtom, withWeight(410));
const accepted = store.get(stylesDocumentAtom);
assert.throws(() => store.set(saveStyleAtom, withWeight(-1)));
assert.equal(
  store.get(stylesDocumentAtom),
  accepted,
  "An unavailable referenced Style value cannot be committed.",
);
store.set(saveStyleAtom, withWeight(420));
const after = store.get(authoringSourceSnapshotAtom);
assert.equal(after.styles!.recipes[0].appearance.fontWeight?.value, 420);

const resolve = createScopedStyleCatalog();
resolve(after, after);
const fallbacks: ComponentTokenSource[] = [
  { ...after, tokenOverrides: { ...after.tokenOverrides } },
  {
    ...after,
    styles: {
      ...after.styles!,
      publications: [...after.styles!.publications],
    },
  },
  {
    ...after,
    browserTokenEdits: Object.fromEntries(
      Object.entries(after.browserTokenEdits!).map(([id, edit], index) => [
        id,
        index ? edit : { ...edit, description: "Authored token metadata" },
      ]),
    ),
  },
];
for (const candidate of fallbacks) {
  const originalTo = Color.Space.prototype.to;
  let conversions = 0;
  Color.Space.prototype.to = new Proxy(originalTo, {
    apply(target, receiver, args) {
      conversions++;
      return Reflect.apply(target, receiver, args);
    },
  });
  let scoped: ReturnType<typeof resolve>;
  try {
    // Equal content would otherwise reuse the earlier canonical build.
    clearComponentTokenCatalogCache();
    scoped = resolve(after, candidate);
    assert(
      conversions > 0,
      "Ineligible sources use full canonical generation.",
    );
  } finally {
    Color.Space.prototype.to = originalTo;
  }
  assert.deepEqual(scoped, componentTokenCatalog(candidate));
}
console.log(
  "Scoped Style safety: referenced-value rejection, recovery after rejection, Foundation/publication/authoring invalidation and full-fallback parity passed.",
);
