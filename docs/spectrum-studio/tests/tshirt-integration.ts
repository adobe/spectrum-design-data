// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  createTshirtFixture,
  PADDING_SLOTS,
  TSHIRT_NAME_TERM_ID,
} from "./fixtures/tshirt";
import {
  createDefaultSnapshot,
  restoreAuthoringSnapshotAtom,
  authoringSnapshotAtom,
  editSessionSnapshotAtom,
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
  resetAllAuthoringAtom,
} from "../src/features/edit-session/state";
import {
  applyStructureRuleAtom,
  assignStructureAtom,
  removeStructureRuleAtom,
  restoreStructureRuleAtom,
  removeStructureAtom,
  restoreStructureAtom,
  setStructureSizesAtom,
  structuresDocumentAtom,
} from "../src/features/structures/state";
import {
  assignStructure,
  structureBinding,
  structureGeneration,
} from "../src/features/structures/model";
import {
  buildTshirtArtifacts,
  selectedTshirtRows,
} from "../src/features/design-data/tshirtArtifacts";
import {
  tshirtTokenChanges,
  tshirtTokenImpactRecords,
} from "../src/features/design-data/tshirtChanges";
import {
  createTshirtCacheWriter,
  TSHIRT_CACHE_KEY,
  hashArtifactText,
} from "../src/features/design-data/tshirtCache";
import {
  tshirtUnsavedImpactAtom,
  workingTshirtArtifactsAtom,
} from "../src/features/design-data/tshirtState";
import { tokenImpactSummaryAtom } from "../src/features/impact/state";
import { ruleParameters } from "../src/features/impact/sources/logic";
import { ruleFields } from "../src/features/changelog/changes";
import { createRule } from "../src/features/logic/model";
import { rulesAtom } from "../src/features/logic/library";
import { removeRuleAtom } from "../src/features/logic/state";
import { SIZE_TERM_IDS } from "../src/features/taxonomy/variantVocabulary";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { projectClassification } from "../src/features/taxonomy/model";
import { editReferencedTaxonomyAtom } from "../src/features/taxonomy/editing";
import {
  browserTokensAtom,
  browserModeContextAtom,
  editBrowserTokensAtom,
  resetBrowserTokenAtom,
} from "../src/features/tokens/browserState";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import {
  applyBrowserTokenEdits,
  canBulkEditValue,
  canonicalTokenModeKey,
} from "../src/features/tokens/browserModel";
import {
  changeGroupsAtom,
  revertChangeTopicAtom,
  revertChangeItemAtom,
} from "../src/features/changelog/state";
import { analysisWorkingInputAtom } from "../src/features/design-data/state";
import {
  isOutputMetadata,
  outputInventory,
} from "../src/features/design-data/materialization";
import { coverageTokenType } from "../src/features/design-data/coverage";
import { registerTerm } from "../src/features/taxonomy/model";
import { VARIANT_CATEGORY_IDS } from "../src/features/taxonomy/variantVocabulary";
import { setStructureTokenNamingAtom } from "../src/features/structures/state";

const makeFixture = (options?: Parameters<typeof createTshirtFixture>[0]) =>
  createTshirtFixture({ ...options, structureName: "Fixture base" });
const fixture = makeFixture();
const shipped = buildTshirtArtifacts(createDefaultSnapshot(), "shipped");
assert.equal(tshirtTokenImpactRecords(fixture.bundle, shipped).length, 3);
assert.equal(
  tshirtTokenImpactRecords(fixture.bundle, shipped).flatMap(
    (record) => record.modeValues,
  ).length,
  3,
);
assert.ok(
  tshirtTokenImpactRecords(fixture.bundle, shipped).every(
    (record) =>
      !record.manuallyOverridden &&
      record.referenceAssessment === "unavailable",
  ),
);
const hidden = makeFixture({ hidden: true });
const switched = tshirtTokenChanges(fixture.bundle, hidden.bundle);
assert.equal(switched.length, 3);
assert.ok(
  switched.every(
    (item) =>
      item.fields.some((field) => field.key.startsWith("Output")) &&
      item.fields.some((field) => field.key.startsWith("Alias")),
  ),
);
assert.ok(
  switched.every(
    (item) =>
      !item.fields.some((field) => field.key.startsWith("Resolved value")),
  ),
);
assert.ok(
  tshirtTokenImpactRecords(hidden.bundle, fixture.bundle).every(
    (record) =>
      record.referenceChanged &&
      record.referenceAssessment === "assessed" &&
      !record.manuallyOverridden,
  ),
);
const asymmetric = makeFixture({ asymmetric: true });
const topology = tshirtTokenChanges(fixture.bundle, asymmetric.bundle);
assert.equal(topology.filter((item) => item.kind === "removed").length, 3);
assert.equal(topology.filter((item) => item.kind === "new").length, 6);
assert.equal(
  tshirtTokenImpactRecords(makeFixture({ fiveSizes: true }).bundle, shipped)
    .length,
  5,
);
const rounding = createRule(),
  sizing = fixture.rule;
const parameters = ruleParameters([rounding, sizing]);
assert.equal(
  parameters.filter((record) => record.id.startsWith(`rule/${sizing.id}/`))
    .length,
  ruleFields(sizing).length,
);
assert.equal(
  parameters.filter((record) => record.id.startsWith(`rule/${rounding.id}/`))
    .length,
  ruleFields(rounding).length,
);

const store = createStore();
const initial = Object.assign(
  createDefaultSnapshot(),
  structuredClone(fixture.source),
);
initial.components = { schemaVersion: 2, components: [] };
initial.structures!.structures[0].generation = {
  sizeTermIds: [SIZE_TERM_IDS.m],
  applications: [],
};
initial.taxonomy!.terms = initial.taxonomy!.terms.filter(
  (term) => term.id !== TSHIRT_NAME_TERM_ID,
);
store.set(restoreAuthoringSnapshotAtom, initial);
store.set(editSessionSnapshotAtom, createDefaultSnapshot());
store.set(enterEditModeAtom);
const baseline = store.get(tokenImpactSummaryAtom);
const beforePreview = structuredClone(store.get(authoringSnapshotAtom));
assert.equal(buildTshirtArtifacts(fixture.source).semantics.length, 3);
assert.deepEqual(
  store.get(authoringSnapshotAtom),
  beforePreview,
  "A staged generator preview writes no authoring state.",
);
assert.throws(
  () =>
    store.set(applyStructureRuleAtom, {
      structureId: fixture.structure.conceptId,
      application: fixture.application,
    }),
  /Token naming/,
);
store.set(
  taxonomyDocumentAtom,
  registerTerm(
    store.get(taxonomyDocumentAtom),
    VARIANT_CATEGORY_IDS.structure,
    fixture.structure.name,
    TSHIRT_NAME_TERM_ID,
  ),
);
store.set(setStructureTokenNamingAtom, {
  structureId: fixture.structure.conceptId,
  termId: TSHIRT_NAME_TERM_ID,
});
store.set(applyStructureRuleAtom, {
  structureId: fixture.structure.conceptId,
  application: fixture.application,
  nameTermId: TSHIRT_NAME_TERM_ID,
});
assert.equal(store.get(tshirtUnsavedImpactAtom).added, 1);
assert.deepEqual(
  store.get(tokenImpactSummaryAtom),
  baseline,
  "Working semantic additions do not alter saved denominators.",
);
let tokens = store.get(browserTokensAtom).filter((token) => token.semantic);
assert.equal(tokens.length, 1);
assert.equal(
  tokens[0].semantic!.token.uuid,
  fixture.bundle.semantics.find((row) => row.size === "m")!.token.uuid,
  "Preview and Apply reuse the provisional Registry identity.",
);
assert.equal(
  tokens[0].name,
  projectClassification(
    store.get(taxonomyDocumentAtom),
    tokens[0].semantic!.classification,
    "structures",
  ).name,
);
const currentRegistry = store.get(taxonomyDocumentAtom);
const currentName = tokens[0].name;
const currentOutputName = structuredClone(tokens[0].semantic!.token.name);
store.set(taxonomyDocumentAtom, {
  ...currentRegistry,
  order: [...currentRegistry.order].reverse(),
});
const reorderedToken = store
  .get(browserTokensAtom)
  .find((token) => token.id === tokens[0].id)!;
assert.equal(
  reorderedToken.name,
  projectClassification(
    store.get(taxonomyDocumentAtom),
    reorderedToken.semantic!.classification,
    "structures",
  ).name,
);
assert.notEqual(
  reorderedToken.name,
  currentName,
  "Native semantic display follows Registry ordering.",
);
assert.deepEqual(
  reorderedToken.semantic!.token.name,
  currentOutputName,
  "Canonical display does not rewrite the separately pinned token profile.",
);
store.set(taxonomyDocumentAtom, currentRegistry);
assert.equal(canBulkEditValue(tokens), false);
assert.throws(
  () =>
    applyBrowserTokenEdits(
      tokens,
      store.get(browserTokenEditsAtom),
      tokens.map((token) => token.id),
      "[]",
      { description: "No direct edits" },
    ),
  /read-only/,
);
assert.throws(
  () =>
    store.set(editBrowserTokensAtom, {
      ids: [tokens[0].id],
      modeKey: store.get(browserModeContextAtom).key,
      patch: { value: 20 },
    }),
  /generated variants/,
);
assert.throws(
  () => store.set(resetBrowserTokenAtom, tokens[0].id),
  /no direct overrides/,
);
const previous = structuredClone(store.get(authoringSnapshotAtom));
assert.throws(
  () =>
    store.set(applyStructureRuleAtom, {
      structureId: fixture.structure.conceptId,
      application: { ...fixture.application, id: crypto.randomUUID() },
    }),
  /overlap/,
);
assert.deepEqual(
  store.get(authoringSnapshotAtom),
  previous,
  "Failed Apply is atomic across Registry and Structures.",
);
assert.throws(
  () =>
    store.set(setStructureSizesAtom, {
      structureId: fixture.structure.conceptId,
      sizeTermIds: [SIZE_TERM_IDS.s],
    }),
  /Medium/,
);
store.set(setStructureSizesAtom, {
  structureId: fixture.structure.conceptId,
  sizeTermIds: [SIZE_TERM_IDS.s, SIZE_TERM_IDS.m, SIZE_TERM_IDS.l],
});
tokens = store.get(browserTokensAtom).filter((token) => token.semantic);
assert.equal(tokens.length, 3);
assert.throws(
  () => store.set(removeRuleAtom, fixture.rule.id),
  /Structure|generation|referenced/i,
);
assert.throws(() => store.set(revertChangeTopicAtom, "logic"), /applications/);
assert.throws(() => store.set(revertChangeTopicAtom, "registry"), /name|term/i);
const withoutName = structuredClone(store.get(taxonomyDocumentAtom));
withoutName.terms = withoutName.terms.filter(
  (term) => term.id !== TSHIRT_NAME_TERM_ID,
);
assert.throws(
  () => store.set(editReferencedTaxonomyAtom, withoutName),
  /name|term/i,
);
store.set(saveEditAtom);
const saved = structuredClone(store.get(authoringSnapshotAtom));
assert.equal(
  store
    .get(tokenImpactSummaryAtom)
    .tiers.find((tier) => tier.tier === "semantic")!.affected.total,
  3,
);
assert.equal(
  store
    .get(tokenImpactSummaryAtom)
    .tiers.find((tier) => tier.tier === "semantic")!.valuesChanged.total,
  3,
);
assert.equal(store.get(tshirtUnsavedImpactAtom).added, 0);
const semanticChange = store
  .get(changeGroupsAtom)
  .find((group) => group.id === "tokens")!
  .items.find((item) => item.sourceKind === "semantic-token")!;
assert.throws(
  () => store.set(revertChangeItemAtom, semanticChange),
  /through their Structure/,
);
const removed = store.set(removeStructureRuleAtom, {
  structureId: fixture.structure.conceptId,
  applicationId: fixture.application.id,
});
assert.equal(
  store.get(browserTokensAtom).filter((token) => token.semantic).length,
  0,
);
store.set(restoreStructureRuleAtom, removed);
assert.deepEqual(
  store
    .get(browserTokensAtom)
    .filter((token) => token.semantic)
    .map((token) => token.id),
  tokens.map((token) => token.id),
);
const removedStructure = store.set(
  removeStructureAtom,
  fixture.structure.conceptId,
);
store.set(restoreStructureAtom, removedStructure);
assert.deepEqual(store.get(authoringSnapshotAtom), saved);
const layout = {
  availableWidth: 800,
  availableHeight: 400,
  naturalWidth: 98,
  naturalHeight: 34,
};
store.set(assignStructureAtom, {
  id: fixture.structure.conceptId,
  changes: { gap: { $ref: fixture.anchor.id } },
  layout,
});
assert.equal(
  store.get(browserTokensAtom).filter((token) => token.semantic).length,
  6,
  "All follows a newly eligible property.",
);
store.set(cancelEditAtom);
assert.deepEqual(store.get(authoringSnapshotAtom), saved);
store.set(enterEditModeAtom);
const custom = {
  ...fixture.application,
  targets: {
    kind: "custom" as const,
    bindingIds: [structureBinding(fixture.structure, "paddingTop")!.id],
  },
};
store.set(applyStructureRuleAtom, {
  structureId: fixture.structure.conceptId,
  application: custom,
});
store.set(assignStructureAtom, {
  id: fixture.structure.conceptId,
  changes: { paddingTop: null },
  layout,
});
assert.deepEqual(
  structureGeneration(store.get(structuresDocumentAtom).structures[0])
    .applications[0].targets,
  custom.targets,
);
assert.equal(
  store.get(workingTshirtArtifactsAtom).status,
  "error",
  "Invalid custom intent is visible, not silently dropped.",
);
assert.throws(() => store.set(saveEditAtom), /no longer token-backed/);
assert.deepEqual(
  store.get(editSessionSnapshotAtom),
  saved,
  "Failed generation cannot advance Save.",
);
store.set(cancelEditAtom);
store.set(enterEditModeAtom);
const analysis = store.get(analysisWorkingInputAtom);
assert.deepEqual(analysis.errors, []);
assert.ok(isOutputMetadata(analysis.outputMetadata, analysis.records));
const semanticRecords = analysis.records.filter((record) =>
  fixture.bundle.semantics.some((row) => record.identity === row.token.uuid),
);
assert.equal(semanticRecords.length, 3);
assert.ok(
  semanticRecords.every(
    (record) =>
      record.reference &&
      record.classification === "generated" &&
      coverageTokenType(record) === "layout-spacing",
  ),
);
assert.equal(outputInventory(analysis).counts.canonicalMaterializedRows, null);
assert.equal(
  analysis
    .outputMetadata!.observations.filter((row) =>
      semanticRecords.some((record) => record.id === row.recordId),
    )
    .every((row) => row.origin === "generated-output"),
  true,
);
store.set(resetAllAuthoringAtom);
assert.deepEqual(store.get(tshirtUnsavedImpactAtom), {
  added: 0,
  removed: 0,
  saved: shipped.semantics.length,
  values: shipped.semantics.length,
  error: "",
});
assert.deepEqual(
  store.get(structuresDocumentAtom),
  createDefaultSnapshot().structures,
);
assert.deepEqual(store.get(rulesAtom), createDefaultSnapshot().rules);

const overrides = structuredClone(fixture.source);
overrides.browserTokenEdits![fixture.bundle.semantics[0].conceptId] = {
  values: {},
};
assert.throws(() => buildTshirtArtifacts(overrides), /direct token/);
const full = structuredClone(fixture.source);
full.structures!.structures[0] = assignStructure(
  full.structures!.structures[0],
  Object.fromEntries(
    PADDING_SLOTS.map((slot) => [slot, { $ref: fixture.alternate.id }]),
  ),
);
const editedBundle = buildTshirtArtifacts(full);
assert.deepEqual(
  editedBundle.semantics.map((row) => row.conceptId),
  fixture.bundle.semantics.map((row) => row.conceptId),
);
const unused = structuredClone(fixture.source);
unused.modeSets.push({
  id: "unused-axis",
  key: "unused",
  name: "Unused",
  description: "",
  iconId: "none",
  defaultModeId: "unused-a",
  modes: [
    {
      id: "unused-a",
      key: "a",
      name: "A",
      description: "",
      iconId: "none",
      platformIds: [],
      foundations: {},
    },
    {
      id: "unused-b",
      key: "b",
      name: "B",
      description: "",
      iconId: "none",
      platformIds: [],
      foundations: {},
    },
  ],
});
assert.deepEqual(
  buildTshirtArtifacts(unused).tokens,
  fixture.bundle.tokens,
  "Unrelated mode declarations do not multiply semantic output.",
);
const bound = structuredClone(fixture.source);
bound.spacing!.scales[0].bindings = {
  base: {
    modeParameterId: "typography.textZoom",
    method: "exponential",
    points: [
      { at: -4, value: 4 },
      { at: 0, value: 8 },
      { at: 8, value: 16 },
    ],
  },
};
const boundBundle = buildTshirtArtifacts(bound);
assert.ok(
  boundBundle.semantics.some((row) => row.context.textScaling === "largest"),
);
assert.ok(
  boundBundle.semantics.every(
    (row) =>
      row.context.colorScheme === undefined &&
      row.context.contrast === undefined,
  ),
);
assert.equal(
  tshirtTokenImpactRecords(boundBundle, shipped).length,
  3,
  "Bound contexts remain values of the same three concepts.",
);
const hiddenOverride = makeFixture({ hidden: true });
const modeSelections = ["default", "larger"].map((key) =>
  Object.fromEntries(
    hiddenOverride.source.modeSets.map((axis) => [
      axis.id,
      axis.key === "textScaling"
        ? axis.modes.find((mode) => mode.key === key)!.id
        : axis.defaultModeId,
    ]),
  ),
);
hiddenOverride.source.browserTokenEdits![hiddenOverride.anchor.nativeId] = {
  values: Object.fromEntries(
    modeSelections.map((selection) => [
      canonicalTokenModeKey(selection),
      {
        value: Number(hiddenOverride.anchor.value),
        baseline: Number(hiddenOverride.anchor.value),
      },
    ]),
  ),
};
const assigned = buildTshirtArtifacts(hiddenOverride.source);
assert.equal(
  assigned.semantics.length,
  5,
  "Two equal explicit source assignments add two scoped rows, not a Cartesian matrix.",
);
assert.equal(
  tshirtTokenImpactRecords(assigned, shipped).flatMap(
    (record) => record.modeValues,
  ).length,
  5,
);
for (const selection of modeSelections)
  assert.equal(
    selectedTshirtRows(assigned, fixture.structure.conceptId, "m", selection)[0]
      .kind,
    "override",
  );
const customIntent = structuredClone(fixture.source);
customIntent.structures!.structures[0].generation!.applications[0].targets = {
  kind: "custom",
  bindingIds: [structureBinding(fixture.structure, "paddingTop")!.id],
};
customIntent.structures!.structures[0] = assignStructure(
  customIntent.structures!.structures[0],
  { gap: { $ref: fixture.anchor.id } },
);
assert.equal(
  buildTshirtArtifacts(customIntent).semantics.length,
  3,
  "Custom intent does not expand to a newly eligible Gap.",
);

class MemoryStorage {
  values = new Map<string, string>();
  writes = 0;
  fail = false;
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.fail) throw new Error("Quota exceeded");
    this.writes++;
    this.values.set(key, value);
  }
}
const storage = new MemoryStorage(),
  writer = createTshirtCacheWriter(storage);
await writer.update(fixture.source, fixture.bundle);
const firstRecord = storage.getItem(TSHIRT_CACHE_KEY)!;
assert.match(JSON.parse(firstRecord).sourceHash, /^[a-f0-9]{64}$/);
await writer.update(fixture.source, fixture.bundle);
assert.equal(storage.writes, 1);
await writer.update(full, editedBundle);
assert.notEqual(
  JSON.parse(storage.getItem(TSHIRT_CACHE_KEY)!).sourceHash,
  JSON.parse(firstRecord).sourceHash,
);
storage.values.set(TSHIRT_CACHE_KEY, "{broken");
assert.match((await writer.update(full, editedBundle)).status, /ready/);
storage.values.set(
  TSHIRT_CACHE_KEY,
  firstRecord.replace('"fixture-base"', '"forged"'),
);
const repaired = await writer.update(fixture.source, fixture.bundle);
assert.ok(repaired.status === "ready" && repaired.repaired);
assert.equal(storage.getItem(TSHIRT_CACHE_KEY), firstRecord);
storage.fail = true;
await assert.rejects(writer.update(full, editedBundle), /Quota/);
assert.equal(storage.getItem(TSHIRT_CACHE_KEY), firstRecord);
storage.fail = false;
const releases: (() => void)[] = [];
let calls = 0;
const slow = createTshirtCacheWriter(storage, async (text) => {
  const wait = ++calls <= 2;
  if (wait) await new Promise<void>((resolve) => releases.push(resolve));
  return hashArtifactText(text);
});
const old = slow.update(fixture.source, fixture.bundle);
const latest = await slow.update(full, editedBundle);
assert.equal(latest.status, "ready");
const newestRecord = storage.getItem(TSHIRT_CACHE_KEY);
releases.forEach((release) => release());
assert.equal((await old).status, "superseded");
assert.equal(
  storage.getItem(TSHIRT_CACHE_KEY),
  newestRecord,
  "Older hashing cannot replace newer generated output.",
);
const invalidated = createTshirtCacheWriter(storage);
const abandoned = invalidated.update(fixture.source, fixture.bundle);
invalidated.invalidate();
assert.equal(
  (await abandoned).status,
  "superseded",
  "Disposal or a source change invalidates pending hash work.",
);
assert.equal(storage.getItem(TSHIRT_CACHE_KEY), newestRecord);
storage.values.set(TSHIRT_CACHE_KEY, JSON.stringify({ version: 99 }));
const unsupported = await writer.update(fixture.source, fixture.bundle);
assert.ok(
  unsupported.status === "ready" &&
    unsupported.repaired?.includes("unsupported format"),
);
const oversized = structuredClone(fixture.bundle);
oversized.semantics[0].structureName = "\u00e9".repeat(2_600_000);
const beforeOversized = storage.getItem(TSHIRT_CACHE_KEY);
await assert.rejects(
  writer.update(fixture.source, oversized),
  /5 MB limit/,
  "The result limit measures UTF-8 bytes, not string character count.",
);
assert.equal(
  storage.getItem(TSHIRT_CACHE_KEY),
  beforeOversized,
  "Oversized results cannot replace existing cache data.",
);
console.log(
  "T-shirt integration: atomic authoring, saved denominators, semantic inspection, Analysis, guarded edits, rollback and persistent cache passed.",
);
