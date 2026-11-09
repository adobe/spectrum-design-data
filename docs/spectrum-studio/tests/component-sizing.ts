// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { designSystemDefaults } from "../src/data/defaults";
import { resolveSizingFactors } from "../src/features/foundations/componentSizing";
import { resolveModeParameterValues } from "../src/features/modes/parameterResolution";
import { resolveTypographyDocument } from "../src/features/typography/resolution";
import { generateTypography } from "../src/features/typography/typographyGeneration";
import { buildTypographyCss } from "../src/features/typography/typographyCss";
import {
  generateDimensionScale,
  type DimensionScale,
} from "../src/features/scales/foundation";
import {
  NO_ROUNDING_RULE_ID,
  WHOLE_NUMBERS_RULE_ID,
} from "../src/features/logic/model";
import { buildTypographyComparisons } from "../src/features/typography/comparisons";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import {
  buildDimensionArtifacts,
  captureDimensionSource,
  validateDimensionBundle,
} from "../src/features/design-data/dimensionArtifacts";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import {
  AUTHORING_CAPABILITY_OPTIONS,
  FOUNDATION_PARAMETERS,
} from "../src/features/modes/parameters";

const system = structuredClone(designSystemDefaults.system);
for (const [id, label, control, description] of [
  [
    "typography.textSize",
    "Base text size",
    "sizingPercentage",
    "Set the starting text size as a percentage of the type scale before reading adjustments.",
  ],
  [
    "typography.textZoom",
    "Adaptive text scaling",
    "textZoom",
    "Adjust text for reading preferences without changing the baseline. Smaller text and headings can adjust at different rates.",
  ],
]) {
  const parameter = FOUNDATION_PARAMETERS.find((item) => item.id === id)!;
  assert.equal(parameter.label, label);
  assert.equal(parameter.control, control);
  assert.equal(
    AUTHORING_CAPABILITY_OPTIONS.find((item) => item.id === id)!.label,
    label,
    "Mode capabilities and foundation controls use the same terminology.",
  );
  assert.equal(parameter.description, description);
}
const textAdjustmentSet = system.modeSets.find(
  (set) => set.id === "mode-set-text-scaling",
)!;
assert.equal(textAdjustmentSet.name, "Adaptive text scaling");
assert.equal(textAdjustmentSet.key, "textScaling");
assert.equal(textAdjustmentSet.defaultModeId, "mode-text-scaling-default");
assert.deepEqual(textAdjustmentSet.authoringCapabilities, [
  "typography.textZoom",
]);
const adjustmentPanel = readFileSync(
  new URL(
    "../src/panels/foundations/FoundationsTypographyPanel.tsx",
    import.meta.url,
  ),
  "utf8",
);
assert.match(adjustmentPanel, /label=\{textAdjustmentParameter\.label\}/);
assert.match(adjustmentPanel, /\{textAdjustmentParameter\.description\}/);
assert.doesNotMatch(adjustmentPanel, /label="Text size"/);
const parameterControls = readFileSync(
  new URL("../src/components/ModeParameterControl.tsx", import.meta.url),
  "utf8",
);
for (const control of ["sizingPercentage", "textZoom"]) {
  const controlCase = parameterControls
    .split(`case "${control}":`)[1]
    ?.split(/\n\s+case /)[0];
  assert.match(
    controlCase ?? "",
    /contextualHelp=\{contextualHelp\}/,
    `${control} exposes its contextual help.`,
  );
}
const scaleSet = system.modeSets.find((set) => set.key === "scale")!;
const desktop = scaleSet.modes[0];
const mobile = scaleSet.modes[1];
assert.equal(scaleSet.name, "Scale");
assert.deepEqual(
  scaleSet.modes.map((mode) => mode.name),
  ["desktop", "mobile"],
);
assert.equal(desktop.key, "desktop");
assert.deepEqual(desktop.foundations, {});
const documents = {
  ...system.foundations,
  componentSizing: system.componentSizing,
};
const values = (modes = [mobile]) =>
  resolveModeParameterValues(documents, modes, undefined, {
    modeSets: system.modeSets,
  });
const factors = resolveSizingFactors(values());
assert.deepEqual(factors, {
  status: "ready",
  componentSize: 1.25,
  textSize: 17 / 14,
});
assert.deepEqual(resolveSizingFactors(values([desktop])), {
  status: "ready",
  componentSize: 1,
  textSize: 1,
});
assert.equal(
  resolveSizingFactors({ "size.componentSize": 0 }).status,
  "unavailable",
);
assert.equal(
  resolveSizingFactors({ "typography.textSize": Infinity }).status,
  "unavailable",
);
assert.equal(
  resolveModeParameterValues(
    documents,
    [mobile],
    { "size.componentSize": 1.5 },
    {
      modeSets: system.modeSets,
    },
  )["size.componentSize"],
  1.25,
  "An adaptive adjustment must not replace the modal baseline.",
);
const unowned = system.modeSets.map((set) =>
  set.id === scaleSet.id ? { ...set, authoringCapabilities: [] } : set,
);
assert.equal(
  resolveModeParameterValues(documents, [mobile], undefined, {
    modeSets: unowned,
  })["size.componentSize"],
  1,
);

const linear = structuredClone(
  system.scaleTypes.find((formula) => formula.kind === "linear")!,
);
linear.base.default = 24;
linear.parameters.find((parameter) => parameter.id === "step")!.default = 8;
const scale: DimensionScale = {
  ...system.foundations.size.scales[0],
  scaleTypeId: linear.id,
  base: undefined,
  below: 0,
  above: 2,
  startStep: 0,
  parameters: {},
  roundingRuleId: NO_ROUNDING_RULE_ID,
};
const raw = (prefix: string, input = values()) =>
  generateDimensionScale(prefix, scale, system.rules, [linear], input).map(
    (token) => token.value,
  );
assert.deepEqual(raw("size", values([desktop])), [24, 32, 40]);
assert.deepEqual(raw("size"), [30, 40, 50]);
assert.deepEqual(raw("radius"), [30, 40, 50]);
assert.deepEqual(raw("spacing"), [24, 32, 40]);
for (const formula of system.scaleTypes) {
  const configured = { ...scale, scaleTypeId: formula.id };
  const before = generateDimensionScale(
    "size",
    configured,
    system.rules,
    system.scaleTypes,
  );
  const after = generateDimensionScale(
    "size",
    configured,
    system.rules,
    system.scaleTypes,
    values(),
  );
  assert.deepEqual(
    after.map((token) => token.raw),
    before.map((token) => token.raw * 1.25),
  );
}
const zero = { ...linear, base: { ...linear.base, default: 0 } };
assert.equal(
  generateDimensionScale("radius", scale, system.rules, [zero], values())[0]
    .value,
  0,
);

const typography = {
  ...system.foundations.typography,
  smallSizes: 3,
  largeSizes: 14,
  textRoundingRuleId: WHOLE_NUMBERS_RULE_ID,
};
const reference: {
  name: { property: string; scale?: string; scaleIndex?: number };
  value?: string;
}[] = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/design-data/tokens/typography.tokens.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
for (const [mode, referenceScale] of [
  [desktop, "desktop"],
  [mobile, "mobile"],
] as const) {
  const resolved = resolveTypographyDocument(typography, [mode], undefined, {
    modeSets: system.modeSets,
  });
  const generated = generateTypography(
    resolved,
    undefined,
    system.rules,
    system.scaleTypes,
    system.interpolations,
  );
  const expected = reference.filter(
    (token) =>
      token.name.property.startsWith("font-size-") &&
      token.name.scale === referenceScale,
  );
  assert.equal(expected.length, 18);
  assert.equal(generated.length, 18);
  for (const token of expected)
    assert.equal(
      `${generated.find((item) => item.scale === token.name.scaleIndex)!.fontSize}px`,
      token.value,
      `${referenceScale}/${token.name.scaleIndex}`,
    );
}
const mobileType = resolveTypographyDocument(
  system.foundations.typography,
  [mobile],
  undefined,
  {
    modeSets: system.modeSets,
  },
);
assert.equal(mobileType.textSize, 17 / 14);
assert.equal(mobileType.textZoom, system.foundations.typography.textZoom);
assert.equal(
  mobileType.textRoundingRuleId,
  system.foundations.typography.textRoundingRuleId,
);
const css = buildTypographyCss(typography, {
  modeSets: system.modeSets,
  rules: system.rules,
});
assert.match(css, /\[data-scale="mobile"\]\[data-text-zoom="2"\]/);
const comparisons = buildTypographyComparisons(
  typography,
  system.modeSets,
  system.taxonomy,
  {
    rules: system.rules,
    scaleTypes: system.scaleTypes,
    interpolations: system.interpolations,
  },
);
assert.equal(comparisons.modes!.settings.length, 6);
assert(
  comparisons.modes!.settings.some((setting) => setting.textSize === 17 / 14),
);
const snapshot = createDefaultSnapshot();
const artifact = await buildDimensionArtifacts(
  captureDimensionSource(snapshot),
);
assert.deepEqual(
  await validateDimensionBundle(JSON.parse(JSON.stringify(artifact))),
  artifact,
  "Captured modal factors survive artifact/cache validation.",
);
const target = artifact.lineage.find(
  (row) =>
    row.domain === "size" && row.kind === "binding" && row.generatedValue > 0,
)!;
assert(target);
const edited = structuredClone(snapshot);
const browserId = `size-${target.scaleId}-${target.step}`;
const modeKey = canonicalTokenModeKey(target.selection);
edited.browserTokenEdits = {
  ...edited.browserTokenEdits,
  [browserId]: {
    values: { [modeKey]: { value: 77, baseline: target.generatedValue } },
  },
};
const explicit = await buildDimensionArtifacts(captureDimensionSource(edited));
const override = explicit.lineage.find(
  (row) =>
    row.domain === "size" &&
    row.scaleId === target.scaleId &&
    row.step === target.step &&
    row.kind === "override",
)!;
assert(override);
assert.equal(
  explicit.tokens.find((token) => token.uuid === override.uuid)!.value,
  "77px",
);
edited.modeSets.find(
  (set) => set.key === "scale",
)!.modes[1].foundations.size!.componentSize = 1.4;
const stale = await buildDimensionArtifacts(captureDimensionSource(edited));
const staleOverride = stale.lineage.find((row) => row.uuid === override.uuid)!;
assert.equal(
  stale.tokens.find((token) => token.uuid === override.uuid)!.value,
  "77px",
);
assert.notEqual(staleOverride.generatedValue, override.generatedValue);
assert.equal(staleOverride.edit!.authoredBaseline, target.generatedValue);
console.log(
  "Component sizing: modal ownership, raw progressions, exclusions, all 36 reference font sizes, CSS and comparisons passed.",
);
