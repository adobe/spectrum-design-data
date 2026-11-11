// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import {
  buildTshirtArtifacts,
  selectedTshirtRows,
  liveTshirtRow,
} from "../src/features/design-data/tshirtArtifacts";
import { tshirtMappings } from "../src/features/logic/tshirt";
import { createRule, WHOLE_NUMBERS_RULE_ID } from "../src/features/logic/model";
import { generateDimensionScale } from "../src/features/scales/foundation";
import { resolveModeParameterValues } from "../src/features/modes/parameterResolution";
import { centerInMinHeight } from "../src/features/structures/resolution";
import {
  assignStructure,
  structureGeneration,
} from "../src/features/structures/model";
import { structureCandidates } from "../src/features/structures/children";
import type { PrimitiveReference } from "../src/features/tokens/primitiveReferences";
import { primitiveReferencesFromOutputs } from "../src/features/tokens/primitiveReferences";
import { generateTypography } from "../src/features/typography/typographyGeneration";
import { resolveTypographyDocument } from "../src/features/typography/resolution";

const source = createDefaultSnapshot();
const axis = source.modeSets.find((set) => set.key === "scale")!;
const mobile = axis.modes.find((mode) => mode.key === "mobile")!;
const base = source.structures!.structures.find(
  (structure) => structure.name === "Base",
)!;
const defaults = Object.fromEntries(
  source.modeSets.map((set) => [set.id, set.defaultModeId]),
);
const selection = { ...defaults, [axis.id]: mobile.id };
const bundle = buildTshirtArtifacts(source);
const desktopRows = selectedTshirtRows(
  bundle,
  base.conceptId,
  "m",
  defaults,
).filter((row) => !row.optionId && !row.token.name.element);
const mobileRows = selectedTshirtRows(
  bundle,
  base.conceptId,
  "m",
  selection,
).filter((row) => !row.optionId && !row.token.name.element);
const pick = (
  rows: typeof mobileRows,
  property: string,
  orientation?: string,
) =>
  rows.find(
    (row) =>
      row.token.name.property === property &&
      row.token.name.orientation === orientation,
  )!;
assert.equal(pick(desktopRows, "min-height").target.value, 32);
assert.equal(pick(mobileRows, "min-height").target.value, 40);
assert.equal(pick(desktopRows, "padding", "horizontal").target.value, 12);
assert.equal(pick(mobileRows, "padding", "horizontal").target.value, 15);
assert.equal(
  pick(mobileRows, "corner-radius").target.value,
  Number(pick(desktopRows, "corner-radius").target.value) * 1.25,
);
const parameters = resolveModeParameterValues(
  {
    color: source.colorSystem,
    typography: source.typography,
    componentSizing: source.componentSizing,
  },
  [mobile],
  undefined,
  { modeSets: source.modeSets },
);
const dimensions = (domain: "size" | "spacing" | "radius") =>
  source[domain]!.scales.map((scale) => ({
    scale,
    values: generateDimensionScale(
      domain,
      scale,
      source.rules,
      source.scaleTypes,
      parameters,
    ),
  }));
const typography = resolveTypographyDocument(
  source.typography,
  [mobile],
  undefined,
  { modeSets: source.modeSets },
);
const references = primitiveReferencesFromOutputs(
  {
    spacing: dimensions("spacing"),
    size: dimensions("size"),
    radius: dimensions("radius"),
    elevation: { document: source.elevation!, levels: [] },
    typography: {
      document: typography,
      values: generateTypography(
        typography,
        undefined,
        source.rules,
        source.scaleTypes,
        source.interpolations,
      ),
      naming: {
        registry: source.taxonomy!,
        names: typography.metricNames,
        outputUnit: typography.outputUnit,
      },
    },
  },
  source.taxonomy!,
);
for (const row of mobileRows)
  assert.equal(
    liveTshirtRow(row, references).target.value,
    row.target.value,
    "Generated semantic output and the live preview must agree.",
  );
const centeredBinding = base.properties.find(
  (binding) => "value" in binding && binding.value.kind === "derived",
)!;
assert(
  centeredBinding &&
    "value" in centeredBinding &&
    centeredBinding.value.kind === "derived",
);
const contentRef = centeredBinding.value.contentRef;
const content = references.find((reference) => reference.id === contentRef)!;
assert.equal(
  pick(mobileRows, "padding", "vertical").target.value,
  centerInMinHeight(40, Number(content.value)).value,
);
assert(bundle.semantics.some((row) => row.context.scale === "mobile"));
assert.deepEqual(
  new Set(mobileRows.map((row) => row.conceptId)),
  new Set(desktopRows.map((row) => row.conceptId)),
  "Changing modes must not change semantic identities.",
);
const reused = structuredClone(source);
const catalog = reused.structures!.structures;
const parent = catalog.find(
  (structure) =>
    structure.conceptId !== base.conceptId &&
    structureCandidates(catalog, structure.conceptId).some(
      (candidate) => candidate.conceptId === base.conceptId,
    ),
);
assert(
  parent,
  "The fixture needs an acyclic parent for two shared Base instances.",
);
delete parent.editor;
const instances = [0, 1].map(() => ({
  id: crypto.randomUUID(),
  kind: "structureReference" as const,
  structureId: base.conceptId,
}));
parent.elements = [...(parent.elements ?? []), ...instances];
const reusedBundle = buildTshirtArtifacts(reused);
for (const instance of instances) {
  const nested = catalog.find(
    (structure) => structure.conceptId === instance.structureId,
  );
  assert(nested);
  const rows = selectedTshirtRows(
    reusedBundle,
    nested.conceptId,
    "m",
    selection,
  ).filter((row) => !row.optionId && !row.token.name.element);
  assert.equal(pick(rows, "min-height").target.value, 40);
  assert.equal(pick(rows, "padding", "horizontal").target.value, 15);
  assert.deepEqual(
    rows.map((row) => row.token.uuid),
    mobileRows.map((row) => row.token.uuid),
    "Nested instances must reuse the source's modal tokens, not publish scaled copies.",
  );
}

const ratioRule = {
  ...createRule("tshirt-sizing"),
  movement: "ratio" as const,
  ratio: { kind: "value" as const, value: 1.125 },
  roundingRuleId: WHOLE_NUMBERS_RULE_ID,
};
const anchor: PrimitiveReference = {
  id: "typed-padding",
  family: "spacing",
  sourceId: "typed",
  nativeId: "typed",
  index: 0,
  step: 100,
  sourceName: "typed",
  name: "12px",
  value: 12,
  displayValue: "12px",
  unit: "px",
  hidden: true,
  synthetic: true,
};
const context = { rules: source.rules, componentSize: 1.25 };
const map = (reference: PrimitiveReference, rule = ratioRule) =>
  tshirtMappings(rule, reference, [reference], ["m"], context)[0].target;
assert.equal(map(anchor).value, 15);
assert.equal(map({ ...anchor, family: "size", value: 32 }).value, 40);
assert.equal(map({ ...anchor, family: "radius", value: 0 }).value, 0);
assert.equal(
  map({ ...anchor, family: "size", value: 40, synthetic: false, hidden: false })
    .value,
  40,
  "A resolved Size primitive must not be scaled a second time.",
);
assert.equal(map({ ...anchor, family: "typography", value: 17 }).value, 17);
assert.equal(map({ ...anchor, value: 1.5, unit: "multiplier" }).value, 1.5);
const availableRule = createRule("tshirt-sizing");
const spacing = { ...anchor, synthetic: false, hidden: false };
const transformed = tshirtMappings(
  availableRule,
  spacing,
  [spacing],
  ["m"],
  context,
)[0].target;
assert.equal(transformed.value, 15);
assert.equal(transformed.synthetic, true);
assert.equal(spacing.value, 12);
assert.notEqual(
  transformed.id,
  spacing.id,
  "Transformed spacing cannot alias the unchanged primitive.",
);

const inactive = structuredClone(source);
const inactiveBase = inactive.structures!.structures.find(
  (structure) => structure.conceptId === base.conceptId,
)!;
const generation = structureGeneration(inactiveBase);
generation.applications = [];
inactiveBase.generation = generation;
delete inactiveBase.editor;
inactiveBase.elements = [];
inactiveBase.properties = assignStructure(inactiveBase, {
  paddingLeft: { value: { kind: "number", value: 12, unit: "px" } },
}).properties;
inactive.structures!.structures = [inactiveBase];
const literalBinding = inactiveBase.properties.find(
  (binding) => "value" in binding && binding.value.kind === "number",
)!;
assert(
  literalBinding &&
    "value" in literalBinding &&
    literalBinding.value.kind === "number",
);
const inactiveRows = buildTshirtArtifacts(inactive).semantics.filter(
  (row) =>
    row.structureId === base.conceptId &&
    row.bindingIds.includes(literalBinding.id),
);
assert(inactiveRows.length > 0);
const literalValue = literalBinding.value.value;
assert(
  inactiveRows.every((row) => row.target.value === literalValue),
  "An ungenerated typed value remains constant rather than scaling with its former Generator.",
);
const excluded = structuredClone(source);
const excludedBase = excluded.structures!.structures.find(
  (structure) => structure.conceptId === base.conceptId,
)!;
excludedBase.properties = assignStructure(excludedBase, {
  paddingLeft: { value: { kind: "number", value: 12, unit: "px" } },
}).properties;
const excludedGeneration = structureGeneration(excludedBase);
excludedBase.generation = {
  ...excludedGeneration,
  applications: excludedGeneration.applications.map((application) => ({
    ...application,
    targets: {
      kind: "custom",
      bindingIds: (application.targets.kind === "all"
        ? excludedBase.properties.map((binding) => binding.id)
        : application.targets.bindingIds
      ).filter((id) => id !== literalBinding.id),
    },
  })),
};
const excludedRows = buildTshirtArtifacts(excluded).semantics.filter(
  (row) =>
    row.structureId === base.conceptId &&
    row.bindingIds.includes(literalBinding.id) &&
    !row.optionId &&
    !row.token.name.element,
);
assert(excludedRows.length > 0);
assert(
  excludedRows.every((row) => row.target.value === literalValue),
  "An attached Generator must not scale a property excluded from its targets.",
);
console.log(
  "Component sizing Structures: eligible typed and spacing values, exactly-once references, centered padding, preview agreement, identities and inactive generators passed.",
);
