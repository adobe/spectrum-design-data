// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  isUnchangedTermInput,
  normalizeTermValue,
  termLabel,
} from "../src/features/taxonomy/termPresentation";
import {
  registerTerm,
  updateTaxonomy,
  normalizeTaxonomyTerms,
  projectClassification,
} from "../src/features/taxonomy/model";
import {
  createDefaultSnapshot,
  authoringSnapshotAtom,
  enterEditModeAtom,
  cancelEditAtom,
} from "../src/features/edit-session/state";
import { upgradeTermCasingSnapshot } from "../src/features/edit-session/termCasingUpgrade";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { editFoundationNameAtom } from "../src/features/taxonomy/sourceState";
import {
  colorSystemDocumentAtom,
  addColorScaleAtom,
} from "../src/features/color-system/state";
import { changeGroupsAtom } from "../src/features/changelog/state";
import { compareAuthoring } from "../src/features/changelog/registry";
import {
  DEFAULT_COLOR_OUTPUT,
  migrateLegacyColorOutput,
} from "../src/features/color-system/outputSettings";
import { concreteColor } from "../src/features/color-system/data-vis/colors";
import { paletteColorCss } from "../src/features/color-system/paletteValue";
import { SIZE_TERMS } from "../src/features/taxonomy/variantVocabulary";
import { STRUCTURE_TERMS } from "../src/features/structures/vocabulary";
import { contributeTerms } from "../src/features/taxonomy/contributions";
import { buildCascadeTokenExport } from "../src/features/tokens/cascadeExport";
import { modeSetDefaultMode } from "../src/features/modes/model";
import {
  withLineHeightName,
  lineHeightName,
} from "../src/features/typography/lineHeightNames";

for (const [input, normalized, label] of [
  ["ILLUSTRATOR-ORANGE", "illustrator-orange", "Illustrator orange"],
  ["Illustrator Orange", "illustrator orange", "Illustrator orange"],
  ["  gRaY  ", "gray", "Gray"],
  ["ui-icon", "ui-icon", "Ui icon"],
  ["ÉCLAIR", "éclair", "Éclair"],
  ["", "", ""],
  [100, 100, "100"],
] as const) {
  assert.equal(normalizeTermValue(input), normalized);
  assert.equal(normalizeTermValue(normalizeTermValue(input)), normalized);
  assert.equal(termLabel(input), label);
}
assert.equal(termLabel(-10), "-10", "Numeric display must retain the sign.");
assert(isUnchangedTermInput("ILLUSTRATOR ORANGE", "illustrator-orange"));
assert(isUnchangedTermInput("Illustrator-orange", "illustrator-orange"));
assert(!isUnchangedTermInput("different", "illustrator-orange"));

const shipped = createDefaultSnapshot();
const taxonomy = shipped.taxonomy!;
const categoryId = taxonomy.categories.find(
  (category) => category.key === "colorFamily",
)!.id;
assert(
  taxonomy.terms.every(
    (term) =>
      typeof term.value !== "string" || term.value === term.value.toLowerCase(),
  ),
);
assert(
  [...SIZE_TERMS, ...STRUCTURE_TERMS].every(
    (term) =>
      typeof term.value !== "string" || term.value === term.value.toLowerCase(),
  ),
);
const id = crypto.randomUUID();
const added = registerTerm(taxonomy, categoryId, "MiXeD-CaSe", id);
assert.equal(added.terms.find((term) => term.id === id)!.value, "mixed-case");
assert.equal(
  registerTerm(added, categoryId, "MIXED-CASE", crypto.randomUUID()),
  added,
);
const numericCategory = taxonomy.categories.find(
  (category) => category.key === "scaleIndex",
)!;
const numeric = registerTerm(
  added,
  numericCategory.id,
  87654,
  crypto.randomUUID(),
);
assert.equal(
  typeof numeric.terms.find((term) => term.value === 87654)!.value,
  "number",
);
const otherCategory = taxonomy.categories.find(
  (category) => category.key === "surfaceName",
)!;
assert.throws(
  () =>
    registerTerm(added, otherCategory.id, "MIXED-CASE", crypto.randomUUID()),
  /already owned/,
);
const updated = updateTaxonomy(taxonomy, added);
assert.equal(updated.terms.find((term) => term.id === id)!.value, "mixed-case");
assert.equal(normalizeTaxonomyTerms(updated), updated);
const contributed = contributeTerms(
  taxonomy,
  [],
  [{ field: "colorFamily", value: "ConTRibUted" }],
);
assert(contributed.terms.some((term) => term.value === "contributed"));
for (const category of taxonomy.categories.filter(
  (category) => category.valueType === "string",
)) {
  const entered = registerTerm(
    taxonomy,
    category.id,
    `MiXeD ${category.key}`,
    crypto.randomUUID(),
  );
  assert.equal(
    entered.terms.at(-1)!.value,
    `mixed ${category.key.toLowerCase()}`,
  );
}
const spaced = registerTerm(
  added,
  categoryId,
  "MIXED CASE",
  crypto.randomUUID(),
);
assert(spaced.terms.some((term) => term.value === "mixed-case"));
assert(
  spaced.terms.some((term) => term.value === "mixed case"),
  "Spaces and hyphens remain distinct stored terms.",
);
const directEdit = {
  ...added,
  terms: added.terms.map((term) =>
    term.id === id ? { ...term, value: "MIXED-CASE" } : term,
  ),
};
assert.deepEqual(
  updateTaxonomy(added, directEdit),
  added,
  "Direct Registry updates normalize case-only edits.",
);
const lineId = shipped.typography!.lineHeights[0].id;
const line = withLineHeightName(
  shipped.typography!,
  taxonomy,
  lineId,
  "MiXeD-Line",
);
assert(
  line.taxonomy.terms.every(
    (term) =>
      typeof term.value !== "string" || term.value === term.value.toLowerCase(),
  ),
);
assert.equal(
  lineHeightName(line.document, line.taxonomy, lineId),
  "mixed-line",
);

const store = createStore();
store.set(enterEditModeAtom);
const source = store.get(colorSystemDocumentAtom).scales[0];
const before = structuredClone(store.get(authoringSnapshotAtom));
store.set(editFoundationNameAtom, {
  id: `color-scale:${source.id}`,
  value: source.name.toUpperCase(),
});
assert.deepEqual(
  store.get(authoringSnapshotAtom),
  before,
  "A case-only source rename is a no-op.",
);
assert.deepEqual(store.get(changeGroupsAtom), []);
store.set(editFoundationNameAtom, {
  id: `color-scale:${source.id}`,
  value: "MY-New COLOR",
});
assert.equal(store.get(colorSystemDocumentAtom).scales[0].name, "my-new color");
assert.equal(
  store.get(colorSystemDocumentAtom).scales[0].nameRef?.termId,
  source.nameRef?.termId,
);
assert(store.get(changeGroupsAtom).length > 0);
store.set(cancelEditAtom);
assert.deepEqual(store.get(authoringSnapshotAtom), shipped);
store.set(enterEditModeAtom);
store.set(addColorScaleAtom);
assert(
  store
    .get(taxonomyDocumentAtom)
    .terms.every(
      (term) =>
        typeof term.value !== "string" ||
        term.value === term.value.toLowerCase(),
    ),
);
store.set(cancelEditAtom);

const old = structuredClone(shipped);
old.taxonomy!.terms.forEach((term) => {
  if (typeof term.value === "string" && term.categoryId === categoryId)
    term.value = termLabel(term.value);
});
old.colorSystem.settings.colorOutput.outputFormat = "hex";
old.colorSystem.scales = old.colorSystem.scales.filter(
  (scale) => scale.name !== "wireframe",
);
old.colorSystem.dataVisScales = [];
const beforeOld = structuredClone(old);
const upgraded = upgradeTermCasingSnapshot(old);
assert.deepEqual(old, beforeOld);
assert.equal(upgradeTermCasingSnapshot(upgraded), upgraded);
assert.equal(upgraded.colorSystem.settings.colorOutput.outputFormat, "hex");
assert.deepEqual(
  upgraded.taxonomy!.terms.map(({ id, categoryId }) => ({ id, categoryId })),
  old.taxonomy!.terms.map(({ id, categoryId }) => ({ id, categoryId })),
);
assert.equal(upgraded.colorSystem.scales.length, old.colorSystem.scales.length);
assert.deepEqual(
  upgraded.taxonomy!.classifications,
  old.taxonomy!.classifications,
);
assert(
  compareAuthoring(upgraded, upgradeTermCasingSnapshot(old)).slots.every(
    (slot) => !slot.changed,
  ),
);
const flat = projectClassification(
  upgraded.taxonomy!,
  { [categoryId]: source.nameRef!.termId },
  "colors",
).flat;
assert.equal(flat.colorFamily, source.name);

assert.equal(DEFAULT_COLOR_OUTPUT.outputFormat, "rgb");
assert.equal(shipped.colorSystem.settings.colorOutput.outputFormat, "rgb");
assert.equal(migrateLegacyColorOutput("srgb").outputFormat, "hex");
const wireframe = shipped.colorSystem.scales.find(
  (scale) => scale.name === "wireframe",
)!;
assert(wireframe);
assert.equal(wireframe.stops.length, 1);
const seed = concreteColor(
  paletteColorCss(wireframe.stops[0], shipped.colorSystem.settings.colorOutput),
).to("srgb");
const expectedSeed = concreteColor("rgb(72, 110, 194)").to("srgb");
seed.coords.forEach((channel, index) =>
  assert(
    Math.abs(channel! - expectedSeed.coords[index]!) * 255 < 0.00001,
    "Existing OKLCh/linear conversion round-trip must stay below 0.00001 of an RGB channel, without rounding to 8 bits.",
  ),
);
assert(
  !shipped.modeSets.some((set) =>
    set.modes.some((mode) => mode.key === "wireframe"),
  ),
  "A Wireframe scale does not silently introduce a mode.",
);
const output = buildCascadeTokenExport({
  base: shipped.colorSystem,
  taxonomy,
  modeSets: shipped.modeSets,
  activeModes: shipped.modeSets
    .map(modeSetDefaultMode)
    .filter((mode) => mode !== undefined),
  activeTokens: [],
  overrides: shipped.tokenOverrides,
  rules: shipped.rules,
});
assert(output.tokens.some((token) => token.name.colorFamily === "wireframe"));
assert(
  output.tokens
    .filter((token) => token.name.colorFamily === "wireframe")
    .every(
      (token) =>
        typeof token.value === "string" && token.value.startsWith("rgb("),
    ),
);
console.log(
  "Term normalization, display, entry, identity, migration and RGB/Wireframe defaults passed.",
);
