// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createStore } from "jotai";
import { designSystemDefaults } from "../src/data/defaults";
import { composeDesignSystemDefaults } from "../src/features/design-data/validation";
import {
  registeredSourceName,
  canonicalDimensionDocument,
} from "../src/features/taxonomy/naming";
import { SCALE_TYPE_DEFAULTS } from "../src/features/scales/scaleType";
import { taxonomyValueKey } from "../src/features/taxonomy/model";
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
import { editFoundationNameAtom } from "../src/features/taxonomy/sourceState";
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
assert.equal(
  new Set(taxonomy.terms.map((term) => taxonomyValueKey(term.value))).size,
  taxonomy.terms.length,
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
for (const reference of Object.values(
  canonical.system.foundations.typography.metricNames,
))
  assert(registeredSourceName(taxonomy, reference, "typography"));
assert.equal(
  canonical.system.foundations.spacing.scales[0].name.termId,
  canonical.system.foundations.size.scales[0].name.termId,
  "Shared Global labels reuse their registered identity while output classifications differ.",
);
const malformed = structuredClone(canonical);
malformed.system.foundations.color.scales[0].name.termId = crypto.randomUUID();
assert.throws(
  () => composeDesignSystemDefaults(malformed, SCALE_TYPE_DEFAULTS),
  /Unresolved/,
);
const wrongCategory = structuredClone(canonical);
wrongCategory.system.foundations.color.scales[0].name.categoryId =
  "dfcbbcb5-6519-4a25-b437-1e25fec967b4";
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
store.set(spacingDocumentAtom, {
  ...spacing,
  scales: spacing.scales.map((source, index) =>
    index === 0 ? { ...source, name: "Universal" } : source,
  ),
});
assert.equal(
  store.get(sizeDocumentAtom).scales[0].name,
  "universal",
  "A shared registry rename changes every consuming source.",
);
assert.equal(
  store
    .get(taxonomyDocumentAtom)
    .terms.find((term) => term.id === reference.termId)?.value,
  "universal",
);
assert.deepEqual(store.get(spacingDocumentAtom).scales[0].nameRef, reference);
assert.deepEqual(
  canonicalDimensionDocument(store.get(spacingDocumentAtom)).scales[0].name,
  reference,
);
store.set(saveEditAtom);
store.set(spacingDocumentAtom, {
  ...store.get(spacingDocumentAtom),
  scales: store
    .get(spacingDocumentAtom)
    .scales.map((source, index) =>
      index === 0 ? { ...source, name: "Later draft" } : source,
    ),
});
store.set(cancelEditAtom);
assert.equal(
  store.get(spacingDocumentAtom).scales[0].name,
  "universal",
  "Cancel uses this page's most recent Save baseline.",
);
assert.equal(store.get(sizeDocumentAtom).scales[0].name, "universal");

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
