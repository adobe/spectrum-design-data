// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  canonicalJson,
  compareDesignData,
  reportMarkdown,
  type AnalysisInput,
  type AnalysisRecord,
} from "../src/features/design-data/comparison";
import { defaultsAnalysisInput } from "../src/features/design-data/projection";
import { referenceRecords } from "../scripts/design-data-loader";
import { createStore } from "jotai";
import {
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
} from "../src/features/edit-session/state";
import { rulesAtom } from "../src/features/logic/library";
import {
  analysisAuthoringAtom,
  analysisSavedInputAtom,
  analysisWorkingInputAtom,
} from "../src/features/design-data/state";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  appRoot,
  protectReportOutputs,
  resolutionConformance,
} from "../scripts/design-data-loader";
import { reviewedColorMappings } from "../src/features/design-data/mappings";
import {
  browserModeContextAtom,
  browserTokensAtom,
  editBrowserTokensAtom,
  resetBrowserTokenAtom,
} from "../src/features/tokens/browserState";
import { spacingDocumentAtom } from "../src/features/spacing/state";
import { sizeDocumentAtom } from "../src/features/size/state";
import { colorSystemDocumentAtom } from "../src/features/color-system/state";
import { modeSetsAtom } from "../src/features/modes/state";
import { setPreviewParameterAtom } from "../src/features/modes/previewState";
import { editFoundationNameAtom } from "../src/features/taxonomy/sourceState";
import { componentsDocumentAtom } from "../src/features/components/documentState";

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
    version: "1",
    validator: "fixture",
  },
  records,
  categories: [...new Set(records.map((record) => record.category))],
  schemas: [],
  errors: [],
  limitations: [],
});

const contextApp: AnalysisRecord = {
  id: "context-app",
  category: "tokens",
  name: "Context fixture",
  source: "fixture",
  pointer: "/0",
  classification: "generated",
  value: 12,
  context: { colorScheme: "light", platform: "react" },
};
const contextReference: AnalysisRecord = {
  ...contextApp,
  id: "context-reference",
  context: { colorScheme: "dark", platform: "web" },
};
const contextMapping = [
  {
    app: contextApp.id,
    reference: contextReference.id,
    rationale: "Reviewed fixture identity; not context equivalence.",
  },
];
const contextReport = compareDesignData(
  input([contextApp]),
  input([contextReference], "reference"),
  contextMapping,
);
assert.equal(
  contextReport.findings.filter(
    (finding) => finding.classification === "mode-gap",
  ).length,
  1,
);
assert.equal(
  contextReport.findings.filter(
    (finding) => finding.classification === "platform-gap",
  ).length,
  1,
);
assert.equal(
  contextReport.findings.filter(
    (finding) => finding.classification === "unassessable",
  ).length,
  1,
);
assert.equal(
  contextReport.findings.some((finding) => finding.classification === "equal"),
  false,
);
assert.equal(contextReport.metrics[0].matched, 1);
assert.equal(contextReport.metrics[0].assessable, 0);
const identityContextReport = compareDesignData(
  input([{ ...contextApp, identity: "shared-context-row" }]),
  input([{ ...contextReference, identity: "shared-context-row" }], "reference"),
);
assert.equal(
  identityContextReport.metrics[0].matched,
  1,
  "A confirmed row identity exposes context differences instead of becoming unmatched",
);
assert.equal(
  identityContextReport.findings.filter(
    (finding) => finding.classification === "mode-gap",
  ).length,
  1,
);
assert.equal(
  identityContextReport.findings.find(
    (finding) => finding.classification === "platform-gap",
  )?.confidence,
  "exact-identity",
);
const missingDefaults = compareDesignData(
  input([{ ...contextApp, context: {} }]),
  input([{ ...contextReference, context: {} }], "reference"),
  [{ ...contextMapping[0], contextDefaults: ["colorScheme"] }],
);
assert.equal(missingDefaults.metrics[0].matched, 1);
assert.equal(
  missingDefaults.metrics[0].assessable,
  0,
  "Two omitted modes are not equivalent without declared defaults",
);
assert(
  missingDefaults.findings.some(
    (finding) =>
      finding.classification === "mode-gap" &&
      finding.message.includes("Missing declared default"),
  ),
);
assert.equal(
  compareDesignData(
    input([{ ...contextApp, context: {} }]),
    {
      ...input([{ ...contextReference, context: {} }], "reference"),
      errors: ["invalid declarations"],
    },
    [{ ...contextMapping[0], contextDefaults: ["colorScheme"] }],
  ).findings.some(
    (finding) =>
      finding.classification === "mode-gap" ||
      finding.classification === "platform-gap",
  ),
  false,
);
const undeclaredContext = compareDesignData(
  input([{ ...contextApp, context: {} }]),
  input([contextReference], "reference"),
  contextMapping,
);
assert.equal(
  undeclaredContext.findings.filter(
    (finding) =>
      finding.classification === "mode-gap" ||
      finding.classification === "platform-gap",
  ).length,
  2,
);
assert.equal(
  compareDesignData(
    input([{ ...contextApp, context: { colorScheme: ["light", "dark"] } }]),
    input(
      [{ ...contextReference, context: { colorScheme: ["dark", "light"] } }],
      "reference",
    ),
    contextMapping,
  ).metrics[0].assessable,
  0,
);
const invalidContextInput = {
  ...input([contextReference], "reference"),
  errors: ["invalid fixture"],
};
assert.equal(
  compareDesignData(
    input([contextApp]),
    invalidContextInput,
    contextMapping,
  ).findings.some(
    (finding) =>
      finding.classification === "mode-gap" ||
      finding.classification === "platform-gap",
  ),
  false,
);
const modeDeclaration: AnalysisRecord = {
  ...contextApp,
  id: "mode-declaration",
  category: "mode-sets",
  context: undefined,
  classification: "authored",
  value: { key: "colorScheme" },
};
const platformDeclaration = {
  ...modeDeclaration,
  id: "platform-declaration",
  category: "authoring/platforms",
  value: { id: "react" },
};
const declarationReport = compareDesignData(
  input([modeDeclaration, platformDeclaration]),
  input([], "reference"),
);
assert.deepEqual(
  declarationReport.findings.map((finding) => finding.classification).sort(),
  ["mode-gap", "platform-gap"],
);
assert.equal(
  compareDesignData(input([]), input([modeDeclaration], "reference"))
    .findings[0].classification,
  "mode-gap",
);
assert.equal(
  compareDesignData(input([modeDeclaration]), {
    ...input([], "reference"),
    errors: ["missing input"],
  }).findings[0].classification,
  "invalid-input",
);
assert.equal(
  compareDesignData(
    { ...input([modeDeclaration]), errors: ["invalid app"] },
    input([], "reference"),
  ).findings.some((finding) => finding.classification === "mode-gap"),
  false,
);
const platformVocabulary = referenceRecords("registry/custom-platforms.json", {
  type: "platform",
  values: [{ id: "web", label: "Web" }],
});
const platformInventory = compareDesignData(
  input([platformDeclaration]),
  input(platformVocabulary, "reference"),
);
assert.equal(
  platformInventory.findings.filter(
    (finding) => finding.classification === "platform-gap",
  ).length,
  2,
  "Platform vocabulary gaps retain both inventory directions without guessing aliases",
);
assert.equal(
  platformInventory.metrics.find(
    (metric) => metric.category === "authoring/platforms",
  )?.app,
  1,
);
assert.equal(
  platformInventory.metrics.find((metric) => metric.category === "registry")
    ?.reference,
  1,
);
const appModes: AnalysisRecord = {
  ...modeDeclaration,
  value: {
    key: "colorScheme",
    defaultModeId: "light-id",
    modes: [{ id: "light-id", key: "light" }],
  },
};
const referenceModes: AnalysisRecord = {
  ...modeDeclaration,
  id: "reference-mode-declaration",
  source: "mode-sets/color-scheme.json",
  value: { name: "colorScheme", default: "dark", modes: ["light", "dark"] },
};
const modePairs = [
  {
    app: appModes.id,
    reference: referenceModes.id,
    rationale:
      "Reviewed fixture declaration pair; not equivalent defaults or coverage.",
  },
];
const modeVocabulary = compareDesignData(
  input([appModes]),
  input([referenceModes], "reference"),
  modePairs,
);
assert.equal(
  modeVocabulary.findings.filter(
    (finding) => finding.classification === "mode-gap",
  ).length,
  2,
  "Mapped declarations distinguish vocabulary and declared-default differences",
);
assert.equal(modeVocabulary.metrics[0].matched, 1);
assert.equal(
  compareDesignData(
    input([appModes]),
    { ...input([referenceModes], "reference"), errors: ["invalid modes"] },
    modePairs,
  ).findings.some((finding) => finding.classification === "mode-gap"),
  false,
);
const brokenMapping = [
  { ...contextMapping[0], reference: "absent-context-target" },
];
assert.equal(
  compareDesignData(
    input([{ ...contextApp, identity: "shared" }]),
    input([{ ...contextReference, identity: "shared" }], "reference"),
    brokenMapping,
  ).findings.some(
    (finding) =>
      finding.classification === "mode-gap" ||
      finding.classification === "platform-gap",
  ),
  false,
  "Invalid required mapping input suppresses speculative gap diagnostics",
);
const record = (
  id: string,
  value: unknown,
  extra: Partial<AnalysisRecord> = {},
): AnalysisRecord => ({
  id,
  category: "tokens",
  name: id,
  source: "fixture.json",
  pointer: "/0",
  classification: "generated",
  value,
  ...extra,
});
const rampApp = input([
  record("ramp-app", "#ff0000", {
    structuredName: {
      property: "color",
      colorName: "red",
      contrastValue: "100",
    },
    context: { colorScheme: "light", contrast: "regular" },
  }),
]);
const rampReference = input(
  [
    record("ramp-reference", "#ff0000", {
      classification: "authored",
      source: "tokens/color-palette.tokens.json",
      structuredName: {
        property: "color",
        colorFamily: "red",
        scaleIndex: 100,
      },
      context: { colorScheme: "light", contrast: "regular" },
    }),
  ],
  "reference",
);
assert.equal(reviewedColorMappings(rampApp, rampReference).length, 1);
assert.equal(
  compareDesignData(rampApp, rampReference).findings[0].confidence,
  "reviewed-mapping",
);
assert.equal(
  compareDesignData(rampApp, rampReference).findings[0].classification,
  "equal",
);
assert.equal(
  reviewedColorMappings(
    rampApp,
    input(
      [
        {
          ...rampReference.records[0],
          context: { colorScheme: "dark", contrast: "regular" },
        },
      ],
      "reference",
    ),
  ).length,
  0,
);
assert.equal(
  reviewedColorMappings(
    rampApp,
    input(
      [
        {
          ...rampReference.records[0],
          structuredName: {
            ...rampReference.records[0].structuredName,
            component: "button",
          },
        },
      ],
      "reference",
    ),
  ).length,
  0,
);
assert.equal(
  reviewedColorMappings(
    rampApp,
    input(
      [
        {
          ...rampReference.records[0],
          context: { colorScheme: ["light", "dark"], contrast: "regular" },
        },
      ],
      "reference",
    ),
  ).length,
  0,
);
assert.equal(
  reviewedColorMappings(
    rampApp,
    input(
      [
        {
          ...rampReference.records[0],
          source: "tokens/semantic-color-palette.tokens.json",
        },
      ],
      "reference",
    ),
  ).length,
  0,
);
const omittedAppMode = {
  ...rampApp.records[0],
  context: { contrast: "regular" },
};
assert.equal(
  reviewedColorMappings(input([omittedAppMode]), rampReference).length,
  0,
);
const declaredAppDefault = record(
  "app-mode",
  {
    key: "colorScheme",
    defaultModeId: "light-id",
    modes: [{ id: "light-id", key: "light" }],
  },
  { category: "mode-sets" },
);
assert.equal(
  reviewedColorMappings(
    input([omittedAppMode, declaredAppDefault]),
    rampReference,
  ).length,
  1,
);
assert.equal(
  compareDesignData(
    input([omittedAppMode, declaredAppDefault]),
    rampReference,
  ).findings.some(
    (finding) =>
      finding.classification === "equal" &&
      finding.app?.id === omittedAppMode.id,
  ),
  true,
);
assert.equal(
  compareDesignData(
    input([omittedAppMode, declaredAppDefault]),
    rampReference,
  ).findings.some(
    (finding) =>
      finding.classification === "mode-gap" &&
      finding.app?.id === omittedAppMode.id,
  ),
  false,
);
const declaredReferenceDefault = record(
  "reference-mode",
  { name: "colorScheme", default: "light", modes: ["light", "dark"] },
  { category: "mode-sets" },
);
assert.equal(
  reviewedColorMappings(
    input([omittedAppMode, declaredAppDefault]),
    input(
      [
        { ...rampReference.records[0], context: { contrast: "regular" } },
        declaredReferenceDefault,
      ],
      "reference",
    ),
  ).length,
  1,
);
assert.equal(
  compareDesignData(
    rampApp,
    input(
      [
        rampReference.records[0],
        { ...rampReference.records[0], id: "duplicate-ramp" },
      ],
      "reference",
    ),
  ).findings.filter((finding) => finding.classification === "ambiguous").length,
  1,
);
const compositeApp = input([
  record(
    "composite-app",
    { width: 1, color: "#ff0000" },
    { identity: "composite" },
  ),
]);
const compositeReference = input(
  [
    record(
      "composite-reference",
      { width: "1px", color: "#ff0000" },
      { identity: "composite" },
    ),
  ],
  "reference",
);
assert.equal(
  compareDesignData(compositeApp, compositeReference).findings[0]
    .classification,
  "structure-difference",
);
assert.equal(
  compareDesignData(compositeApp, compositeReference).metrics[0].assessable,
  0,
);
assert.equal(
  compareDesignData(compositeApp, compositeReference).metrics[0].excluded,
  1,
);
assert.equal(
  compareDesignData(
    compositeApp,
    input(
      [
        record(
          "composite-reference",
          { color: "#ff0000", width: 1 },
          { identity: "composite" },
        ),
      ],
      "reference",
    ),
  ).findings[0].classification,
  "equal",
);
assert.equal(
  compareDesignData(
    compositeApp,
    input(
      [
        record(
          "composite-reference",
          { width: 2, color: "#ff0000" },
          { identity: "composite" },
        ),
      ],
      "reference",
    ),
  ).findings[0].classification,
  "value-difference",
);
const app = input([
  record("a", "#ff0000", { identity: "same", conceptId: "concept-a" }),
  record("b", 12, { unit: "px" }),
]);
const reference = input(
  [
    record("c", "rgb(255 0 0)", { identity: "same", conceptId: "concept-c" }),
    record("d", 12.0000001, { unit: "px" }),
    record("e", 42),
  ],
  "reference",
);
const mapping = [
  { app: "b", reference: "d", rationale: "Fixture reviewed dimensions." },
];
const report = compareDesignData(app, reference, mapping);
assert.equal(report.valid, true);
assert.equal(
  report.findings.filter((finding) => finding.classification === "equal")
    .length,
  2,
);
assert.equal(
  report.findings.filter(
    (finding) => finding.classification === "reference-only",
  ).length,
  1,
);
assert.equal(report.concepts.appRows, 2);
assert.equal(
  reportMarkdown(report).includes("Differences are informational"),
  true,
);
const provenanceReport = {
  ...report,
  mappingVersion: "reviewed|fixture",
  generationContext: "Saved values\nwithout previews",
  inputs: {
    app: {
      ...report.inputs.app,
      root: "app|root",
      hash: "app-sha256",
      version: "authoring-v1",
      validator: "app-validator",
      dirty: null,
    },
    reference: {
      ...report.inputs.reference,
      hash: "reference-sha256",
      version: "data-v3; spec-v4",
      validator: "sdk|fixture",
      dirty: true,
    },
  },
};
const provenanceMarkdown = reportMarkdown(provenanceReport);
for (const evidence of [
  "Report schema version: 1",
  "reviewed\\|fixture",
  "app\\|root",
  "app-sha256",
  "reference-sha256",
  "authoring-v1",
  "data-v3; spec-v4",
  "app-validator",
  "sdk\\|fixture",
  "unknown",
  "dirty",
  "Saved values without previews",
  "exact-identity",
  "reviewed-mapping",
  "fixture.json/0",
]) {
  assert(
    provenanceMarkdown.includes(evidence),
    `Markdown retains escaped provenance: ${evidence}`,
  );
}
assert.equal(
  canonicalJson(report),
  canonicalJson(
    compareDesignData(
      input([...app.records].reverse()),
      input([...reference.records].reverse(), "reference"),
      mapping,
    ),
  ),
);
assert.equal(
  compareDesignData(
    input([record("a", 1)]),
    input([record("b", 2)], "reference"),
  ).findings.some((finding) => finding.classification === "app-only"),
  true,
);
assert.equal(
  compareDesignData(
    input([record("a", 1, { identity: "same" })]),
    input([record("b", 2, { identity: "same" })], "reference"),
  ).findings[0].classification,
  "value-difference",
);
for (const extra of [{ reference: "target" }, { unit: "rem" }]) {
  const result = compareDesignData(
    input([record("a", 1, { identity: "same", unit: "px" })]),
    input(
      [record("b", 1, { identity: "same", unit: "px", ...extra })],
      "reference",
    ),
  );
  assert.equal(result.findings[0].classification, "unassessable");
}
const ambiguous = compareDesignData(
  app,
  input(
    [
      record("c", 1, { identity: "same" }),
      record("d", 1, { identity: "same" }),
    ],
    "reference",
  ),
);
assert.equal(
  ambiguous.findings.some((finding) => finding.classification === "ambiguous"),
  true,
);
const invalid = input([], "reference");
invalid.errors.push("unreadable required source");
assert.equal(compareDesignData(app, invalid).valid, false);
assert.equal(
  compareDesignData(app, invalid).findings.some(
    (finding) => finding.classification === "app-only",
  ),
  false,
);
const authoredRule = record(
  "rule",
  { id: "rule", name: "Authored rule" },
  { category: "authoring/rules", classification: "authored" },
);
const extensionReport = compareDesignData(
  input([authoredRule]),
  input([], "reference"),
);
assert.equal(extensionReport.findings[0].classification, "extension");
assert.equal(extensionReport.findings[0].severity, "info");
assert.deepEqual(extensionReport.findings[0].app?.value, authoredRule.value);
assert.equal(extensionReport.metrics[0].excluded, 1);
assert.equal(extensionReport.metrics[0].assessable, 0);
assert.equal(
  compareDesignData(input([authoredRule]), invalid).findings.some(
    (finding) => finding.classification === "extension",
  ),
  true,
);
const namedApp = input([
  record("named-app", 12, {
    identity: "named",
    structuredName: {
      property: "dimension",
      scaleIndex: "100",
      localField: "custom",
    },
  }),
]);
const namedReference = input(
  [
    record("named-reference", 12, {
      identity: "named",
      structuredName: {
        property: "dimension",
        scaleIndex: 100,
        referenceField: "custom",
      },
    }),
  ],
  "reference",
);
const nameReport = compareDesignData(namedApp, namedReference);
assert.equal(
  nameReport.findings.filter(
    (finding) => finding.classification === "field-gap",
  ).length,
  2,
);
assert.equal(
  nameReport.findings.filter((finding) => finding.classification === "type-gap")
    .length,
  1,
);
assert.equal(nameReport.metrics[0].matched, 1);
assert.equal(nameReport.metrics[0].assessable, 1);
assert.equal(
  nameReport.findings.find((finding) => finding.classification === "field-gap")
    ?.severity,
  "info",
);
assert.equal(
  compareDesignData(rampApp, rampReference).findings.some(
    (finding) =>
      finding.classification === "field-gap" ||
      finding.classification === "type-gap",
  ),
  false,
);
const invalidNamedReference = {
  ...namedReference,
  errors: ["Invalid required input"],
};
assert.equal(
  compareDesignData(namedApp, invalidNamedReference).findings.some(
    (finding) =>
      finding.classification === "field-gap" ||
      finding.classification === "type-gap",
  ),
  false,
);
assert.equal(
  canonicalJson(compareDesignData(namedApp, namedReference)),
  canonicalJson(
    compareDesignData(
      namedApp,
      input(
        [
          {
            ...namedReference.records[0],
            structuredName: {
              referenceField: "custom",
              scaleIndex: 100,
              property: "dimension",
            },
          },
        ],
        "reference",
      ),
    ),
  ),
);
assert.equal(
  compareDesignData(
    input([{ ...authoredRule, category: "authoring/platforms" }]),
    input([], "reference"),
  ).findings[0].classification,
  "platform-gap",
);
assert.equal(
  compareDesignData(
    input([]),
    input(
      [record("new", {}, { category: "new-schema-category" })],
      "reference",
    ),
  ).metrics[0].category,
  "new-schema-category",
);
assert.notEqual(canonicalJson([1, 2]), canonicalJson([2, 1]));
const defaults = defaultsAnalysisInput();
assert.deepEqual(defaults.errors, []);
assert(
  defaults.records.some(
    (row) => row.category === "tokens" && row.context?.colorScheme === "dark",
  ),
);
assert(defaults.records.some((row) => row.category === "authoring/scaleTypes"));
assert.equal(canonicalJson(defaults), canonicalJson(defaultsAnalysisInput()));
for (const domain of ["typography", "spacing", "size"] as const) {
  const editsStore = createStore();
  editsStore.set(enterEditModeAtom);
  const original = editsStore
    .get(browserTokensAtom)
    .find((token) => token.type === domain)!;
  const mode = editsStore.get(browserModeContextAtom);
  const before = editsStore
    .get(analysisWorkingInputAtom)
    .records.find((row) => row.id.startsWith(`tokens:${original.id}:`))!;
  const name = `analysis-${domain}-override`;
  const override = 777;
  assert.throws(
    () =>
      editsStore.set(editBrowserTokensAtom, {
        ids: [original.id],
        modeKey: mode.key,
        patch: { name },
      }),
    /registered category/,
  );
  assert.throws(
    () =>
      editsStore.set(editBrowserTokensAtom, {
        ids: [original.id],
        modeKey: mode.key,
        patch: {
          classification: {
            "0bb57816-c2eb-4d6c-bfb1-ac5d7520e88a": `term-property-${domain}`,
          },
        },
      }),
    /governed/,
  );
  editsStore.set(editFoundationNameAtom, {
    id: original.taxonomySource!.id,
    value: name,
  });
  editsStore.set(editBrowserTokensAtom, {
    ids: [original.id],
    modeKey: mode.key,
    patch: { value: override },
  });
  const working = editsStore.get(analysisWorkingInputAtom);
  assert.deepEqual(working.errors, []);
  const renamed = editsStore
    .get(browserTokensAtom)
    .find((row) => row.id === original.id)!;
  const rows = working.records.filter((row) =>
    row.id.startsWith(`tokens:${original.id}:`),
  );
  assert.equal(
    rows.length,
    12,
    `${domain}: mode-row denominator is unchanged by a token edit`,
  );
  assert(
    rows.every((row) => row.name === renamed.name),
    `${domain}: Analysis shares the canonical classification across modes`,
  );
  if (domain === "typography")
    assert(
      renamed.name.startsWith(name),
      "Assigned source terms rename canonical outputs.",
    );
  else
    assert.equal(
      renamed.name,
      original.name,
      "Omitted Global source labels do not add canonical segments.",
    );
  assert.equal(
    rows.filter((row) => row.value === override).length,
    1,
    `${domain}: value overrides apply only to the exact mode combination`,
  );
  assert(
    rows.every(
      (row) =>
        canonicalJson(row.taxonomy?.classification) ===
        canonicalJson(original.projection?.classification),
    ),
    "Renames preserve flat registered reference identity.",
  );
  assert.equal(
    rows.filter((row) => row.overrides?.generatedValue !== undefined).length,
    1,
    `${domain}: manual value origin is explicit and remains mode scoped`,
  );
  assert.equal(
    rows.find((row) => row.value === override)?.overrides?.generatedValue,
    original.generatedValue,
  );
  assert.equal(
    rows[0].id,
    before.id,
    `${domain}: renaming an effective token retains its report row identity`,
  );
  assert.equal(rows[0].conceptId, before.conceptId);
  assert.equal(
    editsStore
      .get(analysisSavedInputAtom)
      .records.some((row) => row.name.startsWith(name)),
    false,
  );
  editsStore.set(saveEditAtom);
  assert.equal(
    canonicalJson(editsStore.get(analysisSavedInputAtom).records),
    canonicalJson(editsStore.get(analysisWorkingInputAtom).records),
  );
  editsStore.set(resetBrowserTokenAtom, original.id);
  assert.equal(
    editsStore
      .get(analysisWorkingInputAtom)
      .records.some(
        (row) =>
          row.id.startsWith(`tokens:${original.id}:`) && row.value === override,
      ),
    false,
  );
  editsStore.set(cancelEditAtom);
  assert.equal(
    editsStore
      .get(analysisWorkingInputAtom)
      .records.some(
        (row) => row.name === renamed.name && row.value === override,
      ),
    true,
    `${domain}: Cancel restores the saved override`,
  );
  assert.equal(canonicalJson(defaultsAnalysisInput()), canonicalJson(defaults));
}
for (const documentAtom of [spacingDocumentAtom, sizeDocumentAtom]) {
  const parityStore = createStore();
  parityStore.set(componentsDocumentAtom, { schemaVersion: 2, components: [] });
  parityStore.set(enterEditModeAtom);
  const domain = documentAtom === spacingDocumentAtom ? "spacing" : "size";
  const document = structuredClone(parityStore.get(documentAtom));
  document.pendingRules = [
    {
      id: "pending-analysis-rounding",
      name: "Pending rounding",
      description: "",
      type: "rounding",
      depth: 1,
      defaultOutcome: { factor: 10 },
      conditions: [],
    },
  ];
  document.scales[0].roundingRuleId = document.pendingRules[0].id;
  document.scales[0].bindings = {
    base: {
      modeParameterId: "color.contrastMultiplier",
      method: "linear",
      points: [
        { at: 0, value: 4 },
        { at: 3, value: 30 },
      ],
    },
  };
  parityStore.set(documentAtom, document);
  parityStore.set(
    modeSetsAtom,
    parityStore.get(modeSetsAtom).map((set) => ({
      ...set,
      authoringCapabilities: set.authoringCapabilities?.filter(
        (capability) => capability !== "color.contrastMultiplier",
      ),
    })),
  );
  const color = parityStore.get(colorSystemDocumentAtom);
  parityStore.set(colorSystemDocumentAtom, {
    ...color,
    settings: { ...color.settings, contrastMultiplier: 2 },
  });
  const projected = parityStore.get(analysisWorkingInputAtom);
  assert.deepEqual(projected.errors, []);
  for (const token of parityStore
    .get(browserTokensAtom)
    .filter((row) => row.type === domain)) {
    const row = projected.records.find(
      (row) =>
        row.id.startsWith(`tokens:${token.id}:`) &&
        row.context?.colorScheme === "light" &&
        row.context?.contrast === "regular" &&
        row.context?.textScaling === "default",
    );
    assert.equal(
      row?.value,
      token.value,
      `${domain}: pending rules and unowned base bindings agree with Tokens`,
    );
  }
  const savedProjection = canonicalJson(projected.records);
  const savedProvenance = canonicalJson(projected.outputMetadata);
  parityStore.set(setPreviewParameterAtom, {
    parameterId: "color.contrastMultiplier",
    value: 3,
  });
  assert.equal(
    canonicalJson(parityStore.get(analysisWorkingInputAtom).records),
    savedProjection,
    "Temporary preview values are excluded from Analysis",
  );
  assert.equal(
    canonicalJson(parityStore.get(analysisWorkingInputAtom).outputMetadata),
    savedProvenance,
    "Temporary previews do not create assignments or alter provenance",
  );
}
const referenceRows = referenceRecords("tokens/new.tokens.json", [
  {
    uuid: "row",
    conceptId: "concept",
    name: { colorScheme: "dark" },
    $ref: "alias",
  },
]);
assert.equal(referenceRows[0].reference, "alias");
assert.equal(referenceRows[0].context?.colorScheme, "dark");
assert.equal(referenceRows[0].pointer, "/0");
assert.deepEqual(
  referenceRecords(
    "tokens/custom.json",
    [{ uuid: "custom", name: { customMode: ["one", "two"] }, value: 1 }],
    ["customMode"],
  )[0].context,
  { customMode: ["one", "two"] },
);
assert.equal(
  referenceRecords("new-category/data.json", { id: "new", name: "New" })[0]
    .category,
  "new-category",
);
assert.deepEqual(
  referenceRecords("registry/sizes.json", {
    values: [{ id: "small" }, { id: "large" }],
  }).map((row) => row.identity),
  ["small", "large"],
);
const fanIn = input([
  record("one", 1, { identity: "shared" }),
  record("two", 2, { identity: "shared" }),
]);
const fanReference = input(
  [record("shared", 1, { identity: "shared" })],
  "reference",
);
assert.equal(
  canonicalJson(compareDesignData(fanIn, fanReference)),
  canonicalJson(
    compareDesignData(input([...fanIn.records].reverse()), fanReference),
  ),
);
assert.equal(
  compareDesignData(fanIn, fanReference).findings.filter(
    (finding) => finding.classification === "ambiguous",
  ).length,
  2,
);
const store = createStore();
const shippedBefore = canonicalJson(defaultsAnalysisInput());
store.set(enterEditModeAtom);
const baseline = canonicalJson(store.get(analysisSavedInputAtom).records);
store.set(
  rulesAtom,
  store
    .get(rulesAtom)
    .map((rule, index) =>
      index === 0 ? { ...rule, name: "Working fixture" } : rule,
    ),
);
assert.equal(store.get(analysisAuthoringAtom).unsaved, true);
assert.equal(
  canonicalJson(store.get(analysisSavedInputAtom).records),
  baseline,
);
assert.notEqual(
  canonicalJson(store.get(analysisWorkingInputAtom).records),
  baseline,
);
assert.equal(canonicalJson(defaultsAnalysisInput()), shippedBefore);
store.set(saveEditAtom);
assert.equal(store.get(analysisAuthoringAtom).unsaved, false);
assert.equal(
  canonicalJson(store.get(analysisSavedInputAtom).records),
  canonicalJson(store.get(analysisWorkingInputAtom).records),
);
store.set(
  rulesAtom,
  store
    .get(rulesAtom)
    .map((rule, index) =>
      index === 0 ? { ...rule, name: "Cancelled fixture" } : rule,
    ),
);
store.set(cancelEditAtom);
assert.equal(store.get(analysisAuthoringAtom).unsaved, false);
assert.equal(store.get(rulesAtom)[0].name, "Working fixture");
assert.equal(canonicalJson(defaultsAnalysisInput()), shippedBefore);
store.set(rulesAtom, []);
assert(store.get(analysisWorkingInputAtom).errors.length > 0);
assert.equal(canonicalJson(defaultsAnalysisInput()), shippedBefore);
assert.equal(
  compareDesignData(app, reference, [
    { app: "missing", reference: "missing", rationale: "Bad fixture mapping" },
  ]).valid,
  false,
);
const directory = await mkdtemp(join(tmpdir(), "design-data-analysis-"));
try {
  const root = join(directory, "checkout");
  await mkdir(join(root, "packages/design-data/tokens"), { recursive: true });
  await mkdir(join(root, "packages/design-data-spec/schemas"), {
    recursive: true,
  });
  await writeFile(
    join(root, "packages/design-data/package.json"),
    JSON.stringify({ version: "fixture" }),
  );
  await writeFile(
    join(root, "packages/design-data-spec/package.json"),
    JSON.stringify({ version: "fixture" }),
  );
  const tokensPath = join(root, "packages/design-data/tokens/fixture.json");
  const tokenText = JSON.stringify([
    {
      uuid: "fixture-uuid",
      name: { property: "dimension" },
      value: { value: 12, unit: "px" },
    },
  ]);
  await writeFile(tokensPath, tokenText);
  const sdk = join(directory, "sdk");
  await writeFile(
    sdk,
    '#!/usr/bin/env node\nif(process.argv.includes("--version"))console.log("fixture SDK");else console.log(JSON.stringify({valid:true,errors:[],warnings:[]}));\n',
    { mode: 0o700 },
  );
  const productFixture = join(
    root,
    "packages/design-data-spec/conformance/resolution/product-layer-wins",
  );
  await mkdir(productFixture, { recursive: true });
  await writeFile(
    join(productFixture, "query.json"),
    JSON.stringify({ property: "fixture", context: {} }),
  );
  await writeFile(
    join(productFixture, "expected.json"),
    JSON.stringify({ resolved: true, expected_value: "product" }),
  );
  await writeFile(
    join(productFixture, "product-context.json"),
    JSON.stringify({ layer: "product", overrides: [] }),
  );
  const conformance = await resolutionConformance(root, sdk);
  assert.equal(conformance.resolvedValueComparison, "disabled");
  assert.equal(conformance.checks[0].status, "unsupported");
  assert.match(conformance.fixtureHash, /^[a-f0-9]{64}$/);
  assert.match(
    reportMarkdown(
      compareDesignData(input([]), {
        ...input([], "reference"),
        source: {
          ...input([], "reference").source,
          resolutionConformance: conformance,
        },
      }),
    ),
    /unsupported.*product-layer-wins/,
  );
  const json = join(directory, "report.json");
  const markdown = join(directory, "report.md");
  const args = [
    "--import",
    "tsx",
    join(appRoot, "scripts/analyze-design-data.ts"),
    "--design-data-path",
    root,
    "--sdk",
    sdk,
    "--json",
    json,
    "--markdown",
    markdown,
  ];
  const run = () =>
    spawnSync(process.execPath, args, { cwd: appRoot, encoding: "utf8" });
  assert.equal(
    run().status,
    0,
    "Valid comparisons containing differences must succeed.",
  );
  const firstReport = await readFile(json, "utf8");
  assert.equal(JSON.parse(firstReport).valid, true);
  assert.equal(JSON.parse(firstReport).schemaVersion, 1);
  assert.equal(JSON.parse(firstReport).architecture.schemaVersion, 1);
  assert.equal(
    JSON.parse(firstReport).architecture.findings.length,
    16,
    "Curated architectural findings survive an output fixture with no reviewed matches",
  );
  assert.equal(
    JSON.parse(firstReport).architecture.profiles.find(
      (profile: { id: string }) => profile.id === "draft-pr1454",
    ).status,
    "unavailable",
  );
  assert.equal(run().status, 0);
  assert.equal(await readFile(json, "utf8"), firstReport);
  assert.equal(await readFile(tokensPath, "utf8"), tokenText);
  const mappingPath = join(directory, "mapping.json");
  const mappingPair = {
    app: defaults.records.find((row) => row.category === "tokens")!.id,
    reference: "tokens/fixture.json#fixture-uuid",
    rationale: "Reviewed test fixture identity, not equivalent context.",
  };
  args.push("--mapping", mappingPath);
  for (const malformed of [
    { contextDefaults: 42 },
    { contextDefaults: ["colorScheme", null] },
    { contextDefaults: [""] },
    { nameFields: null },
    { nameFields: { local: null } },
    { nameFields: { local: { reference: 42 } } },
    { nameFields: { local: { reference: "", normalization: "integer" } } },
    { nameFields: { local: { reference: "target", normalization: "float" } } },
    { rationale: " " },
    { app: "" },
    { reference: "" },
  ]) {
    await writeFile(
      mappingPath,
      JSON.stringify([{ ...mappingPair, ...malformed }]),
    );
    await rm(json);
    await rm(markdown);
    assert.equal(
      run().status,
      1,
      "Malformed mapping inputs fail without crashing report generation",
    );
    const partial = JSON.parse(await readFile(json, "utf8"));
    assert.equal(partial.valid, false);
    assert(
      partial.findings.some(
        (finding: { classification: string; message: string }) =>
          finding.classification === "invalid-input" &&
          finding.message.includes("Mapping input:"),
      ),
    );
    assert.match(await readFile(markdown, "utf8"), /Mapping input:/);
    assert.equal(await readFile(tokensPath, "utf8"), tokenText);
  }
  await writeFile(
    mappingPath,
    JSON.stringify([
      {
        ...mappingPair,
        nameFields: {
          local: { reference: "target", normalization: "integer" },
        },
        contextDefaults: ["colorScheme"],
      },
    ]),
  );
  assert.equal(
    run().status,
    0,
    "Valid optional mapping fields remain supported",
  );
  await writeFile(
    mappingPath,
    JSON.stringify([{ ...mappingPair, contextDefaults: ["undeclaredAxis"] }]),
  );
  assert.equal(
    run().status,
    0,
    "Valid inputs with unassessable declared-default context remain informational",
  );
  const missingContextReport = JSON.parse(await readFile(json, "utf8"));
  assert(
    missingContextReport.findings.some(
      (finding: { classification: string; message: string }) =>
        finding.classification === "mode-gap" &&
        finding.message.includes("Missing declared default"),
    ),
  );
  assert.equal(
    missingContextReport.metrics.find(
      (metric: { category: string }) => metric.category === "tokens",
    ).matched,
    1,
  );
  assert.equal(
    missingContextReport.metrics.find(
      (metric: { category: string }) => metric.category === "tokens",
    ).assessable,
    0,
  );
  args.splice(-2);
  args[args.indexOf(root)] = join(directory, "missing");
  assert.equal(
    run().status,
    1,
    "Missing required checkout must fail but write partial reports.",
  );
  assert.equal(JSON.parse(await readFile(json, "utf8")).valid, false);
  assert.equal(
    JSON.parse(await readFile(json, "utf8")).architecture.findings.length,
    16,
    "A required input failure retains independent architectural evidence",
  );
  assert(
    JSON.parse(await readFile(json, "utf8")).architecture.requiredInputFailures
      .length > 0,
  );
  await symlink(root, join(directory, "reference-link"));
  await assert.rejects(
    protectReportOutputs(
      [join(directory, "reference-link/report.json"), markdown],
      root,
    ),
    /cannot overwrite/,
  );
  await assert.rejects(
    protectReportOutputs(
      [join(appRoot, "src/data/design-system.defaults.json"), markdown],
      root,
    ),
    /cannot overwrite/,
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
console.log("Design-data comparison fixtures passed.");
