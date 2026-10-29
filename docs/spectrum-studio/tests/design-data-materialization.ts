// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { designSystemDefaults } from "../src/data/defaults";
import {
  canonicalJson,
  compareDesignData,
  reportMarkdown,
  type AnalysisInput,
} from "../src/features/design-data/comparison";
import {
  defaultsAnalysisInput,
  projectAuthoringDataset,
} from "../src/features/design-data/projection";
import {
  browserAssignmentId,
  isOutputMetadata,
  outputEvidence,
  outputInventory,
  referenceOutputMetadata,
} from "../src/features/design-data/materialization";
import { referenceRecords } from "../scripts/design-data-loader";
import { generateSpacingScale } from "../src/features/spacing/generate";
import { resolveModeParameterValues } from "../src/features/modes/parameterResolution";
import { modeSetDefaultMode } from "../src/features/modes/model";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import { browserSourcesFromOutputs } from "../src/features/tokens/browserSources";
import type { ModeSet } from "../src/features/modes/model";
import historic from "./fixtures/taxonomy-materialization-baseline.json" with { type: "json" };
import { materializationInvariants } from "./fixtures/materializationInvariants";

const baseline = defaultsAnalysisInput();
assert.ok(
  baseline.records.some(
    (record) => record.id === "authoring/rules:rule-standard-scale-naming",
  ),
  "The bounded custom-color feature adds a naming definition, not shipped custom color output.",
);
const legacyRecords = baseline.records
  .filter(
    (record) =>
      record.category !== "authoring/taxonomy" &&
      record.id !== "authoring/rules:rule-standard-scale-naming",
  )
  .map(({ taxonomy, ...record }) => {
    void taxonomy;
    return record;
  });
const nonElevationRecords = legacyRecords
  .filter(
    (record) =>
      record.id !== "foundations:elevation" &&
      ![
        "authoring/scaleTypes:scale-type-elevation-power",
        "authoring/scaleTypes:scale-type-elevation-linear",
      ].includes(record.id) &&
      record.pointer !== "/system/foundations/elevation",
  )
  .map((record) => {
    if (record.category !== "mode-sets") return record;
    const modeSet = record.value as ModeSet;
    return {
      ...record,
      value: {
        ...modeSet,
        authoringCapabilities: modeSet.authoringCapabilities?.filter(
          (capability) => !capability.startsWith("elevation."),
        ),
        modes: modeSet.modes.map((mode) => {
          const { elevation, ...foundations } = mode.foundations;
          void elevation;
          return { ...mode, foundations };
        }),
      },
    };
  });
const invariantHash = (records: typeof baseline.records) =>
  createHash("sha256")
    .update(canonicalJson(materializationInvariants(records)))
    .digest("hex");
assert.equal(
  invariantHash(nonElevationRecords),
  historic.invariants.radius,
  "The reviewed Radius outputs retain all non-naming data after the explicit taxonomy migration.",
);
const nonRadiusRecords = nonElevationRecords.filter(
  (record) =>
    record.id !== "foundations:radius" &&
    record.id !== "authoring/scaleTypes:scale-type-radius" &&
    record.pointer !== "/system/foundations/radius",
);
assert.equal(
  invariantHash(nonRadiusRecords),
  historic.invariants.preRadius,
  "The pre-Radius pin retains source/output IDs, values, units, contexts, formulas and mode wiring.",
);
assert.equal(
  invariantHash(legacyRecords),
  historic.invariants.elevation,
  "Elevation and all prior outputs differ only in reviewed naming/classification metadata.",
);
assert.equal(
  baseline.records.filter((record) => record.category === "tokens").length,
  historic.tokenRows,
);
assert.notEqual(
  createHash("sha256").update(canonicalJson(legacyRecords)).digest("hex"),
  historic.reviewed.elevation,
  "Historic full-name pins remain historic; approved naming changes are not presented as unchanged bytes.",
);
assert.notEqual(
  canonicalJson(legacyRecords),
  canonicalJson(baseline.records),
  "Taxonomy authoring and projection evidence participate in the new dataset fingerprint",
);
assert(isOutputMetadata(baseline.outputMetadata, baseline.records));
const inventory = outputInventory(baseline);
assert(inventory.counts.evaluationSamples > 0);
assert(inventory.counts.generatedOutputs > 0);
assert.equal(inventory.counts.explicitAssignments, 0);
assert.equal(inventory.counts.unclassifiedRows, 0);
assert.equal(inventory.counts.canonicalMaterializedRows, null);
assert.equal(
  inventory.counts.observedRows,
  inventory.counts.generatedOutputs + inventory.counts.evaluationSamples,
);

const dataset = structuredClone(designSystemDefaults);
dataset.system.modeSets.push({
  id: "unused-axis",
  key: "unused",
  name: "Unused declaration",
  description: "",
  iconId: "none",
  defaultModeId: "unused-a",
  authoringCapabilities: [],
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
const extra = projectAuthoringDataset(dataset, baseline.source);
assert.deepEqual(extra.errors, []);
const extraInventory = outputInventory(extra);
assert.equal(
  extraInventory.counts.evaluationSamples,
  inventory.counts.evaluationSamples * 2,
  "Existing generator still samples the Cartesian matrix",
);
assert.equal(
  extraInventory.counts.explicitAssignments,
  0,
  "A new mode declaration never creates explicit assignments",
);
assert.equal(extraInventory.counts.canonicalMaterializedRows, null);
const concepts = (input: AnalysisInput) =>
  [
    ...new Set(
      input.records
        .filter((row) => row.category === "tokens")
        .map((row) => row.conceptId),
    ),
  ].sort();
assert.deepEqual(
  concepts(extra),
  concepts(baseline),
  "Unused declarations do not invent token concepts",
);
const samples = extra.records.filter(
  (row) =>
    row.conceptId ===
      `spacing:${dataset.system.foundations.spacing.scales[0].id}:100` &&
    row.context?.colorScheme === "light" &&
    row.context?.contrast === "regular" &&
    row.context?.textScaling === "default",
);
assert.equal(samples.length, 2);
assert.equal(samples[0].value, samples[1].value);
assert.notEqual(
  samples[0].id,
  samples[1].id,
  "Equal evaluation values do not merge existing row identities",
);
assert(
  extraInventory.scenarios.some(
    (scenario) =>
      scenario.kind === "serialized-context" &&
      scenario.omittedAxes.includes("unused"),
  ),
);

const bound = structuredClone(designSystemDefaults);
const scale = bound.system.foundations.spacing.scales[0];
scale.bindings = {
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
const boundInput = projectAuthoringDataset(bound, baseline.source);
assert.deepEqual(boundInput.errors, []);
const boundInventory = outputInventory(boundInput);
const recipe = boundInventory.recipes.find(
  (item) => item.id === `spacing:${scale.id}`,
)!;
assert.equal(recipe.declaredBindings[0].modeParameterId, "typography.textZoom");
assert(recipe.definitionReferences.includes(scale.scaleTypeId));
assert.equal(recipe.dependencyAssessment, "declared-only");
assert.equal(recipe.evaluatorVersion, "not-established");
const modes = bound.system.modeSets.map((axis) =>
  axis.key === "textScaling"
    ? axis.modes.find((mode) => mode.key === "largest")!
    : modeSetDefaultMode(axis)!,
);
const values = generateSpacingScale(
  scale,
  bound.system.rules,
  bound.system.scaleTypes,
  resolveModeParameterValues(bound.system.foundations, modes, undefined, {
    modeSets: bound.system.modeSets,
  }),
);
const boundRow = boundInput.records.find(
  (row) =>
    row.conceptId === `spacing:${scale.id}:100` &&
    row.context?.colorScheme === "light" &&
    row.context?.contrast === "regular" &&
    row.context?.textScaling === "largest",
)!;
assert.equal(
  boundRow.value,
  values.find((value) => value.step === 100)!.value,
  "Provenance uses the existing authoritative generator",
);
assert.equal(
  outputEvidence(boundInventory, boundRow.id)?.recipe?.id,
  recipe.id,
);

// Two explicit browser assignments deliberately happen to equal the generated baseline.
const source = browserSourcesFromOutputs(
  [],
  [],
  [
    {
      scale: designSystemDefaults.system.foundations.spacing.scales[0],
      values: generateSpacingScale(
        designSystemDefaults.system.foundations.spacing.scales[0],
      ),
    },
  ],
).find((row) => row.name === "spacing-global-100")!;
const selections = ["default", "larger"].map((key) =>
  Object.fromEntries(
    designSystemDefaults.system.modeSets.map((axis) => [
      axis.id,
      (axis.key === "textScaling"
        ? axis.modes.find((mode) => mode.key === key)!
        : modeSetDefaultMode(axis)!
      ).id,
    ]),
  ),
);
const modeKeys = selections.map(canonicalTokenModeKey);
const edits = {
  [source.id]: {
    values: Object.fromEntries(
      modeKeys.map((key) => [
        key,
        { value: source.value, baseline: source.value },
      ]),
    ),
  },
};
const edited = projectAuthoringDataset(
  designSystemDefaults,
  { ...baseline.source, kind: "working" },
  edits,
);
const editedInventory = outputInventory(edited);
assert.equal(
  editedInventory.counts.explicitAssignments,
  2,
  "Explicit assignments are never deduplicated by value",
);
for (const key of modeKeys) {
  const id = browserAssignmentId(source.id, key);
  const observation = editedInventory.observations.find((row) =>
    row.assignmentIds.includes(id),
  )!;
  assert.equal(observation.lineage, "generated-baseline-and-edit");
  const row = edited.records.find(
    (record) => record.id === observation.recordId,
  )!;
  assert.equal(row.value, row.overrides?.generatedValue);
  assert.equal(
    editedInventory.assignments.find((item) => item.id === id)?.valueEvidence
      ?.assigned,
    source.value,
  );
}
const staleEdits = structuredClone(edits);
staleEdits[source.id].values[modeKeys[0]].baseline = Number(source.value) + 10;
const staleEditInventory = outputInventory(
  projectAuthoringDataset(designSystemDefaults, baseline.source, staleEdits),
);
assert.equal(
  staleEditInventory.assignments.find(
    (item) => item.id === browserAssignmentId(source.id, modeKeys[0]),
  )?.valueEvidence?.baseline,
  Number(source.value) + 10,
  "Authored edit baseline is preserved separately from regenerated output",
);
assert.equal(
  inventory.counts.explicitAssignments,
  0,
  "Working edits do not contaminate shipped data",
);
assert.equal(
  outputInventory({ ...edited, errors: ["Partial generation fixture"] }).status,
  "partial",
);

const rows = referenceRecords(
  "tokens/platform-fixture.json",
  [
    {
      uuid: "baseline",
      name: { property: "gap" },
      value: { value: 8, unit: "px" },
    },
    {
      uuid: "platform-a",
      name: { property: "gap", platform: "web", interfaceLevel: "base" },
      value: { value: 8, unit: "px" },
    },
    {
      uuid: "platform-b",
      name: { property: "gap", platform: "web", interfaceLevel: "elevated" },
      value: { value: 8, unit: "px" },
    },
  ],
  ["platform", "interfaceLevel"],
);
const reference: AnalysisInput = {
  source: { ...baseline.source, kind: "reference" },
  records: rows,
  categories: ["tokens"],
  schemas: [],
  errors: [],
  limitations: [],
  outputMetadata: referenceOutputMetadata(rows, ["platform", "interfaceLevel"]),
};
const referenceInventory = outputInventory(reference);
assert.equal(referenceInventory.counts.explicitAssignments, 3);
assert.deepEqual(
  referenceInventory.assignments.find((item) => item.pointer === "/0")?.context,
  {},
  "Baseline omission is not filled with wildcard/default",
);
assert.equal(
  referenceInventory.assignments.find((item) => item.pointer === "/2")?.context
    .interfaceLevel,
  "elevated",
);
assert(
  !baseline.outputMetadata!.axes.includes("interfaceLevel"),
  "Platform-local axes do not leak into the foundation",
);
assert.equal(
  referenceInventory.recipes.length,
  0,
  "Source records do not fabricate portable recipes or layer winners",
);

for (const malformed of [
  { ...baseline.outputMetadata, schemaVersion: 2 },
  {
    ...baseline.outputMetadata,
    assignments: [
      {
        id: "fake",
        kind: "inferred-default",
        source: "x",
        pointer: "",
        context: {},
      },
    ],
  },
  {
    ...baseline.outputMetadata,
    observations: [
      { ...baseline.outputMetadata!.observations[0], recipeId: "missing" },
    ],
  },
  {
    ...baseline.outputMetadata,
    observations: [
      baseline.outputMetadata!.observations[0],
      baseline.outputMetadata!.observations[0],
    ],
  },
  {
    ...baseline.outputMetadata,
    scenarios: baseline.outputMetadata!.scenarios.map((item) => ({
      ...item,
      omittedAxes: ["invented"],
    })),
  },
])
  assert.equal(isOutputMetadata(malformed, baseline.records), false);
const malformed = {
  ...reference,
  outputMetadata: { ...reference.outputMetadata!, schemaVersion: 2 } as never,
};
const invalid = compareDesignData(baseline, malformed);
assert.equal(invalid.valid, false);
assert(
  invalid.findings.some(
    (finding) =>
      finding.classification === "invalid-input" &&
      finding.message.includes("provenance"),
  ),
);
assert.equal(invalid.materialization?.inputs.reference.status, "unavailable");
assert.equal(
  outputInventory({ ...reference, outputMetadata: undefined }).counts
    .authoredSourceRecords,
  0,
  "Legacy transports cannot imply assignment provenance",
);
const report = compareDesignData(baseline, reference);
assert.equal(report.schemaVersion, 1);
assert.equal(report.materialization?.schemaVersion, 1);
assert(reportMarkdown(report).includes("Canonical materialized rows"));
assert(reportMarkdown(report).includes("declared bindings"));
assert.equal(
  reportMarkdown(report),
  reportMarkdown(JSON.parse(canonicalJson(report))),
  "Markdown provenance is stable across canonical JSON download/parse",
);
assert.equal(
  canonicalJson(report.materialization),
  canonicalJson(
    compareDesignData(
      { ...baseline, records: [...baseline.records].reverse() },
      { ...reference, records: [...reference.records].reverse() },
    ).materialization,
  ),
);
assert.equal(
  canonicalJson(report.metrics),
  canonicalJson(
    compareDesignData(
      { ...baseline, outputMetadata: undefined },
      { ...reference, outputMetadata: undefined },
    ).metrics,
  ),
);
console.log("Output materialization provenance checks passed.");
