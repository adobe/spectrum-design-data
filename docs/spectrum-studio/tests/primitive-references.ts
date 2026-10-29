// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import { authoringReferencePattern } from "../src/features/tokens/primitiveIdentity";
import { generatedSpacingAtom } from "../src/features/spacing/state";
import {
  generatedSizeAtom,
  sizeDocumentAtom,
} from "../src/features/size/state";
import { generatedRadiusAtom } from "../src/features/radius/state";
import { generatedElevationAtom } from "../src/features/elevation/state";
import {
  browserTokenSourcesAtom,
  browserModeContextAtom,
} from "../src/features/tokens/browserState";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { modeSelectionAtom } from "../src/features/modes/selection";
import {
  generatedTypographyAtom,
  typographyDocumentAtom,
} from "../src/features/typography/state";
import { typographyTokenGroups } from "../src/features/typography/typographyTokens";

const store = createStore();
const catalog = store.get(primitiveReferencesAtom);
const generatedCount =
  [
    ...store.get(generatedSpacingAtom),
    ...store.get(generatedSizeAtom),
    ...store.get(generatedRadiusAtom),
  ].reduce((count, output) => count + output.values.length, 0) +
  store.get(generatedElevationAtom).length +
  store.get(generatedTypographyAtom).length *
    typographyTokenGroups(store.get(typographyDocumentAtom)).length;
assert.equal(catalog.length, generatedCount);
assert.equal(new Set(catalog.map((item) => item.id)).size, catalog.length);
for (const reference of catalog) {
  assert.match(reference.id, authoringReferencePattern);
  assert.equal(reference.error, undefined, reference.name);
}
assert.ok(catalog.some((item) => item.family === "spacing" && item.hidden));
const published = store.get(browserTokenSourcesAtom);
for (const reference of catalog.filter((item) => item.hidden))
  assert.ok(!published.some((source) => source.id === reference.nativeId));
for (const reference of catalog.filter((item) => !item.hidden)) {
  assert.equal(
    published.find((source) => source.id === reference.nativeId)!.value,
    reference.value,
  );
}
const sizes = store.get(sizeDocumentAtom);
store.set(sizeDocumentAtom, {
  ...sizes,
  scales: sizes.scales.map((scale, index) =>
    index === 0 ? { ...scale, below: 1 } : scale,
  ),
});
const before = store
  .get(primitiveReferencesAtom)
  .find(
    (item) =>
      item.family === "size" &&
      item.sourceId === sizes.scales[0].id &&
      item.index === -1,
  )!;
store.set(sizeDocumentAtom, {
  ...store.get(sizeDocumentAtom),
  scales: store
    .get(sizeDocumentAtom)
    .scales.map((scale, index) =>
      index === 0 ? { ...scale, below: 2 } : scale,
    ),
});
const after = store
  .get(primitiveReferencesAtom)
  .find((item) => item.id === before.id)!;
assert.equal(after.index, before.index);
assert.notEqual(
  after.nativeId,
  before.nativeId,
  "A display-step change does not remint the authoring reference.",
);
assert.notEqual(after.name, before.name);
const taxonomy = store.get(taxonomyDocumentAtom);
const nameTermId = sizes.scales[0].nameRef!.termId;
store.set(taxonomyDocumentAtom, {
  ...taxonomy,
  terms: taxonomy.terms.map((term) =>
    term.id === nameTermId ? { ...term, value: "Renamed scale" } : term,
  ),
});
const renamed = store
  .get(primitiveReferencesAtom)
  .find((item) => item.id === before.id)!;
assert.equal(
  renamed.name,
  after.name,
  "The Global metadata label is not part of the default Size classification.",
);
assert.equal(renamed.sourceName, "Renamed scale");
assert.equal(renamed.id, before.id);
const nameReference = sizes.scales[0].nameRef!;
const assignedTerms = Object.values(
  nameReference.classification ?? {
    [nameReference.categoryId]: nameReference.termId,
  },
).flatMap((value) => (Array.isArray(value) ? value : [value]));
const assignedName = taxonomy.terms.find(
  (term) => assignedTerms.includes(term.id) && typeof term.value === "string",
);
assert.ok(
  assignedName,
  "Size has an explicit registered canonical-name segment.",
);
const currentTaxonomy = store.get(taxonomyDocumentAtom);
store.set(taxonomyDocumentAtom, {
  ...currentTaxonomy,
  terms: currentTaxonomy.terms.map((term) =>
    term.id === assignedName.id ? { ...term, value: "Resized element" } : term,
  ),
});
const classifiedRename = store
  .get(primitiveReferencesAtom)
  .find((item) => item.id === before.id)!;
assert.notEqual(
  classifiedRename.name,
  renamed.name,
  "Renaming an assigned term updates the canonical token name.",
);
assert.equal(
  classifiedRename.id,
  renamed.id,
  "Canonical name changes do not remint authoring references.",
);
const modeKey = store.get(browserModeContextAtom).key;
store.set(browserTokenEditsAtom, {
  [renamed.nativeId]: {
    values: { [modeKey]: { value: 123, baseline: renamed.value } },
  },
});
assert.equal(
  store.get(primitiveReferencesAtom).find((item) => item.id === renamed.id)!
    .value,
  123,
);
const shadow = store
  .get(primitiveReferencesAtom)
  .find((item) => item.family === "elevation")!;
store.set(modeSelectionAtom, { colorScheme: "mode-dark" });
assert.notEqual(
  store.get(primitiveReferencesAtom).find((item) => item.id === renamed.id)!
    .value,
  123,
);
const darkShadow = store
  .get(primitiveReferencesAtom)
  .find((item) => item.id === shadow.id)!;
assert.notEqual(darkShadow.value, shadow.value);
assert.equal(darkShadow.shadows!.length, shadow.shadows!.length);
console.log(
  "Hidden-inclusive, stable primitive reference identities and live mode/override resolution passed.",
);
