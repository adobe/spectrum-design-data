// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { createRule, isRule, isTshirtRule } from "../src/features/logic/model";
import {
  isRuleApplicability,
  referenceValueType,
  ruleAppliesTo,
  ruleAppliesToReference,
} from "../src/features/logic/applicability";
import {
  generatorOutputName,
  rebaseGenerator,
} from "../src/features/logic/generator";
import {
  prepareGeneratorEdit,
  emptyGeneratorEdit,
} from "../src/features/logic/generatorEdit";
import { upgradeGeneratorRulesSnapshot } from "../src/features/edit-session/generatorRulesUpgrade";
import { applyRoundingRule } from "../src/features/logic/evaluate";
import {
  createTshirtFixture,
  tshirtFixtureReferences,
} from "./fixtures/tshirt";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import {
  assignStructure,
  isStructuresDocument,
} from "../src/features/structures/model";
import {
  VARIANT_CATEGORY_IDS,
  SIZE_TERM_IDS,
} from "../src/features/taxonomy/variantVocabulary";
import { tshirtMappings } from "../src/features/logic/tshirt";
import {
  createDefaultSnapshot,
  authoringSourceSnapshotAtom,
  restoreAuthoringSnapshotAtom,
} from "../src/features/edit-session/state";
import { saveGeneratorDraftAtom } from "../src/features/logic/state";
import { compareAuthoring } from "../src/features/changelog/registry";
import { EMPTY_COMPONENTS } from "../src/features/components/model";
import { createComponent } from "../src/features/components/model";
import { componentImpactForSnapshots } from "../src/features/impact/componentImpact";
import { restorePath } from "../src/features/changelog/contract";
import { ruleFields } from "../src/features/changelog/changes";
import {
  readAuthoringRecord,
  AUTHORING_STORAGE_KEY,
} from "../src/features/edit-session/storage";
import { isSnapshot } from "../src/features/edit-session/state";
import { supportedStructureSize } from "../src/features/structures/composition";
import { generateDimensionScale } from "../src/features/scales/foundation";
import { compareSemanticTokens } from "../src/features/changelog/tokenComparison";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import { EMPTY_ALIASES } from "../src/features/tokens/aliases";
import {
  buildClassificationReviewExport,
  classificationContentHash,
} from "../src/features/taxonomy/reviewedExport";
import {
  buildGeneratedClassificationCompatibility,
  assertGeneratedClassificationCompatibility,
} from "../src/features/taxonomy/generatedReviewExport";
import {
  createElement,
  elementBindingId,
} from "../src/features/structures/elements";
import { appliedElementBindings } from "../src/features/structures/elementResolution";
import {
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";
import { FOUNDATION_MODE_ATTACHMENT_DEFAULTS } from "../src/state/view/foundationModeAttachments";

const customId = "c0000000-0000-4000-8000-000000000099";
const rule = createRule("generator");
assert.ok(isRule(rule));
assert.ok(isTshirtRule(rule));
assert.equal(
  isRule({ ...rule, applicability: { kind: "specific", types: [] } }),
  false,
);
assert.equal(
  isRuleApplicability({ kind: "specific", types: ["color"] }, "generator"),
  false,
);
assert.equal(
  isRuleApplicability(
    { kind: "specific", types: ["radius", "radius"] },
    "generator",
  ),
  false,
);
assert.equal(
  ruleAppliesTo({ type: "generator", applicability: { kind: "all" } }, "color"),
  false,
);
assert.equal(
  ruleAppliesToReference(rule, { family: "typography", metricId: "font-size" }),
  true,
);
assert.equal(
  ruleAppliesToReference(rule, {
    family: "typography",
    metricId: "default-lineHeight",
  }),
  false,
);
assert.equal(
  referenceValueType({
    family: "typography",
    metricId: "default-unitlessLineHeight",
  }),
  "line-height-multiplier",
);
assert.equal(
  referenceValueType({ family: "typography", metricId: "unknown" }),
  undefined,
);
const rebased = rebaseGenerator(rule, SIZE_TERM_IDS.s);
assert.equal(rebased.defaultTermId, SIZE_TERM_IDS.s);
assert.deepEqual(
  rebased.mappings.map((mapping) => mapping.offset),
  [-1, 0, 1, 2, 3],
);
assert.equal(isRule({ ...rule, defaultTermId: SIZE_TERM_IDS.xs }), false);
assert.throws(
  () =>
    rebaseGenerator(
      {
        ...rule,
        mappings: [
          { termId: SIZE_TERM_IDS.s, offset: Number.MAX_SAFE_INTEGER },
          { termId: SIZE_TERM_IDS.m, offset: -Number.MAX_SAFE_INTEGER },
        ],
      },
      SIZE_TERM_IDS.s,
    ),
  /integer range/,
);

const rounding = {
  ...createRule(),
  depth: 100 as const,
  defaultOutcome: { factor: 50 },
  applicability: { kind: "specific" as const, types: ["spacing" as const] },
};
assert.equal(applyRoundingRule(rounding, 1.234, "spacing"), 1);
assert.equal(applyRoundingRule(rounding, 1.234, "radius"), 1.234);
assert.equal(applyRoundingRule(rounding, 1.234), 1.234);

const fixture = createTshirtFixture({ fiveSizes: true });
const legacy = structuredClone(fixture.source);
const upgraded = upgradeGeneratorRulesSnapshot(legacy) as typeof legacy;
assert.notEqual(upgraded, legacy);
assert.equal(
  legacy.rules!.find((candidate) => candidate.id === fixture.rule.id)!.type,
  "tshirt-sizing",
);
const migrated = upgraded.rules!.find(
  (candidate) => candidate.id === fixture.rule.id,
)!;
assert.ok(isTshirtRule(migrated));
assert.deepEqual(migrated.applicability, { kind: "all" });
assert.deepEqual(
  buildTshirtArtifacts(upgraded),
  fixture.bundle,
  "Migration preserves exact IDs, output names, order and values.",
);
assert.equal(
  generatorOutputName(SIZE_TERM_IDS.m, fixture.source.taxonomy!),
  "m",
);

const radius = fixture.references.find(
  (reference) => reference.family === "radius" && reference.index === 0,
)!;
assert.ok(radius);
const withRadius = assignStructure(fixture.structure, {
  radiusTopLeft: { $ref: radius.id },
  radiusTopRight: { $ref: radius.id },
  radiusBottomLeft: { $ref: radius.id },
  radiusBottomRight: { $ref: radius.id },
});
const source = {
  ...upgraded,
  structures: { ...upgraded.structures!, structures: [withRadius] },
};
const full = buildTshirtArtifacts(source);
const restricted = {
  ...migrated,
  applicability: { kind: "specific" as const, types: ["spacing" as const] },
};
source.rules = source.rules!.map((candidate) =>
  candidate.id === restricted.id ? restricted : candidate,
);
const excluded = buildTshirtArtifacts(source);
const radiusRows = excluded.semantics.filter(
  (row) => row.target.family === "radius",
);
assert.ok(radiusRows.length >= 5);
assert.ok(radiusRows.every((row) => row.target.id === radius.id));
assert.deepEqual(
  excluded.semantics.map((row) => row.token.uuid),
  full.semantics.map((row) => row.token.uuid),
);
assert.ok(
  excluded.semantics
    .filter((row) => row.target.family === "spacing")
    .some((row) => row.target.id !== fixture.anchor.id),
);
assert.equal(
  withRadius.properties.find(
    (binding) => "$ref" in binding && binding.$ref === radius.id,
  )?.$ref,
  radius.id,
);
const radiusRule = {
  ...migrated,
  id: "rule-radius-only",
  applicability: { kind: "specific" as const, types: ["radius" as const] },
};
const disjointSource = {
  ...source,
  rules: [...source.rules!, radiusRule],
  structures: {
    ...source.structures,
    structures: [
      {
        ...withRadius,
        generation: {
          ...withRadius.generation!,
          applications: [
            ...withRadius.generation!.applications,
            {
              id: "c0000000-0000-4000-8000-000000000097",
              ruleId: radiusRule.id,
              targets: { kind: "all" as const },
            },
          ],
        },
      },
    ],
  },
};
assert.deepEqual(
  buildTshirtArtifacts(disjointSource)
    .semantics.filter((row) => row.target.family === "radius")
    .map((row) => row.target.id),
  full.semantics
    .filter((row) => row.target.family === "radius")
    .map((row) => row.target.id),
);
assert.throws(
  () =>
    buildTshirtArtifacts({
      ...disjointSource,
      rules: disjointSource.rules.map((candidate) =>
        candidate.id === migrated.id ? migrated : candidate,
      ),
    }),
  /overlap/,
);
const icon = createElement("workflowIcon");
icon.bindings = [
  {
    id: elementBindingId(icon.id, "size"),
    slot: "size",
    family: "typography",
    $ref: "typed-icon",
  },
];
const iconStructure = { ...fixture.structure, elements: [icon] };
const iconReference = {
  id: "typed-icon",
  family: "typography" as const,
  metricId: "workflow-icon-size",
};
assert.equal(
  appliedElementBindings(iconStructure, [restricted], [iconReference]).length,
  0,
);
assert.equal(
  appliedElementBindings(
    iconStructure,
    [
      {
        ...restricted,
        applicability: { kind: "specific", types: ["font-size"] },
      },
    ],
    [iconReference],
  ).length,
  0,
);
assert.equal(
  appliedElementBindings(
    iconStructure,
    [
      {
        ...restricted,
        applicability: { kind: "specific", types: ["workflow-icon-size"] },
      },
    ],
    [iconReference],
  ).length,
  1,
);

const custom = {
  ...restricted,
  mappings: [...restricted.mappings, { termId: customId, offset: 3 }],
};
const edit = {
  terms: [
    {
      id: customId,
      categoryId: VARIANT_CATEGORY_IDS.size,
      value: "Jumbo",
      description: "",
    },
  ],
  replacements: {},
};
const prepared = prepareGeneratorEdit(
  custom,
  edit,
  source.taxonomy!,
  source.structures!,
);
const customSource = {
  ...source,
  ...prepared,
  rules: source.rules!.map((candidate) =>
    candidate.id === custom.id ? custom : candidate,
  ),
  structures: {
    ...prepared.structures,
    structures: prepared.structures.structures.map((structure) => ({
      ...structure,
      generation: {
        ...structure.generation!,
        sizeTermIds: [...structure.generation!.sizeTermIds, customId],
      },
    })),
  },
};
assert.ok(isStructuresDocument(customSource.structures));
const customBundle = buildTshirtArtifacts(customSource);
assert.ok(
  customBundle.semantics.some(
    (row) => row.size === customId && row.token.name.size === "jumbo",
  ),
);
const withoutSmall = {
  ...custom,
  mappings: custom.mappings.filter(
    (mapping) => mapping.termId !== SIZE_TERM_IDS.s,
  ),
};
assert.throws(
  () =>
    prepareGeneratorEdit(
      withoutSmall,
      emptyGeneratorEdit(),
      customSource.taxonomy,
      customSource.structures,
    ),
  /replacement/,
);
const replaced = prepareGeneratorEdit(
  withoutSmall,
  { terms: [], replacements: { [SIZE_TERM_IDS.s]: customId } },
  customSource.taxonomy,
  customSource.structures,
);
assert.ok(
  replaced.taxonomy.terms.some((term) => term.id === SIZE_TERM_IDS.s),
  "Removing an option never deletes its term.",
);
assert.ok(
  !replaced.structures.structures[0].generation!.sizeTermIds.includes(
    SIZE_TERM_IDS.s,
  ),
);
assert.throws(
  () =>
    prepareGeneratorEdit(
      custom,
      {
        terms: [{ ...edit.terms[0], value: "medium" }],
        replacements: {},
      },
      source.taxonomy!,
      source.structures!,
    ),
  /duplicate|already|share|unique/i,
);

const references = tshirtFixtureReferences(customSource);
assert.equal(
  tshirtMappings(custom, fixture.anchor, references, [customId])[0].termId,
  customId,
);
const store = createStore();
store.set(restoreAuthoringSnapshotAtom, {
  ...createDefaultSnapshot(),
  ...upgraded,
  components: EMPTY_COMPONENTS,
});
const before = structuredClone(store.get(authoringSourceSnapshotAtom));
assert.throws(
  () => store.set(saveGeneratorDraftAtom, { rule: withoutSmall, edit }),
  /replacement/,
);
assert.deepEqual(
  store.get(authoringSourceSnapshotAtom),
  before,
  "Rejected edits leave all authored collections untouched.",
);
store.set(saveGeneratorDraftAtom, { rule: custom, edit });
const after = store.get(authoringSourceSnapshotAtom);
assert.ok(after.taxonomy!.terms.some((term) => term.id === customId));
assert.ok(
  after.rules!.find(
    (candidate) => candidate.id === custom.id && isTshirtRule(candidate),
  )?.applicability,
);
assert.ok(
  compareAuthoring(before, after).slots.some(
    (slot) => slot.changed && slot.category === "rules",
  ),
);
assert.ok(ruleFields(custom).includes("applicability"));
assert.ok(ruleFields(custom).includes("defaultTermId"));
const changed = structuredClone(after);
const changedRule = changed.rules!.find(
  (candidate) => candidate.id === custom.id,
)!;
assert.ok(isTshirtRule(changedRule));
changedRule.description = "Unrelated description";
changedRule.mappings[0].offset -= 1;
const comparison = compareAuthoring(after, changed);
assert.equal(
  comparison.slots.filter((slot) => slot.category === "rules" && slot.changed)
    .length,
  2,
);
const reset = restorePath(changed, after, {
  path: [
    "rules",
    { key: "id", id: custom.id },
    "mappings",
    { index: 0 },
    "offset",
  ],
  expected: changedRule.mappings[0].offset,
});
const resetRule = reset.rules!.find((candidate) => candidate.id === custom.id)!;
assert.ok(isTshirtRule(resetRule));
assert.equal(resetRule.description, "Unrelated description");
assert.equal(resetRule.mappings[0].offset, custom.mappings[0].offset);
assert.equal(
  compareAuthoring(after, reset).slots.filter(
    (slot) => slot.category === "rules" && slot.changed,
  ).length,
  1,
);
const shippedDefaults = createDefaultSnapshot();
const defaultRule = shippedDefaults.rules!.find(isTshirtRule)!;
const defaultEdit = {
  ...rebaseGenerator(defaultRule, SIZE_TERM_IDS.s),
  description: "Unrelated authored description",
};
const editedDefaults = {
  ...shippedDefaults,
  rules: shippedDefaults.rules!.map((candidate) =>
    candidate.id === defaultEdit.id ? defaultEdit : candidate,
  ),
  attachments: structuredClone(FOUNDATION_MODE_ATTACHMENT_DEFAULTS),
};
assert.equal(
  compareAuthoring(shippedDefaults, {
    ...shippedDefaults,
    rules: editedDefaults.rules,
  }).slots.filter((slot) => slot.category === "rules" && slot.changed).length,
  3,
);
const resetDefault = prepareChangeReset(
  editedDefaults,
  sourceResetPlan("Default option", [
    {
      path: ["rules", { key: "id", id: defaultRule.id }, "defaultTermId"],
      expected: SIZE_TERM_IDS.s,
    },
  ]),
);
const restoredDefault = resetDefault.rules!.find(
  (candidate) => candidate.id === defaultRule.id,
)!;
assert.ok(isTshirtRule(restoredDefault));
assert.deepEqual(restoredDefault.mappings, defaultRule.mappings);
assert.equal(restoredDefault.description, "Unrelated authored description");
assert.equal(
  supportedStructureSize(customSource.structures.structures[0], customId, [
    custom,
  ]),
  customId,
);
const customOnly = {
  ...fixture.structure,
  generation: {
    ...fixture.structure.generation!,
    sizeTermIds: [SIZE_TERM_IDS.l, customId],
  },
};
assert.equal(supportedStructureSize(customOnly, "xl", [custom]), "l");
assert.equal(
  supportedStructureSize(customOnly, "xl", [
    {
      ...custom,
      id: "unrelated-generator",
      mappings: [
        custom.mappings[0],
        custom.mappings[1],
        custom.mappings[2],
        custom.mappings[5],
        custom.mappings[4],
        custom.mappings[3],
      ],
    },
    custom,
  ]),
  "l",
  "Nested fallback uses the source's attached Generator, never unrelated library ordering.",
);
const renamedSmall = prepareGeneratorEdit(
  custom,
  {
    terms: [
      {
        ...customSource.taxonomy.terms.find(
          (term) => term.id === SIZE_TERM_IDS.s,
        )!,
        value: "Generator small test option",
      },
    ],
    replacements: {},
  },
  customSource.taxonomy,
  customSource.structures,
);
assert.deepEqual(
  renamedSmall.taxonomy.terms.map((term) => term.id),
  customSource.taxonomy.terms.map((term) => term.id),
  "Renaming a shared term preserves Registry order.",
);

const scale = {
  ...source.radius!.scales[0],
  base: 1.234,
  below: 0,
  above: 0,
  roundingRuleId: rounding.id,
};
const radiusValues = generateDimensionScale(
  "radius",
  scale,
  [rounding],
  source.scaleTypes,
);
assert.equal(
  radiusValues[0].value,
  radiusValues[0].raw,
  "Excluded rounding preserves raw values through the real scale generator.",
);
const spacingValues = generateDimensionScale(
  "spacing",
  scale,
  [rounding],
  source.scaleTypes,
);
assert.notEqual(spacingValues[0].value, spacingValues[0].raw);

const fullSnapshot = {
  ...createDefaultSnapshot(),
  ...source,
  components: EMPTY_COMPONENTS,
};
const propertyCategory = fullSnapshot.taxonomy!.categories.find(
  (category) => category.key === "property",
)!;
const propertyTerm = fullSnapshot.taxonomy!.terms.find(
  (term) => term.categoryId === propertyCategory.id && term.value === "radius",
)!;
assert.ok(propertyTerm);
const affectedRadius = full.semantics.find(
  (row) => row.target.family === "radius" && row.size === "l",
)!;
const component = createComponent({
  $id: "urn:leonardo:generator-impact",
  name: "generator-impact",
  displayName: "Generator impact",
  meta: { category: "actions", documentationUrl: "https://example.com/" },
});
component.assignments = [
  {
    id: "c0000000-0000-4000-8000-000000000098",
    property: { categoryId: propertyCategory.id, termId: propertyTerm.id },
    $ref: affectedRadius.token.uuid,
  },
];
const enabledSnapshot = {
  ...fullSnapshot,
  rules: source.rules!.map((candidate) =>
    candidate.id === migrated.id ? migrated : candidate,
  ),
  components: { ...EMPTY_COMPONENTS, components: [component] },
};
const excludedSnapshot = { ...enabledSnapshot, rules: source.rules };
const impact = componentImpactForSnapshots(enabledSnapshot, excludedSnapshot);
assert.equal(impact.status, "ready");
if (impact.status === "ready") assert.equal(impact.summary.affected.count, 1);
assert.ok(
  compareSemanticTokens(
    enabledSnapshot,
    excludedSnapshot,
    compareAuthoring(enabledSnapshot, excludedSnapshot),
  ).records.some((record) => record.modeValues.some((value) => value.changed)),
);

const packet = await buildGeneratedClassificationCompatibility(
  customBundle,
  await buildClassificationReviewExport(
    customSource.taxonomy,
    canonicalAliasRows(
      completeAliasSource(customSource),
      customBundle,
      "strict",
      { excludeColors: true },
    ).filter((record) => record.token.type !== "opacity"),
    EMPTY_ALIASES,
    "compatibility",
  ),
);
assert.equal(packet.schemaVersion, 4);
assert.equal(packet.standardConforming, false);
await assertGeneratedClassificationCompatibility(
  JSON.parse(JSON.stringify(packet)),
);
const corruptPacket = structuredClone(packet);
corruptPacket.bundle.vocabulary.sizes =
  corruptPacket.bundle.vocabulary.sizes!.filter((term) => term.id !== customId);
corruptPacket.bundleSha256 = await classificationContentHash(
  corruptPacket.bundle,
);
await assert.rejects(
  assertGeneratedClassificationCompatibility(corruptPacket),
  /Size|size/,
);

const smallRadius = full.semantics.find(
  (row) => row.target.family === "radius" && row.size === "s",
)!;
const componentSource = structuredClone(enabledSnapshot);
componentSource.components.components[0].assignments[0].$ref =
  smallRadius.token.uuid;
store.set(restoreAuthoringSnapshotAtom, componentSource);
const noSmall = {
  ...migrated,
  mappings: migrated.mappings.filter(
    (mapping) => mapping.termId !== SIZE_TERM_IDS.s,
  ),
};
const beforeReplacement = structuredClone(
  store.get(authoringSourceSnapshotAtom),
);
assert.throws(
  () =>
    store.set(saveGeneratorDraftAtom, {
      rule: noSmall,
      edit: emptyGeneratorEdit(),
    }),
  /replacement/,
);
assert.deepEqual(store.get(authoringSourceSnapshotAtom), beforeReplacement);
store.set(saveGeneratorDraftAtom, {
  rule: noSmall,
  edit: { terms: [], replacements: { [SIZE_TERM_IDS.s]: SIZE_TERM_IDS.l } },
});
const replacementSnapshot = store.get(authoringSourceSnapshotAtom);
assert.equal(
  replacementSnapshot.components!.components[0].assignments[0].$ref,
  affectedRadius.token.uuid,
);
assert.ok(
  replacementSnapshot.taxonomy!.terms.some(
    (term) => term.id === SIZE_TERM_IDS.s,
  ),
);

const stored = JSON.stringify({
  version: 19,
  working: { ...before, rules: legacy.rules },
  saved: {
    ...before,
    rules: legacy.rules!.map((candidate) => ({
      ...candidate,
      description: `${candidate.description} saved`,
    })),
  },
  isEditing: true,
  attachments: {},
  savedAttachments: {},
});
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => (key === AUTHORING_STORAGE_KEY ? stored : null),
    },
  },
});
const record = readAuthoringRecord(
  (value): asserts value is typeof before => {
    assert.ok(isSnapshot(value));
  },
  (value) => value,
)!;
assert.equal(record.version, 20);
assert.notEqual(
  record.working.rules[0].description,
  record.saved.rules[0].description,
);
assert.ok(
  record.working.rules.find(
    (candidate) =>
      candidate.id === fixture.rule.id && candidate.type === "generator",
  ),
);
Reflect.deleteProperty(globalThis, "window");
console.log(
  "Generator contracts, exact legacy migration, type applicability, custom output, rebasing and atomic rejection passed.",
);
