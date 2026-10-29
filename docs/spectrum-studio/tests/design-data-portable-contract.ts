// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { designSystemDefaults } from "../src/data/defaults";
import { canonicalJson } from "../src/features/design-data/canonicalJson";
import {
  canonicalDesignSystemDataset,
  composeDesignSystemDefaults,
} from "../src/features/design-data/validation";
import { registerTerm } from "../src/features/taxonomy/model";
import { projectAuthoringDataset } from "../src/features/design-data/projection";
import { generateSpacingScale } from "../src/features/spacing/generate";
import { generateSizeScale } from "../src/features/size/generate";
import { generateTypography } from "../src/features/typography/typographyGeneration";
import { resolveTypographyDocument } from "../src/features/typography/resolution";
import { resolveModeParameterValues } from "../src/features/modes/parameterResolution";
import { modeSetDefaultMode } from "../src/features/modes/model";
import {
  parseExpression,
  evaluateExpression,
} from "../src/features/scales/expression";
import {
  evaluateInterpolation,
  interpolationIssues,
} from "../src/features/scales/interpolationDefinition";
import {
  resolveScaleInputs,
  scaleIssues,
} from "../src/features/scales/generate";
import { resolveBinding } from "../src/features/scales/interpolation";
import {
  applyRoundingRule,
  evaluateConditions,
} from "../src/features/logic/evaluate";
import type { RoundingRule } from "../src/features/logic/model";
import type { CompleteDesignSystemDataset } from "../src/features/design-data/model";
import {
  canonicalTokenModeKey,
  type BrowserTokenEdits,
} from "../src/features/tokens/browserModel";
import { dimensionNameClassification } from "../src/features/taxonomy/foundationNames";

// Test-only proposal envelope around current native payloads. This is not a new
// portable schema, importer, evaluator or independently conforming implementation.
const shippedBefore = canonicalJson(designSystemDefaults);
const native = structuredClone(designSystemDefaults);
native.system.scaleTypes.push({
  id: "fixture-expression",
  name: "Fixture formula",
  description: "",
  kind: "expression",
  expression: "base + i * step",
  base: { default: 8, step: 1, overridable: true, adaptable: true },
  parameters: [
    {
      id: "step",
      label: "Step",
      default: 2,
      step: 1,
      min: 1,
      max: 8,
      adaptable: true,
      overridable: true,
    },
  ],
});
const rule: RoundingRule = {
  id: "fixture-rounding",
  name: "Ordered fixture",
  description: "",
  type: "rounding",
  depth: 1,
  defaultOutcome: { factor: 0 },
  conditions: [
    { id: "first", comparator: "gte", threshold: 10, outcome: { factor: 4 } },
    { id: "second", comparator: "gte", threshold: 20, outcome: { factor: 8 } },
  ],
};
native.system.rules.push(rule);
native.system.interpolations.push({
  id: "fixture-expression-interpolation",
  name: "Fixture shape",
  description: "",
  kind: "expression",
  expression: "x ^ power",
  parameters: [
    {
      id: "power",
      label: "Power",
      default: 2,
      min: 1,
      max: 4,
      step: 1,
      adaptable: false,
    },
  ],
});
native.system.foundations.typography.lineHeights[0].adaptive.interpolationId =
  "fixture-expression-interpolation";
native.system.foundations.spacing.scales[0].bindings = {
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
const fixtureTermId = crypto.randomUUID();
native.system.taxonomy = registerTerm(
  native.system.taxonomy,
  "dfcbbcb5-6519-4a25-b437-1e25fec967b4",
  "Fixture",
  fixtureTermId,
);
const fixtureReference = {
  categoryId: "dfcbbcb5-6519-4a25-b437-1e25fec967b4",
  termId: fixtureTermId,
};
native.system.foundations.spacing.scales.push({
  id: "fixture-recipe",
  name: "Fixture",
  nameRef: {
    ...fixtureReference,
    classification: dimensionNameClassification(
      "spacing",
      fixtureReference,
      native.system.taxonomy,
    ),
  },
  hideFromPublishing: false,
  scaleTypeId: "fixture-expression",
  parameters: { step: 3 },
  roundingRuleId: rule.id,
  below: 1,
  above: 8,
});
const editModeKey = canonicalTokenModeKey(
  Object.fromEntries(
    native.system.modeSets.map((axis) => [
      axis.id,
      modeSetDefaultMode(axis)!.id,
    ]),
  ),
);
const nativeBrowserEdits: BrowserTokenEdits = {
  [`spacing-${native.system.foundations.spacing.scales[0].id}-100`]: {
    values: { [editModeKey]: { value: 777, baseline: 8 } },
  },
};
const bundle = {
  proposalVersion: "0.1-review-only",
  status: "proposal-not-adopted",
  evaluatorProfile: {
    id: "leonardo-native-characterization",
    version: "not-an-adopted-portable-version",
    implementationPaths: [
      "src/features/scales/expression.ts",
      "src/features/scales/generate.ts",
      "src/features/logic/evaluate.ts",
    ],
  },
  nativeDataset: composeDesignSystemDefaults(
    canonicalDesignSystemDataset(native),
    native.system.scaleTypes,
  ),
  nativeBrowserEdits,
  annotations: {
    "fixture:unknown-review-note": {
      preserve: true,
      ordered: ["second", "first"],
    },
  },
};
const restored: typeof bundle = JSON.parse(canonicalJson(bundle));
assert.deepEqual(
  restored,
  bundle,
  "R4-RT-001: every JSON-representable authored field, program, flag, reference, ordered array and opaque annotation survives native serialization",
);
assert.deepEqual(
  composeDesignSystemDefaults(
    canonicalDesignSystemDataset(restored.nativeDataset),
    restored.nativeDataset.system.scaleTypes,
  ),
  bundle.nativeDataset,
);

function outputs(dataset: CompleteDesignSystemDataset) {
  return ["default", "larger", "largest"].map((textMode) => {
    const modes = dataset.system.modeSets.map((axis) =>
      axis.key === "textScaling"
        ? axis.modes.find((mode) => mode.key === textMode)!
        : modeSetDefaultMode(axis)!,
    );
    const modeValues = resolveModeParameterValues(
      dataset.system.foundations,
      modes,
      undefined,
      { modeSets: dataset.system.modeSets },
    );
    return {
      textMode,
      spacing: dataset.system.foundations.spacing.scales.map((scale) =>
        generateSpacingScale(
          scale,
          dataset.system.rules,
          dataset.system.scaleTypes,
          modeValues,
        ),
      ),
      size: dataset.system.foundations.size.scales.map((scale) =>
        generateSizeScale(
          scale,
          dataset.system.rules,
          dataset.system.scaleTypes,
          modeValues,
        ),
      ),
      typography: generateTypography(
        resolveTypographyDocument(
          dataset.system.foundations.typography,
          modes,
          undefined,
          { modeSets: dataset.system.modeSets },
        ),
        undefined,
        dataset.system.rules,
        dataset.system.scaleTypes,
        dataset.system.interpolations,
      ),
      interpolations: dataset.system.interpolations.map((item) =>
        [0, 12, 28, 100].map((input) => evaluateInterpolation(item, input)),
      ),
    };
  });
}
const beforeOutput = outputs(bundle.nativeDataset);
assert.deepEqual(
  outputs(restored.nativeDataset),
  beforeOutput,
  "R4-RT-002: existing dimension/typography/interpolation generators reproduce native round-trip output",
);
assert.notDeepEqual(
  beforeOutput[0].spacing[0],
  beforeOutput[2].spacing[0],
  "The explicitly bound spacing recipe changes under an actual mode input",
);
const source = {
  kind: "working" as const,
  root: "R4 isolated fixture",
  hash: "fixture",
  revision: "fixture",
  dirty: false,
  version: "native-v1",
  validator: "Existing native checks, not target conformance",
};
const projected = projectAuthoringDataset(
  bundle.nativeDataset,
  source,
  bundle.nativeBrowserEdits,
);
const restoredProjection = projectAuthoringDataset(
  restored.nativeDataset,
  source,
  restored.nativeBrowserEdits,
);
assert.deepEqual(projected.errors, []);
const recordContent = (input: typeof projected) =>
  canonicalJson(
    [...input.records].sort((left, right) =>
      left.id.localeCompare(right.id, "en"),
    ),
  );
assert.equal(
  recordContent(restoredProjection),
  recordContent(projected),
  "R4-RT-003: existing projected identities, contexts, units, values and recipe outputs are unchanged; object-member enumeration is not row order semantics",
);
assert.equal(
  restoredProjection.records.filter(
    (row) =>
      row.category === "tokens" &&
      row.name === "spacing-100" &&
      row.value === 777,
  ).length,
  1,
  "R4-EDIT-001: exact-mode value override scope and generated baseline survive with the governed canonical name",
);
assert.equal(
  restoredProjection.outputMetadata?.assignments[0].valueEvidence?.baseline,
  8,
);

assert.equal(evaluateConditions(rule, 28).conditionId, "first");
assert.equal(applyRoundingRule(rule, 28), 28);
assert.equal(
  applyRoundingRule(
    { ...rule, conditions: [...rule.conditions].reverse() },
    28,
  ),
  32,
  "R4-ORDER-001: preserving ordered conditions is semantic, not formatting",
);
const binding = native.system.foundations.spacing.scales[0].bindings!.base;
assert.deepEqual(
  [-8, -4, 0, 8, 12].map((input) => resolveBinding(binding, input)),
  [4, 4, 8, 16, 16],
);
assert.equal(
  applyRoundingRule(
    { ...rule, depth: 100, conditions: [], defaultOutcome: { factor: 2 } },
    0.031,
  ),
  0.04,
);
for (const [expression, expected] of [
  ["-2^2", -4],
  ["2^3^2", 512],
  ["round(-1.5)", -1],
] as const) {
  const parsed = parseExpression(expression, []);
  assert(parsed.ok);
  assert.equal(
    evaluateExpression(parsed.node, {}),
    expected,
    "R4-LANG-001: characterize existing precedence and rounding, not universal math semantics",
  );
}
for (const expression of [
  "globalThis.process.exit()",
  "unknown + 1",
  "base.constructor",
  "fetch(1)",
])
  assert.equal(parseExpression(expression, ["base"]).ok, false);

const missing = structuredClone(restored.nativeDataset);
missing.system.foundations.spacing.scales[0].scaleTypeId = "unresolved-formula";
assert.throws(
  () =>
    composeDesignSystemDefaults(
      canonicalDesignSystemDataset(missing),
      missing.system.scaleTypes,
    ),
  /unresolved reference/,
  "R4-REF-001: use native reference validation before fallback generation",
);
const duplicate = structuredClone(restored.nativeDataset);
duplicate.system.scaleTypes.push(
  structuredClone(duplicate.system.scaleTypes[0]),
);
assert.throws(
  () =>
    composeDesignSystemDefaults(
      canonicalDesignSystemDataset(duplicate),
      duplicate.system.scaleTypes,
    ),
  /duplicate id/,
);

// Characterize gaps rather than silently implementing the proposed stricter policy.
const locked = {
  ...native.system.scaleTypes.find((item) => item.id === "fixture-expression")!,
  base: { default: 8, step: 1, adaptable: false, overridable: false },
};
const lockedInput = resolveScaleInputs(
  locked,
  {
    scaleTypeId: locked.id,
    below: 0,
    above: 1,
    parameters: {},
    roundingRuleId: rule.id,
    bindings: { base: binding },
  },
  { "typography.textZoom": 8 },
);
assert.equal(
  lockedInput.base,
  16,
  "R4-GAP-001: native dimension base binding does not gate on base.adaptable; proposed portability policy must not claim it does",
);
const invalidExpression = structuredClone(restored.nativeDataset);
const interpolation = invalidExpression.system.interpolations.find(
  (item) => item.id === "fixture-expression-interpolation",
)!;
assert(interpolation.kind === "expression");
interpolation.expression = "unknown + x";
assert(interpolationIssues(interpolation).length > 0);
assert.throws(
  () =>
    composeDesignSystemDefaults(
      canonicalDesignSystemDataset(invalidExpression),
      invalidExpression.system.scaleTypes,
    ),
  /unknown/,
  "R4-GAP-002: normalized adaptive shapes now reject invalid expressions at the native boundary; independent portable-language conformance remains unassessed",
);
const parsedNonFinite = parseExpression("1 / 0", []);
assert(parsedNonFinite.ok);
assert.equal(
  Number.isFinite(evaluateExpression(parsedNonFinite.node, {})),
  false,
);
assert(scaleIssues([{ value: Infinity }]).includes("invalid"));
assert.equal(
  JSON.stringify(Infinity),
  "null",
  "R4-GAP-003: non-finite output must be rejected before JSON transport, not normalized to null",
);

// Independently recorded pinned draft specimen; no Git/SDK/network operations here.
const migration = JSON.parse(
  await readFile(
    new URL(
      "./fixtures/design-data/pr1454-migration-example.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  status: string;
  baseRevision: string;
  headRevision: string;
  before: {
    uuid: string;
    conceptId: string;
    $ref: string;
    $schema: string;
    lifecycle: unknown;
    name: Record<string, unknown>;
  };
  after: {
    uuid: string;
    conceptId: string;
    $ref: string;
    $schema: string;
    lifecycle: unknown;
    name: Record<string, unknown>;
  };
};
assert.equal(migration.status, "recorded-draft-example-not-target-conformance");
assert.notEqual(migration.baseRevision, migration.headRevision);
for (const key of [
  "uuid",
  "conceptId",
  "$ref",
  "$schema",
  "lifecycle",
] as const)
  assert.deepEqual(
    migration.after[key],
    migration.before[key],
    `R4-MIG-001: ${key} survives the inspected draft taxonomy transformation`,
  );
assert.equal(migration.before.name.property, "background-color");
assert.equal(migration.after.name.property, "color");
assert.equal(migration.after.name.attribute, "background");
assert.equal(migration.before.name.variant, migration.after.name.visibility);
assert.equal(migration.before.name.legacyKey, migration.after.name.legacyKey);
assert.deepEqual(migration.before.name.state, migration.after.name.interaction);
assert(
  !("component" in migration.after.name),
  "The real specimen is unanchored: ownership remains an open draft question",
);
const migrationLedger = {
  status: "proposed-ledger-not-implemented",
  sourceProfile: migration.baseRevision,
  targetProfile: migration.headRevision,
  originalRecord: migration.before,
  reviewedResult: migration.after,
  disposition: "reviewed-decomposition-not-global-string-replacement",
};
assert.deepEqual(
  JSON.parse(canonicalJson(migrationLedger)).originalRecord,
  migration.before,
  "R4-MIG-002: proposed original-record ledger makes inverse recovery explicit instead of guessing it from decomposed names",
);
const consumers = [
  { id: "fixture-alias", target: migration.before.uuid },
  { id: "fixture-relationship", tokenRef: migration.before.uuid },
];
assert(
  consumers.every(
    (item) =>
      ("target" in item ? item.target : item.tokenRef) === migration.after.uuid,
  ),
  "Stable UUID references remain pointed at the same token; these are synthetic consumers, not a relationship-schema conformance claim",
);

// Proposed shared catalog example, distinct from the real unanchored specimen.
const scopedExample = {
  status: "proposal-only",
  component: "fixture-checkbox",
  states: [
    { id: "selected", trigger: "prop" },
    { id: "hover", trigger: "interaction" },
  ],
  token: {
    uuid: "fixture-token",
    name: {
      component: "fixture-checkbox",
      "interaction-context": ["selected"],
      interaction: ["hover"],
    },
  },
};
const scopedRestored: typeof scopedExample = JSON.parse(
  canonicalJson(scopedExample),
);
assert.deepEqual(scopedRestored, scopedExample);
assert.deepEqual(
  scopedRestored.states.map((state) => state.id),
  ["selected", "hover"],
);
assert.equal(
  new Set(scopedRestored.states.map((state) => state.id)).size,
  2,
  "R4-SCOPE-001: one owner-scoped catalog, not two duplicated state identity catalogs",
);
assert.equal(
  canonicalJson(designSystemDefaults),
  shippedBefore,
  "R4 fixtures never mutate shipped defaults or authoring state",
);
console.log(
  "R4 native round-trip, evaluation characterization and recorded migration examples passed; target schema/runtime and independent-language conformance are not assessed.",
);
