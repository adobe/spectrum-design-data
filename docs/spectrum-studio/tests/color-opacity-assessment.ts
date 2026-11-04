// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { referenceRecords } from "../scripts/design-data-loader";
import { resolveColorOpacityValues } from "../scripts/color-opacity-resolution";
import { defaultsAnalysisInput } from "../src/features/design-data/projection";
import {
  colorOpacityTree,
  colorOpacityClassificationChanges,
  valueBadgeVariant,
} from "../src/views/analysis/colorOpacityPresentation";
import {
  assessColorsAndOpacities,
  aggregateVerdicts,
  normalizedOpacity,
  requiredValueContexts,
  colorOpacityMarkdown,
} from "../src/features/design-data/colorOpacityAssessment";
import {
  compareDesignData,
  reportMarkdown,
  reportWithFreshness,
  type AnalysisInput,
  type AnalysisRecord,
} from "../src/features/design-data/comparison";
import { canonicalJson } from "../src/features/design-data/canonicalJson";

const token = (
  id: string,
  extra: Partial<AnalysisRecord> = {},
): AnalysisRecord => ({
  id,
  identity: id,
  conceptId: id,
  category: "tokens",
  name: id,
  source: "tokens/mixed.json",
  pointer: "",
  classification: "generated",
  structuredName: { property: "color", colorFamily: "gray", scaleIndex: 100 },
  value: "rgb(217, 217, 217)",
  context: { colorScheme: "light" },
  ...extra,
});
const modes = referenceRecords("mode-sets/scheme.json", {
  name: "colorScheme",
  modes: ["light", "dark", "wireframe"],
  default: "light",
});
const input = (
  records: AnalysisRecord[],
  kind: "defaults" | "reference" = "defaults",
): AnalysisInput => ({
  records: [...records, ...modes],
  source: {
    kind,
    root: "fixture",
    hash: "fixture",
    revision: "fixture",
    dirty: false,
    version: "fixture",
    validator: "fixture",
  },
  errors: [],
  limitations: [],
  categories: ["tokens", "mode-sets"],
  schemas: [],
  inventoryStatus: "complete",
});
const assess = (app: AnalysisRecord[], reference: AnalysisRecord[]) =>
  assessColorsAndOpacities(input(app), input(reference, "reference"));
const primitive = token("r");
assert.equal(assess([token("a")], [primitive]).concepts[0].verdict, "pass");
assert.equal(
  assess([token("a", { value: "rgb(218, 216, 217)" })], [primitive]).concepts[0]
    .verdict,
  "acceptable",
);
assert.equal(
  assess([token("a", { value: "rgb(250, 217, 217)" })], [primitive]).concepts[0]
    .verdict,
  "fail",
);
const perceptuallyClose = assess(
  [token("a", { value: "rgb(221, 221, 221)" })],
  [primitive],
);
assert.equal(perceptuallyClose.concepts[0].verdict, "acceptable");
assert.equal(perceptuallyClose.counts.pass, 0);
assert.equal(perceptuallyClose.counts.acceptable, 1);
assert.equal(perceptuallyClose.exactPercent, 0);
assert.equal(perceptuallyClose.acceptablePercent, 100);
assert(perceptuallyClose.concepts[0].rows[0].deltaE2000! < 2);
assert.match(
  colorOpacityMarkdown(perceptuallyClose),
  /Delta E 2000 is less than 2/,
);
assert.equal(
  assess([token("a", { value: "rgba(217, 217, 217, 0.99)" })], [primitive])
    .concepts[0].verdict,
  "fail",
);
assert.equal(
  assess([token("a", { value: "not a color" })], [primitive]).concepts[0]
    .verdict,
  "unassessable",
);
assert.equal(assess([], [primitive]).concepts[0].verdict, "unassessable");
assert.equal(
  assess([token("a"), token("b")], [primitive]).concepts[0].verdict,
  "unassessable",
);
assert.equal(
  assess(
    [
      token("r", {
        structuredName: {
          property: "color",
          colorFamily: "blue",
          scaleIndex: 100,
        },
      }),
    ],
    [primitive],
  ).concepts[0].verdict,
  "fail",
);
assert.equal(
  assess(
    [
      token("r", {
        structuredName: {
          property: "color",
          colorFamily: "blue",
          scaleIndex: 100,
        },
      }),
    ],
    [primitive],
  ).concepts[0].rows[0].verdict,
  "pass",
);
assert.equal(
  assess(
    [token("a")],
    [
      token("light", { conceptId: "c" }),
      token("dark", { conceptId: "c", context: { colorScheme: "dark" } }),
    ],
  ).concepts[0].verdict,
  "fail",
);
assert.equal(
  assess([token("a")], [token("gone", { lifecycle: { deprecatedIn: "1" } })])
    .counts.concepts,
  0,
);
assert.equal(assess([token("a")], []).exactPercent, null);
assert.deepEqual(["0.4", "40%", 0.4].map(normalizedOpacity), [0.4, 0.4, 0.4]);
assert.equal(normalizedOpacity("4e-1"), 0.4);
for (const invalid of [
  "",
  "NaN",
  "Infinity",
  "101%",
  -0.1,
  1.1,
  null,
  {},
  Number.NaN,
])
  assert.equal(normalizedOpacity(invalid), undefined);
const opacity = token("opacity", {
  structuredName: { property: "opacity", colorRole: "overlay" },
  value: "0.4",
  context: {},
});
assert.equal(
  assess(
    [
      token("app-opacity", {
        ...opacity,
        id: "app-opacity",
        identity: "app-opacity",
        value: "40%",
      }),
    ],
    [opacity],
  ).concepts[0].verdict,
  "pass",
);
assert.equal(
  assess(
    [
      token("app-opacity", {
        ...opacity,
        id: "app-opacity",
        identity: "app-opacity",
        value: 0.400001,
      }),
    ],
    [opacity],
  ).concepts[0].verdict,
  "fail",
);
assert.equal(aggregateVerdicts(["acceptable", "unassessable"]), "unassessable");
assert.equal(aggregateVerdicts(["fail", "unassessable"]), "fail");
assert.equal(aggregateVerdicts([]), "unassessable");
assert.equal(
  assess(
    [token("static", { context: {} })],
    [token("mode", { context: { colorScheme: "dark" } })],
  ).concepts[0].verdict,
  "pass",
  "Unqualified app values are wildcards, not default-Light values",
);
assert.equal(
  assess(
    [
      token("light"),
      token("dark", { context: { colorScheme: "dark" }, value: "black" }),
    ],
    [token("constant", { context: {} })],
  ).concepts[0].verdict,
  "pass",
  "A varying app value is compared only in reference-required modes",
);
assert.equal(
  assess(
    [token("app", { context: { colorScheme: "unsupported" } })],
    [token("reference", { context: { colorScheme: "unsupported" } })],
  ).concepts[0].verdict,
  "unassessable",
);
const failedClassification = assess(
  [
    token("r", {
      structuredName: {
        property: "color",
        colorFamily: "blue",
        scaleIndex: 100,
      },
    }),
  ],
  [primitive],
);
assert.ok(
  colorOpacityClassificationChanges(
    failedClassification.concepts[0],
  ).fields.some((field) => field.key === "Color family"),
);
const tree = colorOpacityTree(failedClassification.concepts, "R", "fail");
assert.equal(tree[0].concept.verdict, "fail");
assert.equal(tree[0].children[0].value?.verdict, "pass");
assert.match(tree[0].children[0].label, /Color scheme: Light/);
assert.equal(
  colorOpacityTree(failedClassification.concepts, "absent", "all").length,
  0,
);
assert.deepEqual(valueBadgeVariant, {
  pass: "positive",
  acceptable: "orange",
  fail: "negative",
  unassessable: "neutral",
});
assert.equal(
  assess([], [primitive]).concepts[0].rows[0].referenceValue,
  primitive.value,
);

const alias = token("semantic", {
  structuredName: {
    property: "color",
    colorRole: "accent",
    state: ["hover"],
    component: "button",
  },
  reference: "base-concept",
  value: undefined,
  context: {},
  conceptId: "semantic",
});
const graph = input([
  alias,
  token("base-light", { conceptId: "base-concept", value: "white" }),
  token("base-dark", {
    conceptId: "base-concept",
    value: "black",
    context: { colorScheme: "dark" },
  }),
  token("base-wireframe", {
    conceptId: "base-concept",
    value: "red",
    context: { colorScheme: "wireframe" },
    lifecycle: { deprecatedIn: "1" },
  }),
]);
assert.deepEqual(
  requiredValueContexts(alias, graph).map((context) => context.colorScheme),
  ["dark", "light", "wireframe"],
);
const root = fileURLToPath(new URL("../../../", import.meta.url));
const resolved: AnalysisInput = process.env.COLOR_OPACITY_SDK_TESTS
  ? await resolveColorOpacityValues(graph, root)
  : {
      ...graph,
      valueResolution: { datasetHash: "fixture", engine: "fixture" },
      resolvedValues: [
        {
          id: "semantic",
          context: { colorScheme: "dark" },
          value: "black",
          chain: ["semantic", "base-dark"],
          issue: null,
        },
        {
          id: "semantic",
          context: { colorScheme: "light" },
          value: "white",
          chain: ["semantic", "base-light"],
          issue: null,
        },
        {
          id: "semantic",
          context: { colorScheme: "wireframe" },
          value: "red",
          chain: ["semantic", "base-wireframe"],
          issue: null,
        },
      ],
    };
assert.equal(
  resolved.valueResolution?.error,
  undefined,
  resolved.valueResolution?.error,
);
assert.equal(
  resolved.resolvedValues?.find(
    (row) => row.id === "semantic" && row.context.colorScheme === "dark",
  )?.value,
  "black",
);
assert.equal(
  resolved.resolvedValues?.find(
    (row) => row.id === "semantic" && row.context.colorScheme === "wireframe",
  )?.value,
  "red",
);
const reference = {
  ...resolved,
  source: { ...resolved.source, kind: "reference" as const },
};
const evaluated = assessColorsAndOpacities(resolved, reference);
assert.equal(
  evaluated.concepts.find((concept) => concept.id === "semantic")?.verdict,
  "pass",
);
assert.equal(evaluated.counts.excludedDeprecated, 1);
const stale = { ...resolved, source: { ...resolved.source, hash: "changed" } };
assert.equal(
  assessColorsAndOpacities(stale, reference).concepts.find(
    (concept) => concept.id === "semantic",
  )?.verdict,
  "unassessable",
);
const unavailable = await resolveColorOpacityValues(
  graph,
  root,
  "/nonexistent/design-data",
);
assert.match(unavailable.valueResolution?.error ?? "", /unavailable/);
assert.equal(
  assessColorsAndOpacities(unavailable, reference).concepts.find(
    (concept) => concept.id === "semantic",
  )?.verdict,
  "unassessable",
);
const report = compareDesignData(resolved, reference);
assert.match(reportMarkdown(report), /Colors and opacities/);
assert.match(colorOpacityMarkdown(evaluated), /App value \| Design data value/);
assert.equal(
  reportWithFreshness(report, "stale").colorOpacity?.exactPercent,
  null,
);
assert.ok(
  reportWithFreshness(report, "stale").colorOpacity?.concepts.every(
    (concept) => concept.verdict === "unassessable",
  ),
);

// Source names never determine color/opacity scope.
const canonical: AnalysisRecord[] = [];
for (const file of [
  "color-palette",
  "color-aliases",
  "semantic-color-palette",
  "icons",
]) {
  canonical.push(
    ...referenceRecords(
      `tokens/${file}.tokens.json`,
      JSON.parse(
        await readFile(
          new URL(
            `../../../packages/design-data/tokens/${file}.tokens.json`,
            import.meta.url,
          ),
          "utf8",
        ),
      ),
    ),
  );
}
const active = canonical.filter(
  (row) =>
    !row.lifecycle?.deprecatedIn &&
    ["color", "opacity"].includes(String(row.structuredName?.property)),
);
assert.ok(
  active.some(
    (row) =>
      row.structuredName?.property === "opacity" &&
      row.source.includes("color-aliases"),
  ),
);
assert.ok(active.some((row) => row.source.includes("icons") && row.reference));
const canonicalReport = assessColorsAndOpacities(
  input([]),
  input(canonical, "reference"),
);
assert.equal(canonicalReport.counts.sourceRows, active.length);
assert.equal(
  canonicalReport.counts.concepts,
  new Set(active.map((row) => row.conceptId ?? row.identity ?? row.id)).size,
);
assert.ok(
  defaultsAnalysisInput().records.some(
    (row) => row.structuredName?.property === "opacity",
  ),
);
if (process.env.COLOR_OPACITY_SDK_TESTS) {
  const declarations = [];
  for (const file of ["color-scheme", "contrast", "scale"])
    declarations.push(
      ...referenceRecords(
        `mode-sets/${file}.json`,
        JSON.parse(
          await readFile(
            new URL(
              `../../../packages/design-data/mode-sets/${file}.json`,
              import.meta.url,
            ),
            "utf8",
          ),
        ),
      ),
    );
  const fullInput = input([...canonical, ...declarations], "reference");
  fullInput.records = [...canonical, ...declarations];
  const fullReference = await resolveColorOpacityValues(fullInput, root);
  assert.equal(
    fullReference.valueResolution?.error,
    undefined,
    fullReference.valueResolution?.error,
  );
  const result = assessColorsAndOpacities(input([]), fullReference);
  assert.equal(result.counts.sourceRows, active.length);
  assert.equal(
    result.counts.rows,
    new Set(
      result.concepts.flatMap((concept) =>
        concept.rows.map(
          (row) => `${concept.id}:${JSON.stringify(row.context)}`,
        ),
      ),
    ).size,
    "One effective row per concept/context",
  );
  const aliasValues =
    fullReference.resolvedValues?.filter((row) => {
      const token = canonical.find((token) => token.id === row.id);
      return (
        token?.reference &&
        requiredValueContexts(token, fullInput).some(
          (context) => canonicalJson(context) === canonicalJson(row.context),
        )
      );
    }) ?? [];
  assert.ok(
    aliasValues.length > 593,
    "Mode expansion includes the full alias inventory",
  );
  assert.ok(
    aliasValues.every(
      (row) =>
        row.issue ||
        typeof row.value === "string" ||
        typeof row.value === "number",
    ),
  );
  console.log(
    `Canonical SDK inventory: ${result.counts.sourceRows} source rows, ${result.counts.concepts} concepts, ${result.counts.rows} effective modes; ${aliasValues.filter((row) => !row.issue).length}/${aliasValues.length} alias values resolved.`,
  );
  const defaultApp = defaultsAnalysisInput();
  const before = canonicalJson(defaultApp.records);
  defaultApp.source.hash = createHash("sha256").update(before).digest("hex");
  const fullApp = await resolveColorOpacityValues(
    defaultApp,
    root,
    undefined,
    fullReference,
  );
  assert.equal(
    fullApp.valueResolution?.error,
    undefined,
    fullApp.valueResolution?.error,
  );
  const baseline = assessColorsAndOpacities(fullApp, fullReference);
  assert.ok(
    baseline.concepts.some((concept) =>
      concept.rows.some((row) => row.verdict !== "unassessable"),
    ),
    `Wildcard/default-mode siblings must produce actionable comparisons: ${JSON.stringify(
      {
        rows: baseline.concepts
          .filter((concept) => concept.family === "gray")
          .slice(0, 2)
          .flatMap((concept) =>
            concept.rows.map((row) => ({
              context: row.context,
              app: row.app?.id,
              issues: row.issues,
            })),
          ),
        resolverIssues: fullApp.resolvedValues
          ?.filter((row) => row.issue)
          .slice(0, 2),
      },
    )}`,
  );
  assert.equal(baseline.counts.concepts, result.counts.concepts);
  assert.ok(
    baseline.enhancements.some((row) => row.context.contrast === "high"),
  );
  assert.ok(
    baseline.concepts
      .filter((concept) => concept.family === "gray")
      .every((concept) =>
        concept.rows
          .filter(
            (row) =>
              row.reference.source === "tokens/color-palette.tokens.json" &&
              row.reference.context?.contrast === undefined,
          )
          .every((row) => row.context.contrast !== "high"),
      ),
    "Unqualified canonical gray rows never acquire required High comparisons from the app.",
  );
  assert.ok(
    baseline.counts.rows >= result.counts.rows,
    "Required rows retain the reference inventory without expanding app-only variants",
  );
  assert.ok(
    baseline.concepts.every((concept) =>
      concept.rows.every((row) => row.referenceValue !== undefined),
    ),
  );
  assert.equal(
    canonicalJson(defaultApp.records),
    before,
    "Resolution and assessment do not mutate authored/generated data",
  );
  console.log(
    `Shipped baseline: Pass ${baseline.counts.pass}, Acceptable ${baseline.counts.acceptable}, Fail ${baseline.counts.fail}, Unable ${baseline.counts.unassessable}; ${baseline.counts.appOnlyRows} app-only rows.`,
  );
}
console.log(
  "Color/opacity scope, exact alpha, tolerance, mode aliases, ambiguity, freshness and reports pass.",
);
