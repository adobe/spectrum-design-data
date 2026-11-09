// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  assessModeCoverage,
  modeDeclaration,
} from "../src/features/design-data/modeCoverage";
import { parseReviewedMappings } from "../src/features/design-data/mappings";
import { resolveColorOpacityValues } from "../scripts/color-opacity-resolution";
import { fileURLToPath } from "node:url";
import { assessColorsAndOpacities } from "../src/features/design-data/colorOpacityAssessment";
import {
  compareDesignData,
  reportMarkdown,
  reportWithFreshness,
  type AnalysisInput,
  type AnalysisRecord,
} from "../src/features/design-data/comparison";

const set = (
  key: string,
  modes: string[],
  defaultMode = modes[0],
  id = key,
): AnalysisRecord => ({
  id,
  identity: id,
  name: key,
  category: "mode-sets",
  source: `mode-sets/${key}.json`,
  pointer: "",
  classification: "authored",
  value: { name: key, modes, default: defaultMode },
});
const scheme = set("colorScheme", ["light", "dark"]);
const contrast = set("contrast", ["regular", "high"]);
const token = (
  id: string,
  context: Record<string, string>,
  value = "rgb(100, 100, 100)",
): AnalysisRecord => ({
  id,
  identity: id,
  conceptId: "gray",
  name: "gray-100",
  category: "tokens",
  source: "tokens/colors.json",
  pointer: `/${id}`,
  classification: "generated",
  structuredName: { property: "color", colorFamily: "gray", scaleIndex: 100 },
  context,
  value,
});
const input = (
  records: AnalysisRecord[],
  kind: "defaults" | "reference" = "defaults",
): AnalysisInput => ({
  source: {
    kind,
    root: "fixture",
    hash: "fixture",
    revision: "fixture",
    dirty: false,
    version: "fixture",
    validator: "fixture",
  },
  records,
  categories: ["mode-sets", "tokens"],
  errors: [],
  limitations: [],
  schemas: [],
  inventoryStatus: "complete",
});
const reference = input(
  [scheme, contrast, token("r", { colorScheme: "light" })],
  "reference",
);
const app = input([
  scheme,
  contrast,
  token("base", { colorScheme: "light", contrast: "regular" }),
  token("high", { colorScheme: "light", contrast: "high" }, "rgb(250, 0, 0)"),
]);
const baseline = assessColorsAndOpacities(app, reference);
assert.equal(baseline.schemaVersion, 4);
assert.equal(baseline.concepts[0].verdict, "pass");
assert.equal(baseline.counts.rows, 1);
assert.deepEqual(baseline.concepts[0].rows[0].context, {
  colorScheme: "light",
  contrast: "regular",
});
assert.equal(baseline.enhancements.length, 1);
assert.equal(baseline.enhancements[0].context.contrast, "high");
assert.equal(
  assessColorsAndOpacities(app, { ...reference, inventoryStatus: "partial" })
    .enhancements.length,
  0,
  "Incomplete reference evidence cannot establish enhancements.",
);
const withoutHigh = assessColorsAndOpacities(
  input(app.records.filter((row) => row.id !== "high")),
  reference,
);
assert.deepEqual(baseline.counts, withoutHigh.counts);
assert.equal(baseline.exactPercent, withoutHigh.exactPercent);
assert.equal(assessModeCoverage(app, reference).result, "pass");

const highReference = input(
  [
    ...reference.records,
    token("rh", { colorScheme: "light", contrast: "high" }),
  ],
  "reference",
);
const high = assessColorsAndOpacities(app, highReference);
assert.equal(high.concepts[0].verdict, "fail");
assert.equal(high.enhancements.length, 0);

const missingHigh = input([
  scheme,
  set("contrast", ["regular"]),
  token("base", { colorScheme: "light" }),
]);
const missing = assessModeCoverage(missingHigh, reference);
assert.equal(missing.result, "fail");
assert.equal(missing.counts.missingModes, 1);
assert.equal(
  assessColorsAndOpacities(missingHigh, reference).concepts[0].verdict,
  "pass",
  "Globally missing High does not fail a Regular-only reference token.",
);
assert.equal(
  assessColorsAndOpacities(missingHigh, highReference).concepts[0].verdict,
  "fail",
);
const report = compareDesignData(missingHigh, reference);
assert.equal(
  report.findings.filter((finding) => finding.classification === "mode-gap")
    .length,
  1,
  "A missing mode has one structural finding, not a second set-level failure.",
);

const missingSet = input([contrast, token("base", {})]);
assert.equal(assessModeCoverage(missingSet, reference).counts.missingSets, 1);
const missingToken = assessColorsAndOpacities(missingSet, reference)
  .concepts[0];
assert.equal(missingToken.verdict, "fail");
assert.deepEqual(missingToken.rows[0].modeFailures, [scheme.id]);

const extra = input([
  ...app.records,
  set("textScaling", ["default", "larger"]),
]);
assert.equal(assessModeCoverage(extra, reference).counts.enhancementSets, 1);
assert.equal(assessModeCoverage(extra, reference).result, "pass");
const extraModes = input(
  app.records.map((row) =>
    row.id === scheme.id ? set("colorScheme", ["light", "dark", "sepia"]) : row,
  ),
);
assert.equal(
  assessModeCoverage(extraModes, reference).counts.enhancementModes,
  1,
);
assert(
  !compareDesignData(extraModes, reference).findings.some(
    (finding) => finding.classification === "mode-gap",
  ),
);

const differentDefault = input([
  scheme,
  set("contrast", ["regular", "high"], "high"),
  token("high", { colorScheme: "light" }, "red"),
  token("regular", { colorScheme: "light", contrast: "regular" }),
]);
const defaultResult = assessColorsAndOpacities(differentDefault, reference);
assert.equal(
  defaultResult.concepts[0].verdict,
  "pass",
  "The explicit required mode takes precedence over its fallback, independently of the app's default.",
);
differentDefault.resolvedValues = [
  {
    id: "high",
    selectedId: "regular",
    context: { colorScheme: "light", contrast: "regular" },
    value: "rgb(100, 100, 100)",
    chain: ["regular"],
    issue: null,
  },
  {
    id: "regular",
    selectedId: "regular",
    context: { colorScheme: "light", contrast: "regular" },
    value: "rgb(100, 100, 100)",
    chain: ["regular"],
    issue: null,
  },
];
assert.equal(
  assessColorsAndOpacities(differentDefault, reference).concepts[0].verdict,
  "pass",
);
assert.equal(assessModeCoverage(differentDefault, reference).result, "pass");

const objectModes = {
  ...contrast,
  value: {
    key: "contrast",
    modes: [
      { id: "r", key: "regular" },
      { id: "h", key: "high" },
    ],
    defaultModeId: "r",
  },
};
assert.deepEqual(modeDeclaration(objectModes).modes, ["regular", "high"]);
assert.equal(modeDeclaration(objectModes).default, "regular");
assert.equal(
  modeDeclaration({
    ...contrast,
    value: { key: "contrast", modes: [{ key: "regular" }, { key: "high" }] },
  }).default,
  undefined,
  "Mode objects without an explicit default never select the first mode.",
);
assert(
  modeDeclaration({
    ...contrast,
    value: {
      key: "contrast",
      modes: [
        { id: "same", key: "regular" },
        { id: "same", key: "high" },
      ],
      defaultModeId: "same",
    },
  }).issues.length > 0,
);
assert.equal(
  assessModeCoverage(input([scheme, objectModes]), reference).result,
  "pass",
);
const renamed = input([
  scheme,
  set("accessibility", ["normal", "strong"], "normal", "app-contrast"),
]);
const mapping = parseReviewedMappings([
  {
    app: "app-contrast",
    reference: "contrast",
    rationale: "Reviewed equivalent axis and mode keys.",
    modeKeys: { normal: "regular", strong: "high" },
  },
]);
assert.equal(assessModeCoverage(renamed, reference, mapping).result, "pass");
assert.equal(
  assessModeCoverage(renamed, reference, mapping).sets.find(
    (set) => set.reference?.key === "contrast",
  )?.app?.key,
  "accessibility",
);
assert.throws(
  () =>
    parseReviewedMappings([
      { app: "a", reference: "r", rationale: "review", modeKeys: { high: 1 } },
    ]),
  /modeKeys/,
);

for (const records of [
  [scheme, contrast, { ...contrast, id: "duplicate" }],
  [scheme, set("contrast", ["regular", "regular"])],
  [scheme, set("contrast", ["regular", "high"], "invalid")],
]) {
  const result = assessModeCoverage(input(records), reference);
  assert.equal(result.result, "unassessable");
  assert.equal(result.counts.missingModes, 0);
  assert.equal(result.counts.enhancementModes, 0);
}
assert.equal(
  assessModeCoverage({ ...app, inventoryStatus: "partial" }, reference).result,
  "unassessable",
);
const current = compareDesignData(app, reference);
const stale = reportWithFreshness(current, "stale");
assert.equal(stale.modeCoverage?.result, "unassessable");
assert.equal(stale.colorOpacity?.enhancements.length, 0);
assert.match(reportMarkdown(current), /Mode coverage/);
assert.match(reportMarkdown(current), /Token enhancements/);
assert.equal(current.colorOpacity?.modeCoverage, current.modeCoverage);
assert.equal(
  assessModeCoverage(
    input([...app.records, set("extra-invalid", [], "unknown")]),
    reference,
  ).result,
  "pass",
  "An invalid unrelated app-only declaration cannot reduce required mode support.",
);
assert.equal(
  assessModeCoverage(renamed, reference, [
    { ...mapping[0], modeKeys: { missing: "high" } },
  ]).result,
  "unassessable",
);
assert.equal(
  assessModeCoverage(renamed, reference, [
    { ...mapping[0], modeKeys: { normal: "high", strong: "high" } },
  ]).result,
  "unassessable",
);

if (process.env.COLOR_OPACITY_SDK_TESTS) {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const nativeReference = await resolveColorOpacityValues(reference, root);
  assert.equal(nativeReference.valueResolution?.error, undefined);
  const nativeDefaults = await resolveColorOpacityValues(
    differentDefault,
    root,
    undefined,
    nativeReference,
  );
  assert.equal(nativeDefaults.valueResolution?.error, undefined);
  const defaults = assessColorsAndOpacities(nativeDefaults, nativeReference);
  assert.equal(defaults.concepts[0].verdict, "pass");
  assert.equal(defaults.concepts[0].rows[0].app?.id, "regular");

  const onlySchemeReference = input(
    [scheme, token("r", { colorScheme: "light" })],
    "reference",
  );
  const appOnlyAxis = input([
    scheme,
    set("zoom", ["normal", "large"]),
    token("normal", { colorScheme: "light" }),
    token("large", { colorScheme: "light", zoom: "large" }, "red"),
  ]);
  const nativeScheme = await resolveColorOpacityValues(
    onlySchemeReference,
    root,
  );
  const nativeExtra = await resolveColorOpacityValues(
    appOnlyAxis,
    root,
    undefined,
    nativeScheme,
  );
  const extra = assessColorsAndOpacities(nativeExtra, nativeScheme);
  assert.equal(extra.concepts[0].verdict, "pass");
  assert.deepEqual(extra.concepts[0].rows[0].appContext, {
    colorScheme: "light",
    zoom: "normal",
  });
  assert.equal(extra.enhancements.length, 1);
  assert.equal(extra.enhancements[0].context.zoom, "large");

  const alias: AnalysisRecord = {
    ...token("alias", {}),
    conceptId: "semantic",
    reference: "gray",
    value: undefined,
    structuredName: { property: "color", colorRole: "accent" },
  };
  const nativeHighReference = await resolveColorOpacityValues(
    input([...highReference.records, alias], "reference"),
    root,
  );
  const nativeHighApp = await resolveColorOpacityValues(
    input([
      ...app.records,
      { ...alias, id: "app-alias", identity: "app-alias" },
    ]),
    root,
    undefined,
    nativeHighReference,
  );
  assert.equal(nativeHighReference.valueResolution?.error, undefined);
  assert.equal(nativeHighApp.valueResolution?.error, undefined);
  const aliasResult = assessColorsAndOpacities(
    nativeHighApp,
    nativeHighReference,
  ).concepts.find((concept) => concept.id === "semantic");
  assert.equal(aliasResult?.verdict, "fail");
  assert(
    aliasResult?.rows.some(
      (row) => row.context.contrast === "high" && row.verdict === "fail",
    ),
  );

  const renamedApp = input([
    ...renamed.records,
    token("normal", { colorScheme: "light", accessibility: "normal" }),
    token("strong", { colorScheme: "light", accessibility: "strong" }, "red"),
  ]);
  const nativeRenamed = await resolveColorOpacityValues(
    renamedApp,
    root,
    undefined,
    nativeReference,
  );
  assert.equal(nativeRenamed.valueResolution?.error, undefined);
  const renamedResult = assessColorsAndOpacities(
    nativeRenamed,
    nativeReference,
    mapping,
  );
  assert.equal(renamedResult.concepts[0].verdict, "pass");
  assert.equal(
    renamedResult.concepts[0].rows[0].appContext?.accessibility,
    "normal",
  );
  console.log(
    "Native mode coverage: reference defaults, app-only axes, alias High requirements and renamed modes pass.",
  );
}
console.log(
  "Mode coverage: declarations, required support, per-token applicability, enhancements, defaults, reviewed mappings, ambiguity and report parity pass.",
);
