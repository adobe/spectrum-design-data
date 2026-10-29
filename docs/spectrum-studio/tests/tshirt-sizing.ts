// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createStore } from "jotai";
import {
  createDefaultSnapshot,
  restoreAuthoringSnapshotAtom,
  type EditSessionSnapshot,
} from "../src/features/edit-session/state";
import { upgradeTshirtSnapshot } from "../src/features/edit-session/tshirtUpgrade";
import {
  createRule,
  createTshirtMappings,
  isRule,
  isRuleList,
  type TshirtSizingRule,
} from "../src/features/logic/model";
import { resolveRule } from "../src/features/logic/evaluate";
import {
  resolveTshirtRule,
  tshirtMappings,
} from "../src/features/logic/tshirt";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import { primitiveReferenceId } from "../src/features/tokens/primitiveIdentity";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import type { PrimitiveReference } from "../src/features/tokens/primitiveReferences";
import { COMPONENT_SIZES } from "../src/features/foundations/componentSizes";
import {
  SIZE_TERM_IDS,
  VARIANT_CATEGORY_IDS,
  VARIANT_CATEGORIES,
} from "../src/features/taxonomy/variantVocabulary";
import {
  assignStructure,
  createStructure,
  isStructuresDocument,
  structureBinding,
  structureGeneration,
  type StructureSlot,
} from "../src/features/structures/model";
import {
  appliedStructureBindings,
  governStructureName,
  structureTokenGroups,
} from "../src/features/structures/generation";
import {
  buildTshirtArtifacts,
  selectedTshirtRows,
  tshirtPreview,
} from "../src/features/design-data/tshirtArtifacts";
import {
  assertTshirtGraph,
  assertTshirtToken,
  exactDimensionValue,
  formatTshirtName,
  type TshirtTokenRecord,
} from "../src/features/design-data/tshirtProfile";
import profile from "../src/data/design-data-tshirt-profile/provenance.json";

const store = createStore();
const references = store.get(primitiveReferencesAtom);
const baseRule = { ...createRule("tshirt-sizing"), name: "Adjacent sizes" };
const sizes = COMPONENT_SIZES.map((size) => size.id);
const anchor = references.find(
  (reference) => reference.family === "spacing" && reference.step === 500,
)!;
assert.ok(
  anchor,
  "Fixtures require the actual generated scale index, not a parsed token name.",
);
assert.deepEqual(
  createTshirtMappings("available-token").map((item) => item.offset),
  [-2, -1, 0, 1, 2],
);
assert.deepEqual(
  createTshirtMappings("scale-index").map((item) => item.offset),
  [-200, -100, 0, 100, 200],
);
assert.ok(isRule(baseRule));
assert.ok(isRuleList([createRule(), baseRule]));
assert.equal(isRuleList([baseRule, baseRule]), false);
for (const offset of [NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
  const invalid = {
    ...baseRule,
    mappings: baseRule.mappings.map((mapping) =>
      mapping.termId === SIZE_TERM_IDS.s ? { ...mapping, offset } : mapping,
    ),
  };
  assert.equal(isRule(invalid), false);
  assert.throws(
    () => tshirtMappings(invalid, anchor, references, sizes),
    /integer/,
  );
}
assert.equal(
  isRule({ ...baseRule, mappings: baseRule.mappings.slice(1) }),
  false,
);
assert.equal(
  isRule({
    ...baseRule,
    mappings: baseRule.mappings.map((mapping) =>
      mapping.termId === SIZE_TERM_IDS.m ? { ...mapping, offset: 1 } : mapping,
    ),
  }),
  false,
);
assert.equal(
  isRule({ ...baseRule, enabledSizes: ["m"] }),
  false,
  "Reusable rules do not own enabled sizes.",
);
assert.throws(() => resolveRule([baseRule], baseRule.id), /cannot round/);
assert.throws(
  () => resolveTshirtRule([createRule()], "missing"),
  /unavailable/,
);
assert.deepEqual(
  tshirtMappings(baseRule, anchor, references, sizes).map(
    (mapping) => mapping.target.step,
  ),
  [300, 400, 500, 600, 700],
);

const irregular: PrimitiveReference[] = [50, 75, 100, 400, 500, 600].map(
  (step, index) => ({
    ...anchor,
    index: index - 2,
    step,
    id: primitiveReferenceId("spacing", anchor.sourceId, index - 2),
    value: 20,
  }),
);
const first = irregular[2];
const numeric: TshirtSizingRule = {
  ...baseRule,
  movement: "scale-index",
  mappings: createTshirtMappings("scale-index"),
};
assert.equal(
  tshirtMappings(baseRule, first, irregular, ["s"])[0].target.step,
  75,
);
assert.equal(
  tshirtMappings(numeric, first, irregular, ["s"])[0].target.step,
  50,
);
const tied: TshirtSizingRule = {
  ...numeric,
  mappings: numeric.mappings.map((mapping) => ({
    ...mapping,
    offset:
      mapping.termId === SIZE_TERM_IDS.s
        ? -50
        : mapping.termId === SIZE_TERM_IDS.l
          ? 50
          : mapping.offset,
  })),
};
const near = tshirtMappings(tied, irregular[4], irregular, ["s", "m", "l"]);
assert.deepEqual(
  near.map((mapping) => [mapping.requested, mapping.actual]),
  [
    [450, 400],
    [500, 500],
    [550, 600],
  ],
);
assert.ok(near[0].warning && near[2].warning);
assert.equal(near[1].warning, undefined);
const endpoint = tshirtMappings(baseRule, irregular[0], irregular, sizes);
assert.equal(endpoint[0].target.id, endpoint[2].target.id);
assert.equal(endpoint[0].actual, 0);
assert.match(endpoint[0].warning!, /Nearest available/);
assert.throws(() => tshirtMappings(baseRule, anchor, [], sizes), /anchor/);
assert.throws(
  () =>
    tshirtMappings(
      baseRule,
      { ...anchor, sourceId: "missing" },
      references,
      sizes,
    ),
  /anchor/,
);
assert.throws(
  () => tshirtMappings(baseRule, anchor, [...references, anchor], sizes),
  /ambiguous/,
);
assert.throws(
  () =>
    tshirtMappings(
      baseRule,
      anchor,
      references.map((reference) =>
        reference.id === anchor.id ? { ...reference, step: NaN } : reference,
      ),
      sizes,
    ),
  /invalid/,
);
assert.throws(
  () =>
    tshirtMappings(
      baseRule,
      anchor,
      references.map((reference) =>
        reference.id === anchor.id
          ? { ...reference, value: Infinity }
          : reference,
      ),
      sizes,
    ),
  /invalid/,
);
assert.throws(
  () =>
    tshirtMappings(
      baseRule,
      { ...anchor, error: "Broken source" },
      references,
      sizes,
    ),
  /Broken source/,
);

const padding: StructureSlot[] = [
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
];
function fixture() {
  const snapshot = createDefaultSnapshot();
  snapshot.rules!.push(baseRule);
  let structure = assignStructure(
    createStructure("Base", "c0000000-0000-4000-8000-000000000010"),
    Object.fromEntries(padding.map((slot) => [slot, { $ref: anchor.id }])),
  );
  const named = governStructureName(structure, snapshot.taxonomy!);
  snapshot.taxonomy = named.taxonomy;
  structure = {
    ...named.structure,
    generation: {
      ...named.structure.generation!,
      sizeTermIds: [SIZE_TERM_IDS.s, SIZE_TERM_IDS.m, SIZE_TERM_IDS.l],
      applications: [
        {
          id: "c0000000-0000-4000-8000-000000000011",
          ruleId: baseRule.id,
          targets: { kind: "all" },
        },
      ],
    },
  };
  snapshot.structures = { schemaVersion: 2, structures: [structure] };
  return snapshot;
}
const snapshot = fixture();
assert.equal(
  structureGeneration(createStructure("Unattached")).sizeTermIds[0],
  SIZE_TERM_IDS.m,
);
const unattached = createDefaultSnapshot();
unattached.structures = {
  schemaVersion: 2,
  structures: [createStructure("Unattached")],
};
assert.equal(
  buildTshirtArtifacts(unattached).tokens.length,
  0,
  "Medium without an application does not invent semantic output.",
);
let output = buildTshirtArtifacts(snapshot);
assert.equal(output.semantics.length, 3);
assert.equal(new Set(output.semantics.map((row) => row.conceptId)).size, 3);
assert.deepEqual(
  output.semantics.map((row) => formatTshirtName(row.token.name)),
  ["base-padding-small", "base-padding-medium", "base-padding-large"],
);
assert.ok(output.semantics.every((row) => row.bindingIds.length === 4));
assertTshirtGraph(output.tokens);
for (const row of output.semantics) {
  assert.ok("$ref" in row.token);
  assert.ok(
    output.tokens.some(
      (token) => token.uuid === row.token.$ref && "value" in token,
    ),
  );
  assert.notEqual(
    row.token.$ref,
    row.target.id,
    "Published references use emitted records, not authoring UUIDs.",
  );
  assert.equal("conceptId" in row.token, false);
}
const identities = output.semantics.map((row) => row.conceptId);
const renamed = structuredClone(snapshot);
const nameTerm = renamed.structures!.structures[0].generation!.nameRef!.termId;
renamed.taxonomy!.terms.find((term) => term.id === nameTerm)!.value = "Renamed";
assert.deepEqual(
  buildTshirtArtifacts(renamed).semantics.map((row) => row.conceptId),
  identities,
);
assert.equal(
  buildTshirtArtifacts(renamed).semantics[0].token.name.structure,
  "renamed",
);
const hidden = structuredClone(snapshot);
hidden.spacing!.scales[0].hideFromPublishing = true;
output = buildTshirtArtifacts(hidden);
assert.deepEqual(
  output.semantics.map((row) => row.conceptId),
  identities,
);
assert.equal(output.tokens.length, 3, "Hidden primitives are not emitted.");
assert.ok(
  output.tokens.every((token) => "value" in token && !("$ref" in token)),
);
assert.equal(
  output.semantics[1].token.value,
  exactDimensionValue(anchor.value),
);
const overridden = structuredClone(hidden);
const selection = Object.fromEntries(
  overridden.modeSets.map((axis) => [axis.id, axis.defaultModeId]),
);
overridden.browserTokenEdits![anchor.nativeId] = {
  values: {
    [canonicalTokenModeKey(selection)]: {
      value: 20.1250001,
      baseline: Number(anchor.value),
    },
  },
};
const overriddenOutput = buildTshirtArtifacts(overridden);
assert.equal(
  selectedTshirtRows(
    overriddenOutput,
    snapshot.structures!.structures[0].conceptId,
    "m",
    selection,
  )[0].token.value,
  "20.1250001px",
);
assert.equal(
  new Set(overriddenOutput.semantics.map((row) => row.conceptId)).size,
  3,
);
assert.equal(
  overriddenOutput.semantics.length,
  4,
  "An explicit assignment creates only the affected concept's additional row.",
);
assert.ok(overriddenOutput.semantics.every((row) => !("$ref" in row.token)));
const equalAssignment = structuredClone(overridden);
equalAssignment.browserTokenEdits![anchor.nativeId].values[
  canonicalTokenModeKey(selection)
].value = Number(anchor.value);
assert.equal(
  buildTshirtArtifacts(equalAssignment).semantics.length,
  4,
  "Equal explicit assignments remain distinct.",
);
const live = tshirtPreview(
  snapshot.structures!.structures[0],
  "s",
  buildTshirtArtifacts(snapshot),
  selection,
  references,
);
assert.ok(
  padding.every(
    (slot) =>
      structureBinding(live.structure, slot)!.$ref === live.rows[0].token.uuid,
  ),
);
assert.deepEqual(
  snapshot.structures!.structures[0].properties.map((binding) =>
    "$ref" in binding ? binding.$ref : null,
  ),
  fixture().structures!.structures[0].properties.map((binding) =>
    "$ref" in binding ? binding.$ref : null,
  ),
  "Variant previews never change anchors.",
);

const alternate = references.find(
  (reference) => reference.family === "spacing" && reference.step === 600,
)!;
for (const [patch, expected] of [
  [{ paddingLeft: alternate.id, paddingRight: alternate.id }, 6],
  [{ paddingLeft: alternate.id }, 9],
  [
    {
      paddingLeft: alternate.id,
      paddingBottom: references.find(
        (reference) => reference.family === "spacing" && reference.step === 700,
      )!.id,
    },
    12,
  ],
] as const) {
  const variation = fixture();
  variation.structures!.structures[0] = assignStructure(
    variation.structures!.structures[0],
    Object.fromEntries(
      Object.entries(patch).map(([slot, $ref]) => [slot, { $ref }]),
    ),
  );
  assert.equal(buildTshirtArtifacts(variation).semantics.length, expected);
}
const allFive = fixture();
allFive.structures!.structures[0].generation!.sizeTermIds =
  Object.values(SIZE_TERM_IDS);
assert.equal(buildTshirtArtifacts(allFive).semantics.length, 5);
const replacement = structuredClone(snapshot);
const same = { ...baseRule, id: "different-rule" };
replacement.rules!.push(same);
replacement.structures!.structures[0].generation!.applications = [
  {
    id: crypto.randomUUID(),
    ruleId: baseRule.id,
    targets: {
      kind: "custom",
      bindingIds: padding
        .slice(0, 2)
        .map(
          (slot) =>
            structureBinding(replacement.structures!.structures[0], slot)!.id,
        ),
    },
  },
  {
    id: crypto.randomUUID(),
    ruleId: same.id,
    targets: {
      kind: "custom",
      bindingIds: padding
        .slice(2)
        .map(
          (slot) =>
            structureBinding(replacement.structures!.structures[0], slot)!.id,
        ),
    },
  },
];
assert.deepEqual(
  buildTshirtArtifacts(replacement).semantics.map((row) => row.conceptId),
  identities,
  "Equivalent rule IDs are not concept identity.",
);
same.mappings = same.mappings.map((mapping) =>
  mapping.termId === SIZE_TERM_IDS.xl ? { ...mapping, offset: 3 } : mapping,
);
assert.equal(
  buildTshirtArtifacts(replacement).semantics.length,
  12,
  "Even disabled size mappings affect grouping equivalence.",
);
const partial = fixture();
partial.structures!.structures[0].generation!.applications[0].targets = {
  kind: "custom",
  bindingIds: ["paddingTop", "paddingBottom", "paddingLeft"].map(
    (slot) =>
      structureBinding(
        partial.structures!.structures[0],
        slot as StructureSlot,
      )!.id,
  ),
};
assert.equal(
  buildTshirtArtifacts(partial).semantics.length,
  6,
  "A complete selected pair groups; the unmatched selected side stays individual.",
);
const overlap = fixture();
overlap.structures!.structures[0].generation!.applications.push({
  id: crypto.randomUUID(),
  ruleId: baseRule.id,
  targets: {
    kind: "custom",
    bindingIds: [
      structureBinding(overlap.structures!.structures[0], "paddingTop")!.id,
    ],
  },
});
assert.throws(() => buildTshirtArtifacts(overlap), /overlap/);
const orphan = fixture();
orphan.structures!.structures[0].generation!.applications[0].targets = {
  kind: "custom",
  bindingIds: [
    structureBinding(orphan.structures!.structures[0], "paddingTop")!.id,
  ],
};
orphan.structures!.structures[0] = assignStructure(
  orphan.structures!.structures[0],
  { paddingTop: null },
);
assert.ok(
  isStructuresDocument(orphan.structures),
  "Repairable custom intent is retained in native authoring data.",
);
assert.throws(() => buildTshirtArtifacts(orphan), /no longer token-backed/);
const collision = fixture();
collision.structures!.structures.push({
  ...createStructure("Base", "c0000000-0000-4000-8000-000000000012"),
  generation: {
    ...collision.structures!.structures[0].generation!,
    applications: [],
  },
});
collision.structures!.structures[1] = assignStructure(
  collision.structures!.structures[1],
  Object.fromEntries(padding.map((slot) => [slot, { $ref: anchor.id }])),
);
collision.structures!.structures[1].generation!.applications = [
  { id: crypto.randomUUID(), ruleId: baseRule.id, targets: { kind: "all" } },
];
assert.throws(() => buildTshirtArtifacts(collision), /structured name/);
const dynamic = fixture();
assert.equal(
  appliedStructureBindings(dynamic.structures!.structures[0], dynamic.rules!)
    .length,
  4,
);
dynamic.structures!.structures[0] = assignStructure(
  dynamic.structures!.structures[0],
  { gap: { $ref: anchor.id } },
);
assert.equal(
  appliedStructureBindings(dynamic.structures!.structures[0], dynamic.rules!)
    .length,
  5,
);
assert.equal(
  structureTokenGroups(dynamic.structures!.structures[0], dynamic.rules!)
    .length,
  2,
);

for (const family of ["radius", "elevation"] as const) {
  const source = fixture();
  const reference = references.find(
    (item) => item.family === family && item.index === 0,
  )!;
  const slots: StructureSlot[] =
    family === "radius"
      ? [
          "radiusTopLeft",
          "radiusTopRight",
          "radiusBottomRight",
          "radiusBottomLeft",
        ]
      : ["elevation"];
  source.structures!.structures[0] = assignStructure(
    source.structures!.structures[0],
    Object.fromEntries([
      ...padding.map((slot) => [slot, null]),
      ...slots.map((slot) => [slot, { $ref: reference.id }]),
    ]),
  );
  if (family === "radius") source.radius!.scales[0].hideFromPublishing = true;
  else source.elevation!.hideFromPublishing = true;
  const result = buildTshirtArtifacts(source);
  assert.equal(new Set(result.semantics.map((row) => row.conceptId)).size, 3);
  assert.ok(
    result.semantics.every(
      (row) =>
        row.token.name.property ===
          (family === "radius" ? "corner-radius" : "shadow") &&
        "value" in row.token,
    ),
  );
  if (family === "elevation")
    assert.ok(
      result.semantics.every(
        (row) =>
          Array.isArray(row.token.value) &&
          row.token.value.length === reference.shadows!.length,
      ),
    );
}

const valid = buildTshirtArtifacts(snapshot).tokens;
assert.throws(
  () => assertTshirtToken({ ...valid[0], conceptId: crypto.randomUUID() }),
  /token record/,
);
const alias = buildTshirtArtifacts(snapshot).semantics[0].token;
assert.throws(
  () => assertTshirtToken({ ...alias, value: "20px" }),
  /token record/,
);
assert.throws(
  () => assertTshirtGraph([{ ...alias, $ref: crypto.randomUUID() }]),
  /not in/,
);
assert.throws(() => assertTshirtGraph([valid[0], valid[0]]), /Duplicate/);
assert.throws(
  () =>
    assertTshirtToken({
      ...alias,
      $valueType: "value-types/dimension.schema.json",
    }),
  /unsupported value type/,
);
const radiusTarget = {
  ...valid.find((token) => "value" in token)!,
  name: { property: "corner-radius", scaleIndex: "500" },
};
assert.throws(
  () =>
    assertTshirtGraph([radiusTarget, { ...alias, $ref: radiusTarget.uuid }]),
  /incompatible primitive family/,
);
const qualifiedTarget = {
  ...valid.find((token) => "value" in token)!,
  name: {
    ...valid.find((token) => "value" in token)!.name,
    colorScheme: "dark",
  },
};
assert.throws(
  () =>
    assertTshirtGraph([
      qualifiedTarget,
      { ...alias, $ref: qualifiedTarget.uuid },
    ]),
  /incompatible colorScheme context/,
);
const cycle: TshirtTokenRecord = { ...alias, $ref: alias.uuid };
assert.throws(() => assertTshirtGraph([cycle]), /cycle/);
assert.equal(
  formatTshirtName({
    structure: "base",
    property: "padding",
    orientation: "horizontal",
    size: "m",
  }),
  "base-padding-horizontal-medium",
);
for (const file of profile.files) {
  const path = new URL(
    `../src/data/design-data-tshirt-profile/${file.path}`,
    import.meta.url,
  );
  assert.equal(
    createHash("sha256").update(readFileSync(path)).digest("hex"),
    file.sha256,
    `Pinned bytes: ${file.source}`,
  );
}
const legacy: EditSessionSnapshot = createDefaultSnapshot();
legacy.components = { schemaVersion: 2, components: [] };
for (const domain of [legacy.spacing!, legacy.size!, legacy.radius!]) {
  for (const scale of domain.scales) delete scale.nameRef?.classification;
}
legacy.taxonomy!.categories = legacy.taxonomy!.categories.filter(
  (category) => !VARIANT_CATEGORIES.some((item) => item.id === category.id),
);
legacy.taxonomy!.order = legacy.taxonomy!.order.filter(
  (id) =>
    !Object.values(VARIANT_CATEGORY_IDS).includes(
      id as typeof VARIANT_CATEGORY_IDS.size,
    ),
);
legacy.taxonomy!.terms = legacy.taxonomy!.terms.filter(
  (term) =>
    !VARIANT_CATEGORIES.some((category) => category.id === term.categoryId),
);
legacy.structures = {
  schemaVersion: 1,
  structures: [{ ...createStructure("Existing"), generation: undefined }],
};
const migrated = upgradeTshirtSnapshot(legacy, 4);
assert.equal(
  migrated.structures!.schemaVersion,
  2,
  "The historical T-shirt upgrade retains its stage-specific schema.",
);
assert.equal(
  migrated.structures!.structures[0].conceptId,
  legacy.structures.structures[0].conceptId,
);
assert.deepEqual(migrated.structures!.structures[0].generation, {
  sizeTermIds: [SIZE_TERM_IDS.m],
  applications: [],
});
assert.equal(
  legacy.structures.schemaVersion,
  1,
  "Migration never mutates its input.",
);
store.set(restoreAuthoringSnapshotAtom, migrated);
console.log(
  "T-shirt sizing, grouping, publishing, profile and migration checks passed.",
);
