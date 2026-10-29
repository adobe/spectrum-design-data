// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import {
  REVIEWED_MAPPING_VERSION,
  declaredDefaultMode,
  reviewedColorMappings,
} from "./mappings";
import {
  architectureMarkdown,
  type ArchitectureAssessment,
} from "./assessment";
import {
  isOutputMetadata,
  materializationMarkdown,
  materializationReport,
  type MaterializationReport,
  type OutputMetadata,
} from "./materialization";
import { canonicalJson } from "./canonicalJson";
export { canonicalJson } from "./canonicalJson";
import {
  buildCoverage,
  coverageMarkdown,
  type CoverageSummary,
  type InventoryStatus,
} from "./coverage";
import { assessGaps, gapsMarkdown, type GapResult } from "./gaps";

export interface AnalysisRecord {
  taxonomy?: import("../taxonomy/model").TaxonomyProjection;
  id: string;
  category: string;
  name: string;
  structuredName?: Record<string, unknown>;
  source: string;
  pointer: string;
  classification: "authored" | "generated";
  identity?: string;
  conceptId?: string;
  context?: Record<string, string | string[]>;
  value?: unknown;
  unit?: string;
  reference?: string;
  /** Registry type retained from its declaration, not inferred from a filename or label. */
  vocabulary?: string;
  /** Effective generated rows retain their pre-override evidence without changing record class. */
  overrides?: { generatedName?: string; generatedValue?: unknown };
}

export interface AnalysisSource {
  kind: "defaults" | "saved" | "working" | "reference";
  root: string;
  hash: string;
  revision: string;
  dirty: boolean | null;
  version: string;
  validator: string;
  resolutionConformance?: {
    fixtureHash: string;
    resolvedValueComparison: "disabled";
    checks: {
      name: string;
      status: "passed" | "failed" | "unsupported";
      message?: string;
    }[];
    error?: string;
  };
}

export interface AnalysisInput {
  source: AnalysisSource;
  records: AnalysisRecord[];
  categories: string[];
  schemas: string[];
  errors: string[];
  limitations: string[];
  architecture?: ArchitectureAssessment;
  outputMetadata?: OutputMetadata;
  inventoryStatus?: InventoryStatus;
}

export interface ReviewedMapping {
  app: string;
  reference: string;
  rationale: string;
  nameFields?: Record<string, { reference: string; normalization?: "integer" }>;
  contextDefaults?: readonly string[];
}

export interface AnalysisFinding {
  id: string;
  category: string;
  classification:
    | "app-only"
    | "reference-only"
    | "extension"
    | "field-gap"
    | "type-gap"
    | "mode-gap"
    | "platform-gap"
    | "value-difference"
    | "structure-difference"
    | "equal"
    | "ambiguous"
    | "unassessable"
    | "invalid-input";
  severity: "info" | "error";
  confidence: "exact-identity" | "reviewed-mapping" | "unassessable";
  message: string;
  app?: AnalysisRecord;
  reference?: AnalysisRecord;
}

export interface AnalysisReport {
  gaps?: GapResult[];
  schemaVersion: 1;
  /** Additive, independently versioned assessment; output fields remain report v1. */
  architecture?: ArchitectureAssessment;
  materialization?: MaterializationReport;
  coverage?: CoverageSummary;
  freshness: "current" | "stale";
  mappingVersion: string;
  inputs: { app: AnalysisSource; reference: AnalysisSource };
  valid: boolean;
  generationContext: string;
  policy: {
    numericTolerance: number;
    colorDeltaE2000: number;
    aliases: string;
  };
  metrics: {
    category: string;
    app: number;
    reference: number;
    appFiles: number;
    referenceFiles: number;
    matched: number;
    assessable: number;
    excluded: number;
  }[];
  concepts: {
    app: number;
    reference: number;
    appRows: number;
    referenceRows: number;
  };
  schemas: string[];
  limitations: string[];
  findings: AnalysisFinding[];
}

function valueShape(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value))
    return `array:${[...new Set(value.map(valueShape))].sort().join("|")}`;
  if (typeof value === "object")
    return `object:${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(([key, member]) => `${key}:${valueShape(member)}`)
      .join("|")}`;
  return typeof value;
}

function compareValue(
  app: AnalysisRecord,
  reference: AnalysisRecord,
): "equal" | "value-difference" | "structure-difference" | "unassessable" {
  if (
    app.reference ||
    reference.reference ||
    app.value === undefined ||
    reference.value === undefined
  )
    return "unassessable";
  if (app.unit !== reference.unit) return "unassessable";
  if (valueShape(app.value) !== valueShape(reference.value))
    return "structure-difference";
  if (typeof app.value === "number" && typeof reference.value === "number") {
    if (!Number.isFinite(app.value) || !Number.isFinite(reference.value))
      return "unassessable";
    return Math.abs(app.value - reference.value) <= 1e-6
      ? "equal"
      : "value-difference";
  }
  if (typeof app.value === "string" && typeof reference.value === "string") {
    try {
      const left = new Color(app.value);
      const right = new Color(reference.value);
      return left.deltaE(right, "2000") <= 0.1 &&
        Math.abs(left.alpha - right.alpha) <= 1e-6
        ? "equal"
        : "value-difference";
    } catch {
      return app.value === reference.value ? "equal" : "value-difference";
    }
  }
  return canonicalJson(app.value) === canonicalJson(reference.value)
    ? "equal"
    : "value-difference";
}

function modeVocabulary(
  record: AnalysisRecord,
): { modes: string[]; default?: string } | undefined {
  const value = record.value;
  if (
    record.category !== "mode-sets" ||
    !value ||
    typeof value !== "object" ||
    !("modes" in value) ||
    !Array.isArray(value.modes)
  )
    return;
  const modes: string[] = [];
  for (const mode of value.modes as unknown[]) {
    const key =
      typeof mode === "string"
        ? mode
        : mode && typeof mode === "object" && "key" in mode
          ? mode.key
          : undefined;
    if (typeof key !== "string") return;
    modes.push(key);
  }
  const defaultMode =
    "default" in value && typeof value.default === "string"
      ? value.default
      : "defaultModeId" in value
        ? (value.modes as unknown[]).find(
            (mode) =>
              mode &&
              typeof mode === "object" &&
              "id" in mode &&
              mode.id === value.defaultModeId,
          )
        : undefined;
  const defaultKey =
    typeof defaultMode === "string"
      ? defaultMode
      : defaultMode &&
          typeof defaultMode === "object" &&
          "key" in defaultMode &&
          typeof defaultMode.key === "string"
        ? defaultMode.key
        : undefined;
  return { modes, default: defaultKey };
}

export function compareDesignData(
  app: AnalysisInput,
  reference: AnalysisInput,
  suppliedMappings?: readonly ReviewedMapping[],
): AnalysisReport {
  const mappings = suppliedMappings ?? reviewedColorMappings(app, reference);
  const appOwnedDefinitions = new Set([
    "foundations",
    "authoring/rules",
    "authoring/scaleTypes",
    "authoring/interpolations",
    "authoring/adaptiveClaims",
    "authoring/tokenOverrides",
    "authoring/token-edits",
  ]);
  const inventoryGap = (
    record: AnalysisRecord,
  ): "mode-gap" | "platform-gap" | undefined =>
    record.category === "mode-sets"
      ? "mode-gap"
      : record.category === "authoring/platforms" ||
          record.vocabulary === "platform"
        ? "platform-gap"
        : undefined;
  const findings: AnalysisFinding[] = [];
  const used = new Set<string>();
  const mappingErrors = mappings.flatMap((mapping) => [
    ...(app.records.some((row) => row.id === mapping.app)
      ? []
      : [`Mapping app record is absent: ${mapping.app}`]),
    ...(reference.records.some((row) => row.id === mapping.reference)
      ? []
      : [`Mapping reference record is absent: ${mapping.reference}`]),
  ]);
  const metadataErrors = (
    [
      ["App", app],
      ["Reference", reference],
    ] as const
  ).flatMap(([label, input]) =>
    input.outputMetadata !== undefined &&
    !isOutputMetadata(input.outputMetadata, input.records)
      ? [`${label}: Invalid output provenance metadata.`]
      : [],
  );
  const coverageValid =
    app.errors.length === 0 &&
    reference.errors.length === 0 &&
    mappingErrors.length === 0 &&
    metadataErrors.length === 0;
  const candidatesFor = (left: AnalysisRecord) =>
    reference.records.filter(
      (right) =>
        right.category === left.category &&
        (mappings.some(
          (item) => item.app === left.id && item.reference === right.id,
        ) ||
          (left.identity !== undefined && left.identity === right.identity)),
    );
  const candidatesByApp = new Map(
    app.records.map((left) => [left.id, candidatesFor(left)]),
  );
  const targetCounts = new Map<string, number>();
  for (const candidates of candidatesByApp.values())
    for (const right of candidates)
      targetCounts.set(right.id, (targetCounts.get(right.id) ?? 0) + 1);
  const add = (
    classification: AnalysisFinding["classification"],
    message: string,
    left?: AnalysisRecord,
    right?: AnalysisRecord,
    confidence: AnalysisFinding["confidence"] = "unassessable",
  ) => {
    findings.push({
      id: canonicalJson([
        classification,
        left?.id ?? null,
        right?.id ?? null,
        message,
      ]),
      category: left?.category ?? right?.category ?? "input",
      classification,
      severity: classification === "invalid-input" ? "error" : "info",
      confidence,
      message,
      ...(left ? { app: left } : {}),
      ...(right ? { reference: right } : {}),
    });
  };
  for (const error of [
    ...app.errors.map((error) => `App: ${error}`),
    ...reference.errors.map((error) => `Reference: ${error}`),
  ])
    add("invalid-input", error);
  for (const error of metadataErrors) add("invalid-input", error);
  for (const error of mappingErrors) add("invalid-input", error);
  for (const left of app.records) {
    const mapping = mappings.filter((item) => item.app === left.id);
    const candidates = candidatesByApp.get(left.id) ?? [];
    const duplicate =
      app.records.filter((item) => item.id === left.id).length > 1;
    if (duplicate || candidates.length > 1 || mapping.length > 1) {
      add(
        "ambiguous",
        "Duplicate identity or multiple candidate mappings; no match selected.",
        left,
      );
      continue;
    }
    const right = candidates[0];
    if (!right) {
      if (
        !app.errors.length &&
        left.classification === "authored" &&
        appOwnedDefinitions.has(left.category) &&
        !mapping.length
      ) {
        add(
          "extension",
          "App-owned authoring definition retained losslessly; generated outputs are compared separately. This is not an adopted spec extension or a missing app feature. See the reviewed authoring-model proposals.",
          left,
        );
        continue;
      }
      const gap = inventoryGap(left);
      add(
        !coverageValid ? "unassessable" : (gap ?? "app-only"),
        mapping.length
          ? "Reviewed target is absent."
          : gap
            ? "App declaration has no confirmed reference identity or reviewed mapping. This is an unmapped vocabulary gap, not proof of missing product support or equivalent names."
            : "No confirmed reference identity or reviewed mapping.",
        left,
      );
      continue;
    }
    if ((targetCounts.get(right.id) ?? 0) > 1) {
      add(
        "ambiguous",
        "Reference record is targeted by multiple app records; none selected.",
        left,
        right,
      );
      continue;
    }
    used.add(right.id);
    const confidence = mapping.length ? "reviewed-mapping" : "exact-identity";
    const defaultKeys = mapping[0]?.contextDefaults ?? [];
    const normalizedContext = (record: AnalysisRecord, input: AnalysisInput) =>
      Object.fromEntries([
        ...defaultKeys.flatMap((key) => {
          const value =
            record.structuredName?.[key] ?? declaredDefaultMode(input, key);
          return typeof value === "string" ||
            (Array.isArray(value) &&
              value.every((member: unknown) => typeof member === "string"))
            ? [[key, value]]
            : [];
        }),
        ...Object.entries(record.context ?? {}),
      ]);
    const leftContext = normalizedContext(left, app);
    const rightContext = normalizedContext(right, reference);
    const missingDefaults = defaultKeys.filter(
      (key) =>
        leftContext[key] === undefined || rightContext[key] === undefined,
    );
    if (missingDefaults.length) {
      if (coverageValid)
        for (const key of missingDefaults) {
          add(
            key === "platform" ? "platform-gap" : "mode-gap",
            `Missing declared default for ${key} in ${[...(leftContext[key] === undefined ? ["app"] : []), ...(rightContext[key] === undefined ? ["reference"] : [])].join(" and ")} input; the reviewed mapping requires this context. No omitted-mode or platform equivalence is inferred.`,
            left,
            right,
            confidence,
          );
        }
      add(
        "unassessable",
        "Required mapping context cannot be established from explicit values or declared defaults; value equivalence is not assessed.",
        left,
        right,
        confidence,
      );
      continue;
    }
    if (canonicalJson(leftContext) !== canonicalJson(rightContext)) {
      if (coverageValid) {
        const keys = [
          ...new Set([
            ...Object.keys(leftContext),
            ...Object.keys(rightContext),
          ]),
        ].sort();
        for (const key of keys) {
          const appContext = leftContext[key];
          const referenceContext = rightContext[key];
          if (canonicalJson(appContext) !== canonicalJson(referenceContext)) {
            add(
              key === "platform" ? "platform-gap" : "mode-gap",
              `Confirmed pair has ${appContext === undefined || referenceContext === undefined ? "an undeclared" : "different"} ${key} context${appContext !== undefined && referenceContext !== undefined ? "s" : ""}: app ${appContext === undefined ? "undeclared" : canonicalJson(appContext)}; reference ${referenceContext === undefined ? "undeclared" : canonicalJson(referenceContext)}. No default, platform alias, or multimode equivalence is inferred.`,
              left,
              right,
              confidence,
            );
          }
        }
      }
      add(
        "unassessable",
        "Confirmed contexts differ; value equivalence is not assessed across modes or platforms.",
        left,
        right,
        confidence,
      );
      continue;
    }
    if (coverageValid && left.category === "mode-sets") {
      const leftModes = modeVocabulary(left);
      const rightModes = modeVocabulary(right);
      if (leftModes && rightModes) {
        const onlyApp = leftModes.modes.filter(
          (key) => !rightModes.modes.includes(key),
        );
        const onlyReference = rightModes.modes.filter(
          (key) => !leftModes.modes.includes(key),
        );
        if (onlyApp.length || onlyReference.length)
          add(
            "mode-gap",
            `Confirmed declarations have different mode vocabulary: app-only ${canonicalJson([...onlyApp].sort())}; reference-only ${canonicalJson([...onlyReference].sort())}. Foundation parameter payloads and continuous controls are not compared as mode values.`,
            left,
            right,
            confidence,
          );
        if (
          leftModes.default === undefined ||
          rightModes.default === undefined
        ) {
          add(
            "mode-gap",
            "Missing declared default in a confirmed mode-declaration pair; no first-mode fallback is inferred.",
            left,
            right,
            confidence,
          );
          add(
            "unassessable",
            "Mode-declaration default context is unavailable.",
            left,
            right,
            confidence,
          );
          continue;
        }
        if (leftModes.default !== rightModes.default)
          add(
            "mode-gap",
            `Confirmed declarations have different declared defaults: app ${canonicalJson(leftModes.default)}; reference ${canonicalJson(rightModes.default)}. This is not proof of missing product support.`,
            left,
            right,
            confidence,
          );
      }
    }
    if (coverageValid && left.structuredName && right.structuredName) {
      const fields = mapping[0]?.nameFields ?? {};
      const contextKeys = new Set([
        ...defaultKeys,
        ...Object.keys(left.context ?? {}),
        ...Object.keys(right.context ?? {}),
      ]);
      const compared = new Set<string>();
      for (const [key, value] of Object.entries(left.structuredName)) {
        if (contextKeys.has(key)) continue;
        const target = fields[key]?.reference ?? key;
        compared.add(target);
        if (!Object.hasOwn(right.structuredName, target)) {
          add(
            "field-gap",
            `Structured-name field ${key} (${target} in the reviewed mapping) is present only in the app record. This is a representation gap, not proof of required missing support.`,
            left,
            right,
            confidence,
          );
          continue;
        }
        const other = right.structuredName[target];
        const normalized =
          fields[key]?.normalization === "integer" &&
          typeof value === "string" &&
          /^-?\d+$/.test(value)
            ? Number(value)
            : value;
        if (valueShape(normalized) !== valueShape(other)) {
          add(
            "type-gap",
            `Structured-name field ${key}→${target} has different representation types after declared normalization: ${valueShape(normalized)} versus ${valueShape(other)}. No undeclared coercion is inferred.`,
            left,
            right,
            confidence,
          );
        }
      }
      for (const key of Object.keys(right.structuredName)) {
        if (!contextKeys.has(key) && !compared.has(key))
          add(
            "field-gap",
            `Structured-name field ${key} is present only in the reference record. This is a representation gap, not proof of required missing support.`,
            left,
            right,
            confidence,
          );
      }
    }
    const classification = compareValue(left, right);
    const diagnostic =
      classification === "structure-difference"
        ? " Value representations have different shapes; numeric equivalence is not claimed."
        : classification === "unassessable"
          ? left.reference || right.reference
            ? " Reference is unresolved; no substitute alias/cascade resolution is inferred."
            : left.unit !== right.unit
              ? ` Units differ (${left.unit ?? "unspecified"} versus ${right.unit ?? "unspecified"}); no conversion context is established.`
              : " Required values are missing or non-finite."
          : "";
    add(
      classification,
      `${mapping[0]?.rationale ?? "Exact identity in the same category and mode context."}${diagnostic}`,
      left,
      right,
      mapping.length ? "reviewed-mapping" : "exact-identity",
    );
  }
  for (const right of reference.records) {
    if (!used.has(right.id)) {
      const gap = inventoryGap(right);
      add(
        !coverageValid ? "unassessable" : (gap ?? "reference-only"),
        gap
          ? "Reference declaration has no confirmed app identity or reviewed mapping. This is an unmapped vocabulary gap, not proof of missing product support or equivalent names."
          : "No confirmed app identity or reviewed mapping.",
        undefined,
        right,
      );
    }
  }
  const categories = [
    ...new Set([
      ...app.categories,
      ...reference.categories,
      ...findings.map((finding) => finding.category),
    ]),
  ].sort();
  const tokenRows = (input: AnalysisInput) =>
    input.records.filter((record) => record.category === "tokens");
  return {
    schemaVersion: 1,
    freshness: "current",
    mappingVersion: suppliedMappings
      ? "explicit-reviewed-pairs-v1"
      : REVIEWED_MAPPING_VERSION,
    gaps: assessGaps(app, reference, findings),
    ...(reference.architecture
      ? {
          architecture: {
            ...structuredClone(reference.architecture),
            requiredInputFailures: findings
              .filter((finding) => finding.classification === "invalid-input")
              .map((finding) => finding.message)
              .sort(),
          },
        }
      : {}),
    materialization: materializationReport(app, reference),
    coverage: buildCoverage(app, reference, findings),
    inputs: { app: app.source, reference: reference.source },
    valid: !findings.some(
      (finding) => finding.classification === "invalid-input",
    ),
    generationContext:
      "Authored values and app-generated mode rows; unresolved reference aliases are excluded from value comparison.",
    policy: {
      numericTolerance: 1e-6,
      colorDeltaE2000: 0.1,
      aliases:
        "No substitute cascade or alias resolver; unresolved aliases are unassessable.",
    },
    metrics: categories.map((category) => {
      const rows = findings.filter((finding) => finding.category === category);
      return {
        category,
        app: app.records.filter((record) => record.category === category)
          .length,
        reference: reference.records.filter(
          (record) => record.category === category,
        ).length,
        appFiles: new Set(
          app.records
            .filter((record) => record.category === category)
            .map((record) => record.source),
        ).size,
        referenceFiles: new Set(
          reference.records
            .filter((record) => record.category === category)
            .map((record) => record.source),
        ).size,
        matched: new Set(
          rows
            .filter(
              (row) =>
                row.app && row.reference && row.classification !== "ambiguous",
            )
            .map((row) => canonicalJson([row.app!.id, row.reference!.id])),
        ).size,
        assessable: rows.filter(
          (row) =>
            row.classification === "equal" ||
            row.classification === "value-difference",
        ).length,
        excluded: rows.filter(
          (row) =>
            row.classification === "unassessable" ||
            row.classification === "ambiguous" ||
            row.classification === "structure-difference" ||
            row.classification === "extension",
        ).length,
      };
    }),
    concepts: {
      app: new Set(
        tokenRows(app)
          .map((row) => row.conceptId)
          .filter(Boolean),
      ).size,
      reference: new Set(
        tokenRows(reference)
          .map((row) => row.conceptId)
          .filter(Boolean),
      ).size,
      appRows: tokenRows(app).length,
      referenceRows: tokenRows(reference).length,
    },
    schemas: [...new Set([...app.schemas, ...reference.schemas])].sort(),
    limitations: [
      ...new Set([
        ...app.limitations,
        ...reference.limitations,
        "Independent UUIDs and names are not treated as equivalent. App-only/reference-only denotes inventory, not a required product feature.",
      ]),
    ].sort(),
    findings: findings.sort((left, right) =>
      left.id.localeCompare(right.id, "en"),
    ),
  };
}

export function reportMarkdown(report: AnalysisReport): string {
  const text = (value: string) =>
    value.replaceAll("|", "\\|").replaceAll("\n", " ");
  const dirty = (value: boolean | null) =>
    value === null ? "unknown" : value ? "dirty" : "clean";
  const location = (record?: AnalysisRecord) =>
    record ? `${text(record.source)}${text(record.pointer)}` : "not present";
  return [
    "# Design-data analysis",
    "",
    `Input status: ${report.valid ? "valid" : "invalid / partial"}. Source: ${report.inputs.app.kind}. Freshness: ${report.freshness}.`,
    "",
    `Report schema version: ${report.schemaVersion}. Mapping version: ${text(report.mappingVersion)}.`,
    "",
    ...(report.coverage ? [coverageMarkdown(report.coverage), ""] : []),
    ...(report.gaps ? [gapsMarkdown(report.gaps), ""] : []),
    "## Input provenance",
    "",
    "| Input | Kind | Root | Dataset/spec version | Revision | Content SHA-256 | Worktree | Validator |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...Object.entries(report.inputs).map(
      ([key, source]) =>
        `| ${key} | ${source.kind} | ${text(source.root)} | ${text(source.version)} | ${text(source.revision)} | ${text(source.hash)} | ${dirty(source.dirty)} | ${text(source.validator)} |`,
    ),
    "",
    "## Comparison scope and policy",
    "",
    text(report.generationContext),
    "",
    `Numeric tolerance: ${report.policy.numericTolerance}. Color delta E 2000 tolerance: ${report.policy.colorDeltaE2000}; alpha tolerance: 0.000001.`,
    `Alias policy: ${text(report.policy.aliases)}`,
    "",
    `App token concepts: ${report.concepts.app}; reference token concepts: ${report.concepts.reference}. App mode rows: ${report.concepts.appRows}; reference mode rows: ${report.concepts.referenceRows}.`,
    "",
    `Schema inventory: ${report.schemas.map(text).join(", ") || "none discovered"}.`,
    "",
    "Differences are informational. Categories have independent denominators; there is no combined health score.",
    "",
    "| Category | App records | Reference records | App files | Reference files | Matched pairs | Assessable values | Excluded findings |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...report.metrics.map(
      (metric) =>
        `| ${text(metric.category)} | ${metric.app} | ${metric.reference} | ${metric.appFiles} | ${metric.referenceFiles} | ${metric.matched} | ${metric.assessable} | ${metric.excluded} |`,
    ),
    "",
    "## Input failures",
    "",
    ...(report.findings.some(
      (finding) => finding.classification === "invalid-input",
    )
      ? report.findings
          .filter((finding) => finding.classification === "invalid-input")
          .map((finding) => `- ${text(finding.message)}`)
      : ["No required-input failures reported."]),
    "",
    "## Resolution conformance",
    "",
    `Resolved-value comparison: ${report.inputs.reference.resolutionConformance?.resolvedValueComparison ?? "disabled (not assessed)"}.`,
    `Fixture SHA-256: ${report.inputs.reference.resolutionConformance?.fixtureHash ?? "unavailable"}.`,
    "",
    ...(report.inputs.reference.resolutionConformance?.checks ?? []).map(
      (check) =>
        `- **${check.status}** ${text(check.name)}${check.message ? `: ${text(check.message)}` : ""}`,
    ),
    "",
    ...(report.inputs.reference.resolutionConformance?.error
      ? [
          `Conformance error: ${text(report.inputs.reference.resolutionConformance.error)}`,
          "",
        ]
      : []),
    "## Limitations",
    "",
    ...report.limitations.map((item) => `- ${text(item)}`),
    "",
    ...(report.architecture
      ? [architectureMarkdown(report.architecture), ""]
      : []),
    ...(report.materialization
      ? [materializationMarkdown(report.materialization), ""]
      : []),
    "## Findings",
    "",
    ...report.findings.map(
      (finding) =>
        `- **${finding.classification}** (${text(finding.category)}; ${finding.severity}; confidence: ${finding.confidence}): ${text(finding.app?.name ?? finding.reference?.name ?? "Input")} - ${text(finding.message)} [app: ${location(finding.app)}; reference: ${location(finding.reference)}]`,
    ),
    "",
  ].join("\n");
}

export function reportWithFreshness(
  report: AnalysisReport,
  freshness: AnalysisReport["freshness"],
): AnalysisReport {
  return {
    ...report,
    freshness,
    ...(freshness === "stale" && report.gaps
      ? {
          gaps: report.gaps.map((result) => ({
            ...result,
            freshness: "stale" as const,
            disposition: "unassessable" as const,
            criteria: result.criteria.map((criterion) => ({
              ...criterion,
              passed: false,
            })),
          })),
        }
      : {}),
  };
}
