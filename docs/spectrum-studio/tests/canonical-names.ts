// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createStore } from "jotai";
import { designSystemDefaults } from "../src/data/defaults";
import { composeDesignSystemDefaults } from "../src/features/design-data/validation";
import {
  registeredSourceName,
  resolveNamedSource,
  canonicalDimensionDocument,
  dimensionScaleNameCollisions,
} from "../src/features/taxonomy/naming";
import { SCALE_TYPE_DEFAULTS } from "../src/features/scales/scaleType";
import { taxonomyValueKey } from "../src/features/taxonomy/model";
import { numericValuesMayBeShared } from "../src/features/taxonomy/valueDomains";
import type { CanonicalDesignSystemDataset } from "../src/features/design-data/model";
import { changeCountAtom } from "../src/features/changelog/state";
import {
  addPaletteColorAtom,
  colorSystemDocumentAtom,
} from "../src/features/color-system/state";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { spacingDocumentAtom } from "../src/features/spacing/state";
import { sizeDocumentAtom } from "../src/features/size/state";
import {
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
} from "../src/features/edit-session/state";
import {
  buildDimensionArtifacts,
  captureDimensionSource,
} from "../src/features/design-data/dimensionArtifacts";
import { authoringSnapshotAtom } from "../src/features/edit-session/state";
import {
  editDimensionScaleClassificationAtom,
  editFoundationNameAtom,
} from "../src/features/taxonomy/sourceState";
import { browserTokenSourcesAtom } from "../src/features/tokens/browserState";
import {
  generatedTypographyAtom,
  typographyDocumentAtom,
} from "../src/features/typography/state";
import { buildTypographyCss } from "../src/features/typography/typographyCss";
import { surfaceLinear } from "../src/features/color-system/surfaceGeneration";

const canonical: CanonicalDesignSystemDataset = JSON.parse(
  readFileSync(
    new URL("../src/data/design-system.defaults.json", import.meta.url),
    "utf8",
  ),
);
const taxonomy = canonical.system.taxonomy;
for (const [index, term] of taxonomy.terms.entries())
  for (const other of taxonomy.terms.slice(index + 1))
    assert(
      taxonomyValueKey(term.value) !== taxonomyValueKey(other.value) ||
        numericValuesMayBeShared(term, other, taxonomy.categories),
      `"${term.value}" is owned by more than one category.`,
    );
for (const source of [
  ...canonical.system.foundations.color.palette,
  ...canonical.system.foundations.color.scales,
  ...canonical.system.foundations.color.surfaces,
]) {
  assert.equal(typeof source.name, "object");
  assert(registeredSourceName(taxonomy, source.name, "colors").trim());
  assert(
    !("nameRef" in source),
    "The JSON contract contains one reference, not a second editable label.",
  );
}
for (const scope of ["spacing", "size"] as const)
  for (const source of canonical.system.foundations[scope].scales) {
    assert(registeredSourceName(taxonomy, source.name, scope));
  }
for (const scope of ["spacing", "size", "radius"] as const) {
  const names = canonical.system.foundations[scope].scales.map(
    (source) => resolveNamedSource(source, taxonomy, scope).name,
  );
  assert.equal(
    new Set(names).size,
    names.length,
    `Classified ${scope} scales resolve to their full classification label, so exporters never give two scales the same name.`,
  );
}
for (const reference of Object.values(
  canonical.system.foundations.typography.metricNames,
))
  assert(registeredSourceName(taxonomy, reference, "typography"));
assert.notEqual(
  canonical.system.foundations.spacing.scales[0].name.termId,
  canonical.system.foundations.size.scales[0].name.termId,
  "Each foundation's default scale is named by its own Property term.",
);
const malformed = structuredClone(canonical);
malformed.system.foundations.color.scales[0].name.termId = crypto.randomUUID();
assert.throws(
  () => composeDesignSystemDefaults(malformed, SCALE_TYPE_DEFAULTS),
  /Unresolved/,
);
const wrongCategory = structuredClone(canonical);
wrongCategory.system.foundations.color.scales[0].name.categoryId =
  "d8be9a69-fac3-495d-8be4-6a12311817a3";
assert.throws(
  () => composeDesignSystemDefaults(wrongCategory, SCALE_TYPE_DEFAULTS),
  /incompatible/,
);

const store = createStore();
assert.equal(
  store.get(changeCountAtom),
  0,
  "Complete catalogs and source references are shipped defaults, not phantom changes.",
);
store.set(enterEditModeAtom);
const spacing = store.get(spacingDocumentAtom);
const reference = spacing.scales[0].nameRef!;
const sizeBefore = store.get(sizeDocumentAtom);
const baseClassification = {
  ...reference.classification!,
  "b07988e3-0510-4bf5-a531-86ea718b1003":
    "b5cf8569-078f-40b1-8207-dddddd3aa2a5",
};
store.set(editDimensionScaleClassificationAtom, {
  scope: "spacing",
  scaleId: spacing.scales[0].id,
  classification: baseClassification,
});
assert.equal(
  store.get(spacingDocumentAtom).scales[0].name,
  "base spacing",
  "A scale's name is its classification, read in Registry order.",
);
assert.deepEqual(store.get(spacingDocumentAtom).scales[0].nameRef, {
  categoryId: reference.categoryId,
  termId: reference.termId,
  classification: baseClassification,
});
assert.deepEqual(
  store.get(sizeDocumentAtom),
  sizeBefore,
  "Classifying one scale leaves other foundations unchanged.",
);
assert.deepEqual(
  canonicalDimensionDocument(store.get(spacingDocumentAtom)).scales[0].name,
  store.get(spacingDocumentAtom).scales[0].nameRef,
);
assert.deepEqual(
  dimensionScaleNameCollisions(
    store.get(spacingDocumentAtom),
    store.get(taxonomyDocumentAtom),
    "spacing",
  ),
  [],
);
store.set(editDimensionScaleClassificationAtom, {
  scope: "spacing",
  scaleId: spacing.scales[1].id,
  classification: baseClassification,
});
assert.deepEqual(
  dimensionScaleNameCollisions(
    store.get(spacingDocumentAtom),
    store.get(taxonomyDocumentAtom),
    "spacing",
  ).map((collision) => collision.scaleIds),
  [[spacing.scales[0].id, spacing.scales[1].id]],
  "Duplicate classifications are reported as a diagnostic, not an error.",
);
store.set(editDimensionScaleClassificationAtom, {
  scope: "spacing",
  scaleId: spacing.scales[1].id,
  classification: spacing.scales[1].nameRef!.classification!,
});
store.set(saveEditAtom);
store.set(enterEditModeAtom);
store.set(editDimensionScaleClassificationAtom, {
  scope: "spacing",
  scaleId: spacing.scales[0].id,
  classification: reference.classification!,
});
store.set(cancelEditAtom);
assert.equal(
  store.get(spacingDocumentAtom).scales[0].name,
  "base spacing",
  "Cancel uses this page's most recent Save baseline.",
);

const colors = store.get(colorSystemDocumentAtom);
const before = store.get(taxonomyDocumentAtom);
assert.throws(
  () =>
    store.set(colorSystemDocumentAtom, {
      ...colors,
      scales: colors.scales.map((source, index) =>
        index === 0 ? { ...source, name: "Red" } : source,
      ),
    }),
  /already registered|unique|owned|Duplicate/,
);
assert.deepEqual(store.get(taxonomyDocumentAtom), before);
assert.deepEqual(store.get(colorSystemDocumentAtom), colors);
store.set(enterEditModeAtom);
const paletteId = store.set(addPaletteColorAtom);
const red = store
  .get(colorSystemDocumentAtom)
  .scales.find((source) => source.name === "red")!;
store.set(editFoundationNameAtom, {
  id: `palette:${paletteId}`,
  termId: red.nameRef!.termId,
});
const shared = store.get(colorSystemDocumentAtom);
const surface = shared.surfaces.find(
  (source) => source.sourceScaleId === red.id,
)!;
const tint = surfaceLinear(surface, shared);
const redValues = shared.scales.find((source) => source.id === red.id)!;
store.set(editFoundationNameAtom, {
  id: `palette:${paletteId}`,
  value: "Tangerine",
});
const renamed = store.get(colorSystemDocumentAtom);
assert.equal(
  renamed.scales.find((source) => source.id === red.id)!.name,
  "tangerine",
);
assert.equal(
  renamed.palette.find((source) => source.id === paletteId)!.name,
  "tangerine",
);
assert.deepEqual(
  renamed.scales.find((source) => source.id === red.id)!.stops,
  redValues.stops,
);
assert.deepEqual(
  renamed.scales.find((source) => source.id === red.id)!.nameRef,
  red.nameRef,
);
assert.deepEqual(
  surfaceLinear(
    renamed.surfaces.find((source) => source.id === surface.id)!,
    renamed,
  ),
  tint,
  "Renaming never breaks tint identity or changes the generated value.",
);
const originalTypography = store.get(generatedTypographyAtom);
const originalIds = store
  .get(browserTokenSourcesAtom)
  .filter((source) => source.type === "typography")
  .map((source) => source.id);
store.set(editFoundationNameAtom, {
  id: "typography:font-size",
  value: "Article",
});
assert.deepEqual(
  store.get(generatedTypographyAtom),
  originalTypography,
  "Metric naming does not change typography math.",
);
const typographySources = store
  .get(browserTokenSourcesAtom)
  .filter((source) => source.type === "typography");
assert.deepEqual(
  typographySources.map((source) => source.id),
  originalIds,
);
assert(typographySources.some((source) => source.name === "article-size-100"));
assert(
  buildTypographyCss(store.get(typographyDocumentAtom), {
    registry: store.get(taxonomyDocumentAtom),
  }).includes("--article-size-100:"),
);
const artifact = await buildDimensionArtifacts(
  captureDimensionSource(store.get(authoringSnapshotAtom)),
);
assert.deepEqual(artifact.foundation.source.spacing.scales[0].name, reference);
assert.equal(
  designSystemDefaults.system.foundations.spacing.scales[0].name,
  "global",
  "Session changes never mutate shipped default data.",
);
console.log(
  "Canonical source references, full default vocabulary, shared rename, strict ownership and session baselines passed.",
);
