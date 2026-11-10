// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { jsonFiles, referenceRecords } from "../scripts/design-data-loader";
import {
  assessColorsAndOpacities,
  resolutionRequests,
} from "../src/features/design-data/colorOpacityAssessment";
import {
  compareDesignData,
  canonicalJson,
  reportMarkdown,
  reportWithFreshness,
  type AnalysisInput,
  type AnalysisRecord,
} from "../src/features/design-data/comparison";
import { defaultsAnalysisInput } from "../src/features/design-data/projection";
import {
  fontSizeStep,
  foundationValueType,
} from "../src/features/design-data/foundationValues";
import { reviewedTypographyMappings } from "../src/features/design-data/mappings";
import {
  isInventoryToken,
  buildTokenInventory,
  tokenInventoryMarkdown,
  unavailableTokenReference,
} from "../src/features/design-data/tokenInventory";
import {
  comparisonModeSets,
  inventoryComparisonRows,
  tokenComparisonRows,
} from "../src/views/analysis/tokenComparisonPresentation";
import { comparisonValuePreview } from "../src/views/analysis/tokenComparisonPreview";
import { referenceOverrideIndex } from "../src/features/design-data/referenceOverrides";

const source: AnalysisInput["source"] = {
  kind: "reference",
  hash: "fixture",
  root: "fixture",
  revision: "fixture",
  version: "fixture",
  dirty: false,
  validator: "fixture",
};
const input = (
  records: AnalysisRecord[],
  kind: "reference" | "working" = "reference",
): AnalysisInput => ({
  source: { ...source, kind },
  records,
  inventoryStatus: "complete",
  categories: [...new Set(records.map((row) => row.category))],
  schemas: [],
  errors: [],
  limitations: [],
});
const record = (
  id: string,
  extra: Partial<AnalysisRecord> = {},
): AnalysisRecord => ({
  id,
  identity: id,
  name: "same-display-name",
  category: "tokens",
  classification: "authored",
  source: "fixture",
  pointer: `/${id}`,
  structuredName: { property: "future-property" },
  value: 1,
  ...extra,
});
const membership = (
  assessment: ReturnType<typeof assessColorsAndOpacities>,
  side: "app" | "reference",
) =>
  assessment
    .inventory!.entries.filter((entry) => entry.side === side)
    .map((entry) => entry.record.id)
    .sort();

const serializedInput = input(
  [
    record("shadow", {
      context: { textScaling: "largest", colorScheme: "dark" },
      value: [
        { y: "4px", x: "0px", color: "rgba(0, 0, 0, 0.2)" },
        { y: "8px", x: "1px", color: "rgba(0, 0, 0, 0.1)" },
      ],
    }),
    record("alpha"),
    record("shadow", { value: 2 }),
  ],
  "working",
);
const inventoryFor = (records: AnalysisRecord[]) =>
  buildTokenInventory({ ...serializedInput, records }, input([]), [], (row) => [
    {
      context: Object.fromEntries(
        Object.entries(row.context ?? {}).map(([axis, mode]) => {
          assert.ok(
            typeof mode === "string",
            "The fixture uses singular modes.",
          );
          return [axis, mode];
        }),
      ),
      value: row.value,
      issue: null,
    },
  ]);
const serializedInventory = inventoryFor(serializedInput.records);
assert.deepEqual(
  inventoryFor([...serializedInput.records].reverse()),
  serializedInventory,
  "Inventory ordering and duplicate occurrence IDs do not depend on input order.",
);
assert.equal(
  new Set(serializedInventory.entries.map((entry) => entry.id)).size,
  serializedInventory.entries.length,
);
assert.deepEqual(serializedInventory.issues, [
  "app: duplicate token record ID shadow.",
]);
assert.equal(
  inventoryFor([record("a-new-row"), ...serializedInput.records]).entries.find(
    (entry) => entry.record.id === "alpha",
  )!.id,
  serializedInventory.entries.find((entry) => entry.record.id === "alpha")!.id,
  "Adding another record does not renumber an existing inventory identity.",
);
assert.equal(
  tokenInventoryMarkdown(serializedInventory),
  tokenInventoryMarkdown(JSON.parse(canonicalJson(serializedInventory))),
  "Nested shadow values and contexts render identically after JSON key ordering.",
);
assert.deepEqual(serializedInput.records[0].value, [
  { y: "4px", x: "0px", color: "rgba(0, 0, 0, 0.2)" },
  { y: "8px", x: "1px", color: "rgba(0, 0, 0, 0.1)" },
]);

const unknown = record("unknown", {
  schema: "https://example.test/future.json",
});
const deprecated = record("deprecated", {
  lifecycle: { deprecatedIn: "1.0.0" },
  structuredName: { property: "font-size", scaleIndex: 100 },
  unit: "px",
});
const alias = record("alias", {
  category: "compatibility-aliases",
  value: undefined,
  reference: "absent",
});
const active = record("active", {
  structuredName: { property: "spacing" },
  unit: "px",
});
const app = input([record("app-only"), alias, deprecated], "working");
const reference = input([
  unknown,
  active,
  deprecated,
  record("same-name-other-id"),
]);
const before = structuredClone({ app, reference });
const assessment = assessColorsAndOpacities(app, reference);
assert.deepEqual(
  { app, reference },
  before,
  "Inventory never mutates either source.",
);
assert.deepEqual(
  membership(assessment, "app"),
  app.records.map((row) => row.id).sort(),
);
assert.deepEqual(
  membership(assessment, "reference"),
  reference.records.map((row) => row.id).sort(),
);
assert.equal(
  assessment.inventory!.entries.length,
  7,
  "Duplicate display names retain distinct identities.",
);
assert.equal(
  assessment.counts.concepts,
  1,
  "Unknown, deprecated and app-only rows do not inflate migration scoring.",
);
assert.deepEqual(
  new Set(resolutionRequests(reference).queries.map((query) => query.id)),
  new Set(reference.records.map((row) => row.id)),
  "Unknown and deprecated tokens are still available to the resolver.",
);
assert(resolutionRequests(app).queries.some((query) => query.id === alias.id));
const all = inventoryComparisonRows(
  assessment.inventory!.entries,
  "",
  "all",
  {},
  "all",
  "all",
);
assert.equal(all.flatMap((row) => row.children).length, 4);
assert(
  all.every((row) =>
    row.children.every((child) => child.inventory.record.id !== deprecated.id),
  ),
  "Deprecated records from both sources stay out of the token table.",
);
const deprecatedOnly = assessColorsAndOpacities(
  input(
    [
      deprecated,
      record("pending-app", {
        tokenStatus: "deprecated",
        context: { retiredAxis: "retired" },
      }),
    ],
    "working",
  ),
  input([
    deprecated,
    record("pending-reference", {
      tokenStatus: "deprecated",
      context: { retiredAxis: "retired" },
    }),
  ]),
);
assert.equal(
  deprecatedOnly.inventory!.entries.length,
  4,
  "Released and pending deprecations retain complete source membership.",
);
const deprecatedModeFilters: Record<string, string>[] = [
  {},
  { retiredAxis: "retired" },
];
for (const query of ["", "same-display-name"])
  for (const modes of deprecatedModeFilters)
    assert.deepEqual(
      inventoryComparisonRows(
        deprecatedOnly.inventory!.entries,
        query,
        "all",
        modes,
        "all",
        "all",
      ),
      [],
      "Searching or filtering modes cannot reveal deprecated records.",
    );
assert.deepEqual(
  comparisonModeSets(deprecatedOnly, []),
  [],
  "Deprecated-only contexts do not add table mode filters.",
);
assert.equal(
  inventoryComparisonRows(
    assessment.inventory!.entries,
    "unclassified",
    "all",
    {},
    "all",
    "all",
  ).length,
  4,
);
assert.equal(
  inventoryComparisonRows(
    assessment.inventory!.entries,
    "",
    "fail",
    {},
    "all",
    "all",
  ).length,
  0,
);
assert.equal(
  referenceOverrideIndex(assessment, [], []).size,
  1,
  "Inventory-only rows are not override targets.",
);
const unresolved = assessment.inventory!.entries.find(
  (entry) => entry.record.id === alias.id,
)!;
assert.match(unresolved.values[0].issue!, /resolution is unavailable/);
const partial = assessColorsAndOpacities(app, {
  ...reference,
  inventoryStatus: "partial",
  errors: ["fixture source failed"],
});
assert(
  partial.inventory!.entries.every((entry) => entry.presence === "unconfirmed"),
);
assert.deepEqual(
  membership(partial, "reference"),
  membership(assessment, "reference"),
);
assert(partial.inventory!.issues.includes("fixture source failed"));
assert.equal(
  assessColorsAndOpacities({ ...app, inventoryStatus: "partial" }, reference)
    .exactPercent,
  null,
  "A partial app inventory cannot claim completion.",
);
const sharedUnknown = record("shared-unknown");
const shared = compareDesignData(
  input([sharedUnknown], "working"),
  input([sharedUnknown]),
);
assert(
  shared.colorOpacity!.inventory!.entries.every(
    (entry) => entry.presence === "matched",
  ),
);
assert.equal(
  shared.colorOpacity!.counts.concepts,
  0,
  "Known identity does not invent comparison support.",
);
const unavailableReference = compareDesignData(
  app,
  unavailableTokenReference("Reference connection failed."),
);
assert.equal(unavailableReference.valid, false);
assert.deepEqual(
  membership(unavailableReference.colorOpacity!, "app"),
  app.records.map((row) => row.id).sort(),
);
assert(
  unavailableReference.colorOpacity!.inventory!.entries.every(
    (entry) => entry.presence === "unconfirmed",
  ),
);

const replaced = input([record("replacement"), ...reference.records.slice(1)]);
const replacementAssessment = assessColorsAndOpacities(app, replaced);
assert.equal(
  replacementAssessment.inventory!.entries.length,
  assessment.inventory!.entries.length,
);
assert(!membership(replacementAssessment, "reference").includes("unknown"));
assert(membership(replacementAssessment, "reference").includes("replacement"));
assert.deepEqual(
  membership(replacementAssessment, "app"),
  membership(assessment, "app"),
);
const added = assessColorsAndOpacities(
  input([...app.records, record("new-app")], "working"),
  reference,
);
assert(membership(added, "app").includes("new-app"));
assert.deepEqual(
  membership(added, "reference"),
  membership(assessment, "reference"),
);
const errors: string[] = [];
const retained = referenceRecords(
  "tokens/partial.json",
  [null, { uuid: "valid", name: { property: "future" }, value: 1 }],
  [],
  (message) => errors.push(message),
);
assert.equal(
  retained.length,
  1,
  "An invalid entry cannot discard its valid siblings.",
);
assert.equal(errors.length, 1);
assert.equal(
  referenceRecords("tokens/schema.json", [
    {
      uuid: "schema-token",
      name: { property: "future" },
      value: 1,
      $schema: "https://example.test/future.json",
    },
  ])[0].schema,
  "https://example.test/future.json",
);
const report = compareDesignData(app, reference);
const markdown = reportMarkdown(report);
for (const row of [...app.records, ...reference.records])
  assert(markdown.includes(row.id));
assert.deepEqual(
  JSON.parse(JSON.stringify(report)).colorOpacity.inventory.entries.length,
  7,
);

const root = fileURLToPath(
  new URL("../../../packages/design-data/", import.meta.url),
);
const canonical: AnalysisRecord[] = [];
for (const directory of ["tokens", "mode-sets"]) {
  for (const file of await jsonFiles(`${root}/${directory}`)) {
    canonical.push(
      ...referenceRecords(
        relative(root, file),
        JSON.parse(await readFile(file, "utf8")),
      ),
    );
  }
}
const liveReference = input(canonical);
const generated = defaultsAnalysisInput();
assert.deepEqual(generated.errors, []);
const mappings = reviewedTypographyMappings(generated, liveReference);
assert(
  generated.records.some(
    (row) =>
      row.conceptId &&
      canonical.some(
        (reference) =>
          reference.conceptId === row.conceptId &&
          reference.structuredName?.property === "font-size-100",
      ),
  ),
  "Confirmed typography now shares canonical concept identities directly.",
);
const compared = assessColorsAndOpacities(generated, liveReference, mappings);
const accessoryConceptId = "56d6a66d-931e-4f8b-bf07-c1a73e7924e8";
const accessory = compared.concepts.find(
  (concept) => concept.id === accessoryConceptId,
)!;
assert(accessory, "The real accessory token is a compared canonical concept.");
assert(
  accessory.rows.some(
    (row) =>
      row.reference.identity === "ae4398f5-6ead-4928-adf9-f39c0cfcec11" &&
      row.app?.identity === row.reference.identity &&
      row.verdict === "pass",
  ),
);
const accessoryRows = generated.records.filter(
  (row) => row.conceptId === accessoryConceptId,
);
assert.equal(accessoryRows.length, 2);
for (const row of accessoryRows) {
  assert(!compared.appOnly.includes(row.id));
  assert(Object.keys(row.context ?? {}).every((axis) => axis === "scale"));
}
assert(
  compared.enhancements.some(
    (row) =>
      row.app?.conceptId === accessoryConceptId &&
      row.context.scale === "mobile",
  ),
  "The real mobile branch remains an app extension, not a second token concept.",
);
for (const [side, data] of [
  ["app", generated],
  ["reference", liveReference],
] as const) {
  assert.deepEqual(
    membership(compared, side),
    data.records
      .filter(isInventoryToken)
      .map((row) => row.id)
      .sort(),
  );
}
const fontRecords = canonical.filter((row) => fontSizeStep(row) !== undefined);
assert(fontRecords.length > 0);
assert.equal(
  fontSizeStep(
    record("invalid-step", {
      structuredName: { property: "font-size-100", scaleIndex: 200 },
    }),
  ),
  undefined,
  "Conflicting step evidence cannot establish a reviewed mapping.",
);
for (const row of fontRecords) {
  assert.equal(foundationValueType(row), "typography");
  assert(
    compared.concepts.some((concept) =>
      concept.rows.some((value) => value.reference.id === row.id),
    ),
  );
  assert(
    resolutionRequests(liveReference).queries.some(
      (query) => query.id === row.id,
    ),
  );
}
const textRecords = generated.records.filter(
  (row) => row.name.startsWith("text-size-") && isInventoryToken(row),
);
assert(textRecords.length > 0);
for (const row of textRecords)
  assert(membership(compared, "app").includes(row.id));
const desktop = compared.concepts
  .flatMap((concept) => concept.rows.map((row) => ({ concept, row })))
  .find(
    ({ row }) =>
      row.reference.structuredName?.property === "font-size-100" &&
      row.context.scale === "desktop",
  )!;
assert.equal(desktop.row.app?.name, "text-size-100");
assert.equal(desktop.concept.label, "font-size-100");
assert.equal(desktop.row.verdict, "pass");
assert.deepEqual(desktop.concept.differences, []);
assert.equal(
  comparisonValuePreview(desktop.concept, desktop.row, "reference").kind,
  "font-size",
);
assert(
  tokenComparisonRows(
    compared.concepts,
    "text-size-100",
    "all",
    {},
    "all",
    "typography",
  ).length > 0,
);
assert(
  tokenComparisonRows(
    compared.concepts,
    "font-size-100",
    "all",
    {},
    "all",
    "typography",
  ).length > 0,
);
assert.equal(
  tokenComparisonRows(
    compared.concepts,
    "font-size-100",
    "all",
    {},
    "all",
    "size",
  ).length,
  0,
);
assert(
  compared.enhancements.some(
    (row) =>
      row.app?.name === "text-size-100" && row.context.textScaling === "larger",
  ),
);

const fontMapping = {
  app: desktop.row.app!.id,
  reference: desktop.row.reference.id,
};
const pairReport = compareDesignData(generated, liveReference);
assert(
  pairReport.findings.some(
    (finding) =>
      finding.app?.id === fontMapping.app &&
      finding.reference?.id === fontMapping.reference &&
      finding.classification === "equal" &&
      finding.confidence === "exact-identity",
  ),
  JSON.stringify(
    pairReport.findings
      .filter((finding) => finding.app?.id === fontMapping.app)
      .map(({ classification, confidence, message }) => ({
        classification,
        confidence,
        message,
      })),
  ),
);
const changed = {
  ...generated,
  records: generated.records.map((row) =>
    row.id === fontMapping.app ? { ...row, value: "99px" } : row,
  ),
};
const changedAssessment = assessColorsAndOpacities(
  changed,
  liveReference,
  reviewedTypographyMappings(changed, liveReference),
);
assert.equal(
  changedAssessment.concepts
    .flatMap((concept) => concept.rows)
    .find((row) => row.reference.id === fontMapping.reference)?.verdict,
  "fail",
);
assert.deepEqual(
  membership(changedAssessment, "reference"),
  membership(compared, "reference"),
);
const duplicate = {
  ...generated,
  records: [
    ...generated.records,
    { ...desktop.row.app!, id: "duplicate-candidate" },
  ],
};
const ambiguousAssessment = assessColorsAndOpacities(
  duplicate,
  liveReference,
  reviewedTypographyMappings(duplicate, liveReference),
);
const ambiguousRow = ambiguousAssessment.concepts
  .flatMap((concept) => concept.rows)
  .find((row) => row.reference.id === fontMapping.reference)!;
assert.equal(ambiguousRow.app, undefined);
assert.equal(ambiguousRow.verdict, "unassessable");
assert(
  ambiguousAssessment.inventory!.entries.some(
    (entry) =>
      entry.record.id === "duplicate-candidate" &&
      entry.presence === "ambiguous",
  ),
);
const stale = reportWithFreshness(pairReport, "stale");
assert.equal(stale.colorOpacity!.exactPercent, null);
assert.equal(stale.colorOpacity!.inventory!.status.reference, "stale");
console.log(
  "Complete source membership, canonical font sizes, generated text sizes, reviewed mapping, aliases, partial inputs, update propagation, exports and stale evidence pass.",
);
