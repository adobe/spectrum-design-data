// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  authoringSnapshotAtom,
  cancelEditAtom,
  createDefaultSnapshot,
  editSessionSnapshotAtom,
  enterEditModeAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import {
  aliasesAtom,
  deleteAliasAtom,
} from "../src/features/tokens/aliasState";
import { browserTokensAtom } from "../src/features/tokens/browserState";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import { aliasReferencePacket } from "../src/features/tokens/aliases";
import { aliasBrowserTokens } from "../src/features/tokens/aliasBrowser";
import { upgradeTaxonomySnapshot } from "../src/features/edit-session/taxonomyUpgrade";
import { spacingDocumentAtom } from "../src/features/spacing/state";
import { generateDimensionScale } from "../src/features/scales/foundation";
import { parseBrowserTokenValue } from "../src/features/tokens/browserModel";
import { taxonomyTokenTree } from "../src/features/taxonomy/tree";
import { registerTerm } from "../src/features/taxonomy/model";
import { buildCanonicalTaxonomyExport } from "../src/features/taxonomy/export";
import { analysisSavedInputAtom } from "../src/features/design-data/state";
import { changeGroupsAtom } from "../src/features/changelog/state";
import {
  applyChangeResetPlanAtom,
  itemResetPlan,
} from "../src/features/changelog/resetPlans";
import { savedBrowserConceptIdsAtom } from "../src/features/tokens/browserSavedState";
import { assertStoredSnapshot } from "../src/features/edit-session/state";
import { editFoundationNameAtom } from "../src/features/taxonomy/sourceState";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";

const store = createStore();
store.set(editSessionSnapshotAtom, createDefaultSnapshot());
assert.equal(store.get(aliasesAtom).tokens.length, 0);
const original = store
  .get(browserTokensAtom)
  .find((token) => token.name === "text-size-100")!;
assert(original);
const reference = store.get(authoringSnapshotAtom).typography.metricNames[
  "font-size"
];
const rename = (value: string) => {
  const taxonomy = store.get(taxonomyDocumentAtom);
  store.set(taxonomyDocumentAtom, {
    ...taxonomy,
    terms: taxonomy.terms.map((term) =>
      term.id === reference.termId ? { ...term, value } : term,
    ),
  });
};
store.set(enterEditModeAtom);
rename("Copy");
rename("Article");
assert.equal(
  store.get(aliasesAtom).tokens.length,
  0,
  "Unsaved intermediate names never create aliases.",
);
store.set(saveEditAtom);
const aliases = store.get(aliasesAtom);
assert(aliases.tokens.some((token) => token.name === "text-size-100"));
assert(!aliases.tokens.some((token) => token.name.startsWith("copy-")));
const current = store
  .get(browserTokensAtom)
  .find((token) => token.id === original.id)!;
assert.equal(current.name, "article-size-100");
assert.equal(current.value, original.value);
assert.equal(
  store.get(authoringSnapshotAtom).typography.metricNames["font-size"].termId,
  reference.termId,
);
const old = store
  .get(browserTokensAtom)
  .find((token) => token.alias && token.name === original.name)!;
assert.equal(old.value, current.value);
assert.equal(old.alias!.targetName, current.name);
assert.throws(() => parseBrowserTokenValue(old, "12"), /Aliases/);
assert(
  taxonomyTokenTree([old]).some(
    (branch) => branch.label === "Compatibility aliases",
  ),
);
const saved = structuredClone(store.get(authoringSnapshotAtom));
const conflicting = store.get(taxonomyDocumentAtom);
const iconReference = saved.typography.metricNames["workflow-icon-size"];
store.set(taxonomyDocumentAtom, {
  ...conflicting,
  terms: conflicting.terms.map((term) =>
    term.id === iconReference.termId ? { ...term, value: "Text" } : term,
  ),
});
assert.throws(
  () => store.set(saveEditAtom),
  /conflicts with another token or alias/,
  "Another canonical owner cannot reclaim a saved compatibility name.",
);
assert.deepEqual(
  store.get(editSessionSnapshotAtom),
  saved,
  "A collision never advances the saved graph.",
);
store.set(cancelEditAtom);
store.set(enterEditModeAtom);
assert.deepEqual(store.get(authoringSnapshotAtom), saved);
const targets = canonicalAliasRows(
  completeAliasSource(saved),
  buildTshirtArtifacts(saved),
);
const packet = aliasReferencePacket(saved.aliases!, targets);
assert(
  packet.every((row) => targets.some((target) => target.rowId === row.$ref)),
);
assert(packet.every((row) => !("value" in row)));
const exported = buildCanonicalTaxonomyExport(
  saved.taxonomy!,
  targets,
  saved.aliases!,
);
assert(
  exported.aliases.every((alias) =>
    exported.tokens.some((token) => token.id === alias.$ref),
  ),
);
assert(exported.tokens.every((token) => "value" in token !== "$ref" in token));
const analysis = store.get(analysisSavedInputAtom);
assert.deepEqual(analysis.errors, []);
assert.equal(
  analysis.records.filter(
    (record) => record.category === "compatibility-aliases",
  ).length,
  packet.length,
);
assert(
  !analysis.records
    .filter((record) => record.category === "tokens")
    .some((record) =>
      exported.aliases.some((alias) => alias.uuid === record.identity),
    ),
);
const badTarget = structuredClone(saved);
badTarget.aliases!.tokens[0].$ref = crypto.randomUUID();
assert.throws(
  () => assertStoredSnapshot(badTarget),
  /unavailable canonical target/,
);
const aliasChange = store
  .get(changeGroupsAtom)
  .flatMap((group) => group.items)
  .find(
    (item) =>
      item.sourceKind === "compatibility-alias" && item.title === old.name,
  )!;
assert.equal(aliasChange.sourceKind, "compatibility-alias");
store.set(applyChangeResetPlanAtom, itemResetPlan(aliasChange));
assert(!store.get(aliasesAtom).tokens.some((alias) => alias.id === old.id));
store.set(cancelEditAtom);
store.set(enterEditModeAtom);
store.set(deleteAliasAtom, old.id);
assert(!store.get(aliasesAtom).tokens.some((alias) => alias.id === old.id));
store.set(cancelEditAtom);
assert(store.get(aliasesAtom).tokens.some((alias) => alias.id === old.id));
store.set(enterEditModeAtom);
store.set(deleteAliasAtom, old.id);
store.set(saveEditAtom);
store.set(saveEditAtom);
assert(
  !store.get(aliasesAtom).tokens.some((alias) => alias.id === old.id),
  "An unchanged Save cannot recreate a deleted alias.",
);
rename("Text");
store.set(saveEditAtom);
assert(
  !store
    .get(aliasesAtom)
    .tokens.some((alias) => alias.name === "text-size-100"),
);
assert(
  store
    .get(aliasesAtom)
    .tokens.some((alias) => alias.name === "article-size-100"),
);

const defaultSnapshot = createDefaultSnapshot();
const upgraded = upgradeTaxonomySnapshot(defaultSnapshot, 5);
assert.deepEqual(upgraded.aliases!.tokens, []);
assert.deepEqual(
  upgraded.typography.metricNames,
  defaultSnapshot.typography.metricNames,
);
const customOrder = {
  ...defaultSnapshot,
  taxonomy: {
    ...defaultSnapshot.taxonomy!,
    order: [...defaultSnapshot.taxonomy!.order].reverse(),
  },
};
assert.deepEqual(
  upgradeTaxonomySnapshot(customOrder, 5).taxonomy!.order,
  customOrder.taxonomy.order,
);
const values = generateDimensionScale(
  "spacing",
  defaultSnapshot.spacing!.scales[0],
  defaultSnapshot.rules,
  defaultSnapshot.scaleTypes,
);
const beforeTargets = canonicalAliasRows(
  completeAliasSource(defaultSnapshot),
).filter((row) => row.token.type === "spacing");
const moreSmaller = structuredClone(defaultSnapshot);
moreSmaller.spacing!.scales[0].below++;
for (const value of generateDimensionScale(
  "spacing",
  moreSmaller.spacing!.scales[0],
  moreSmaller.rules,
  moreSmaller.scaleTypes,
)) {
  moreSmaller.taxonomy = registerTerm(
    moreSmaller.taxonomy!,
    moreSmaller.taxonomy!.categories.find(
      (category) => category.key === "scaleIndex",
    )!.id,
    value.step,
    crypto.randomUUID(),
  );
}
const afterTargets = canonicalAliasRows(
  completeAliasSource(moreSmaller),
).filter((row) => row.token.type === "spacing");
assert.equal(
  beforeTargets.find((row) => row.name === "spacing-100")!.id,
  afterTargets.find((row) => row.name === "spacing-100")!.id,
);
assert.deepEqual(
  values.map((value) => value.value),
  generateDimensionScale(
    "spacing",
    upgraded.spacing!.scales[0],
    upgraded.rules,
    upgraded.scaleTypes,
  ).map((value) => value.value),
);
assert.deepEqual(
  aliasBrowserTokens(
    {
      ...saved.aliases!,
      tokens: saved.aliases!.tokens.filter(
        (alias) => !alias.contexts.includes("[]"),
      ),
    },
    targets,
    {},
  ),
  [],
  "Mode-scoped aliases do not choose an arbitrary unavailable mode.",
);
const unboundAliases = aliasBrowserTokens(saved.aliases!, targets, {});
assert.equal(
  unboundAliases.length,
  5,
  "Text owns five unbound gap aliases after its shared Registry term is renamed.",
);
assert.ok(
  unboundAliases.every(
    (token) =>
      token.alias?.contexts.length === 1 && token.alias.contexts[0] === "[]",
  ),
);
const spacingStore = createStore();
spacingStore.set(editSessionSnapshotAtom, createDefaultSnapshot());
const concepts = spacingStore.get(savedBrowserConceptIdsAtom).size;
spacingStore.set(enterEditModeAtom);
const spacingTaxonomy = spacingStore.get(taxonomyDocumentAtom);
const category = spacingTaxonomy.categories.find(
  (item) => item.key === "tokenCategory",
)!;
const term = spacingTaxonomy.terms.find(
  (item) => item.categoryId === category.id,
)!;
spacingStore.set(taxonomyDocumentAtom, {
  ...spacingTaxonomy,
  terms: spacingTaxonomy.terms.map((item) =>
    item.id === term.id ? { ...item, value: "Layout spacing" } : item,
  ),
});
spacingStore.set(saveEditAtom);
assert.equal(
  spacingStore.get(savedBrowserConceptIdsAtom).size,
  concepts,
  "Aliases do not add canonical concepts.",
);
const finalStep = values.at(-1)!.step;
const maximum = spacingStore
  .get(aliasesAtom)
  .tokens.find((item) => item.name === `spacing-${finalStep}`)!;
assert(maximum);
const spacingDocument = spacingStore.get(spacingDocumentAtom);
spacingStore.set(spacingDocumentAtom, {
  ...spacingDocument,
  scales: spacingDocument.scales.map((scale, index) =>
    index ? scale : { ...scale, above: scale.above - 1 },
  ),
});
assert(
  !spacingStore
    .get(authoringSnapshotAtom)
    .aliases!.tokens.some((item) => item.id === maximum.id),
  "Removed mathematical positions prune references before working data is persisted.",
);
spacingStore.set(cancelEditAtom);
assert(
  spacingStore.get(aliasesAtom).tokens.some((item) => item.id === maximum.id),
);
const selectionStore = createStore();
selectionStore.set(enterEditModeAtom);
const selectionTaxonomy = selectionStore.get(taxonomyDocumentAtom);
const visual = selectionTaxonomy.terms.find((item) => item.value === "Visual")!;
selectionStore.set(editFoundationNameAtom, {
  id: "typography:font-size",
  termId: visual.id,
});
const selectedMetric = selectionStore.get(authoringSnapshotAtom).typography
  .metricNames["font-size"];
assert.equal(selectedMetric.classification![visual.categoryId], visual.id);
assert(
  selectionStore
    .get(browserTokensAtom)
    .some((token) => token.name === "visual-size-100"),
);
const customTermId = crypto.randomUUID();
selectionStore.set(
  taxonomyDocumentAtom,
  registerTerm(
    selectionStore.get(taxonomyDocumentAtom),
    defaultSnapshot.spacing!.scales[0].nameRef!.categoryId,
    "Custom foundation",
    customTermId,
  ),
);
selectionStore.set(editFoundationNameAtom, {
  id: "spacing:spacing-scale-1",
  termId: customTermId,
});
assert(
  selectionStore
    .get(browserTokensAtom)
    .some((token) => token.name === "spacing-custom-foundation-100"),
);
assert.equal(
  selectionStore.get(authoringSnapshotAtom).spacing!.scales[0].id,
  defaultSnapshot.spacing!.scales[0].id,
);
console.log(
  "Canonical names, future-Save aliases, direct exports, deletion/Cancel, identity and migration integration passed.",
);
