// Copyright 2026 Adobe. All rights reserved.
import { concreteColor } from "../color-system/data-vis/colors";
import { canonicalJson } from "./canonicalJson";
import type {
  AnalysisInput,
  AnalysisRecord,
  ReviewedMapping,
} from "./comparison";
import { gapRegister, gapRegisterLoadIssues, type GapEntry } from "./gaps";
import { declaredDefaultMode } from "./mappings";

export type PaletteClassification =
  | "aligned"
  | "accepted exception"
  | "proposed exception"
  | "different"
  | "unassessable";
export interface PaletteDifference {
  field: string;
  appField: string;
  app?: unknown;
  reference?: unknown;
}
export type PaletteAlignment = "exact" | "close" | "different" | "unassessable";

export function paletteAlignmentLabel(alignment: PaletteAlignment): string {
  return {
    exact: "100% aligned",
    close: "Close enough",
    different: "Not aligned",
    unassessable: "Unable to evaluate",
  }[alignment];
}

export interface PaletteModeAssessment {
  reference: AnalysisRecord;
  app?: AnalysisRecord;
  context: Record<string, string>;
  counterpart: "represented" | "not matched" | "ambiguous";
  classification: PaletteClassification;
  differences: PaletteDifference[];
  issues: string[];
  exceptions: { id: string; link: string; accepted: boolean }[];
  value: "equal" | "different" | "unassessable";
  valueAlignment: PaletteAlignment;
  rgbChannelDifferences?: number[];
  valueReason?: string;
  deltaE2000?: number;
  mapping?: Pick<ReviewedMapping, "rationale" | "nameFields">;
}
export interface PaletteConceptAssessment {
  id: string;
  label: string;
  family: string;
  identityCertain: boolean;
  represented: boolean;
  complete: boolean;
  alignment: PaletteAlignment;
  rows: PaletteModeAssessment[];
}
export interface PaletteAssessment {
  schemaVersion: 1;
  scope: "primitive-palette";
  baseline: "shipped defaults" | "provisional";
  freshness: "current" | "stale";
  assessable: boolean;
  policy: {
    comparison: "normalized XYZ D65 and alpha";
    conversionRoundoff: number;
    perceptualTolerance: 0;
    maxSrgbChannelDifference: 1;
    alphaTolerance: 0;
  };
  counts: {
    concepts: number;
    represented: number;
    classificationAligned: number;
    complete: number;
    rows: number;
    equalRows: number;
    closeRows: number;
    exactAligned: number;
    closeEnough: number;
    notAligned: number;
    unassessable: number;
    excludedDeprecated: number;
    appOnlyRows: number;
  };
  completionPercent: number | null;
  concepts: PaletteConceptAssessment[];
  excluded: { id: string; reason: string }[];
  appOnly: AnalysisRecord[];
  issues: string[];
  sources: { app: AnalysisInput["source"]; reference: AnalysisInput["source"] };
}

export function paletteSchemeSummary(
  concept: PaletteConceptAssessment,
  scheme: string,
): string {
  const rows = concept.rows.filter((row) => row.context.colorScheme === scheme);
  if (!rows.length) return "not required";
  if (rows.some((row) => row.counterpart === "ambiguous")) return "ambiguous";
  if (rows.some((row) => row.counterpart === "not matched"))
    return "not matched";
  if (rows.some((row) => row.value === "unassessable")) return "unassessable";
  return paletteAlignmentLabel(
    rows.some((row) => row.valueAlignment === "different")
      ? "different"
      : rows.some((row) => row.valueAlignment === "close")
        ? "close"
        : "exact",
  );
}

const paletteSource = "tokens/color-palette.tokens.json";
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const same = (left: unknown, right: unknown) =>
  canonicalJson(left ?? null) === canonicalJson(right ?? null);
const roundoff = 32 * Number.EPSILON;
const maxSrgbChannelDifference = 1;

export function exactPaletteColor(
  left: unknown,
  right: unknown,
): Pick<
  PaletteModeAssessment,
  | "value"
  | "valueAlignment"
  | "valueReason"
  | "deltaE2000"
  | "rgbChannelDifferences"
> {
  if (typeof left !== "string" || typeof right !== "string")
    return {
      value: "unassessable",
      valueAlignment: "unassessable",
      valueReason: "A concrete color is missing.",
    };
  try {
    const app = concreteColor(left);
    const reference = concreteColor(right);
    const a = app.to("xyz-d65").coords;
    const b = reference.to("xyz-d65").coords;
    const equal =
      Math.abs(app.alpha - reference.alpha) <= roundoff &&
      a.every(
        (channel, index) =>
          channel !== null &&
          b[index] !== null &&
          Number.isFinite(channel) &&
          Number.isFinite(b[index]) &&
          Math.abs(channel - b[index]) <=
            roundoff * Math.max(1, Math.abs(channel), Math.abs(b[index]!)),
      );
    const distance = app.deltaE(reference, "2000");
    const appRgb = app.to("srgb").coords;
    const referenceRgb = reference.to("srgb").coords;
    const inSrgb = [...appRgb, ...referenceRgb].every(
      (channel) =>
        channel !== null &&
        Number.isFinite(channel) &&
        channel >= -roundoff &&
        channel <= 1 + roundoff,
    );
    const rgbChannelDifferences = appRgb.map((channel, index) =>
      channel === null || referenceRgb[index] === null
        ? Number.NaN
        : Math.abs(channel - referenceRgb[index]!) * 255,
    );
    const close =
      inSrgb &&
      Math.abs(app.alpha - reference.alpha) <= roundoff &&
      rgbChannelDifferences.every(
        (difference) => difference <= maxSrgbChannelDifference + roundoff * 255,
      );
    return {
      value: equal ? "equal" : "different",
      valueAlignment: equal ? "exact" : close ? "close" : "different",
      ...(inSrgb && { rgbChannelDifferences }),
      ...(Number.isFinite(distance) && { deltaE2000: distance }),
    };
  } catch (error) {
    return {
      value: "unassessable",
      valueAlignment: "unassessable",
      valueReason: error instanceof Error ? error.message : String(error),
    };
  }
}

function modeKeys(app: AnalysisInput, reference: AnalysisInput): string[] {
  const declarations = new Set(
    [app, reference].flatMap((input) =>
      input.records.flatMap((record) => {
        if (record.category !== "mode-sets" || !object(record.value)) return [];
        const key = record.value.key ?? record.value.name;
        return typeof key === "string" ? [key] : [];
      }),
    ),
  );
  return [
    ...new Set([
      "colorScheme",
      "contrast",
      ...[app, reference].flatMap((input) =>
        input.records.flatMap((record) => {
          if (
            record.category !== "tokens" ||
            record.structuredName?.property !== "color"
          )
            return [];
          return [
            ...Object.keys(record.context ?? {}),
            ...Object.keys(record.structuredName ?? {}).filter((key) =>
              declarations.has(key),
            ),
          ];
        }),
      ),
    ]),
  ].sort();
}

function colorFamilyId(
  value: unknown,
  reference: AnalysisInput,
): string | undefined {
  const families = reference.records.filter(
    (record) =>
      record.category === "registry" &&
      record.vocabulary === "color-family" &&
      object(record.value) &&
      (record.value.id === value || record.value.label === value),
  );
  if (families.length !== 1 || !object(families[0].value)) return;
  return typeof families[0].value.id === "string"
    ? families[0].value.id
    : undefined;
}

/** Studio's registered family labels identify candidates, not canonical classification agreement. */
export function paletteLabelMappings(
  app: AnalysisInput,
  reference: AnalysisInput,
): ReviewedMapping[] {
  const keys = modeKeys(app, reference);
  const result: ReviewedMapping[] = [];
  for (const left of app.records) {
    const name = left.structuredName;
    const familyField =
      typeof name?.colorFamily === "string" ? "colorFamily" : "colorName";
    if (
      left.category !== "tokens" ||
      left.classification !== "generated" ||
      name?.property !== "color" ||
      typeof name[familyField] !== "string" ||
      !Number.isSafeInteger(name.scaleIndex) ||
      Object.keys(name).some(
        (key) =>
          !["property", familyField, "scaleIndex", ...keys].includes(key),
      )
    )
      continue;
    const family = colorFamilyId(name[familyField], reference);
    if (!family) continue;
    const leftContext = contextFor(left, app, keys);
    if (leftContext.issues.length) continue;
    for (const right of reference.records) {
      if (
        right.category !== "tokens" ||
        right.source !== paletteSource ||
        right.lifecycle?.deprecatedIn ||
        right.structuredName?.property !== "color" ||
        right.structuredName.colorFamily !== family ||
        right.structuredName.scaleIndex !== name.scaleIndex ||
        Object.keys(right.structuredName).some(
          (key) =>
            !["property", "colorFamily", "scaleIndex", ...keys].includes(key),
        )
      )
        continue;
      const rightContext = contextFor(right, reference, keys);
      if (
        rightContext.issues.length ||
        !same(leftContext.context, rightContext.context)
      )
        continue;
      result.push({
        app: left.id,
        reference: right.id,
        nameFields: { [familyField]: { reference: "colorFamily" } },
        rationale:
          "studio-palette-label-v1: exact registered color-family label/id, numeric scaleIndex and declared context. Field and term differences remain visible; no name parsing, case folding or value-based matching.",
      });
    }
  }
  return result;
}

function contextFor(
  row: AnalysisRecord,
  input: AnalysisInput,
  keys: string[],
): { context: Record<string, string>; issues: string[] } {
  const context: Record<string, string> = {};
  const issues: string[] = [];
  for (const key of keys) {
    const explicit = row.context?.[key] ?? row.structuredName?.[key];
    const value = explicit ?? declaredDefaultMode(input, key);
    if (value === undefined) {
      if (key === "colorScheme" || key === "contrast")
        issues.push(`No explicit ${key} or unique declared default.`);
      continue;
    }
    if (typeof value !== "string") {
      issues.push(`The ${key} context is not a single mode value.`);
      continue;
    }
    if (
      row.context?.[key] !== undefined &&
      row.structuredName?.[key] !== undefined &&
      !same(row.context[key], row.structuredName[key])
    )
      issues.push(`Conflicting ${key} context and classification.`);
    const declarations = input.records.filter(
      (record) =>
        record.category === "mode-sets" &&
        object(record.value) &&
        (record.value.key === key || record.value.name === key),
    );
    if (declarations.length !== 1) {
      issues.push(`No unique ${key} mode declaration.`);
    } else {
      const declaration = declarations[0].value;
      if (
        !object(declaration) ||
        !Array.isArray(declaration.modes) ||
        !declaration.modes.some(
          (mode: unknown) =>
            mode === value || (object(mode) && mode.key === value),
        )
      )
        issues.push(`Unknown ${key} mode: ${value}.`);
    }
    context[key] = value;
  }
  return { context, issues };
}

function classificationIssues(
  row: AnalysisRecord,
  reference: AnalysisInput,
): string[] {
  const name = row.structuredName;
  const issues = [...(row.taxonomy?.issues ?? [])];
  if (name?.property !== "color")
    issues.push("The property classification must be color.");
  if (typeof name?.colorFamily !== "string")
    issues.push("colorFamily must be a string.");
  if (!Number.isSafeInteger(name?.scaleIndex))
    issues.push("scaleIndex must be a safe integer.");
  const families = reference.records.filter(
    (record) =>
      record.category === "registry" && record.vocabulary === "color-family",
  );
  if (!families.length)
    issues.push("Reference color-family vocabulary is unavailable.");
  else if (
    !families.some(
      (record) => object(record.value) && record.value.id === name?.colorFamily,
    )
  )
    issues.push("colorFamily is not in the reference vocabulary.");
  return issues;
}

function differencesFor(
  app: AnalysisRecord,
  reference: AnalysisRecord,
  keys: string[],
  mapping?: ReviewedMapping,
): PaletteDifference[] {
  const left = app.structuredName ?? {};
  const right = reference.structuredName ?? {};
  const fields = mapping?.nameFields ?? {};
  const result: PaletteDifference[] = [];
  const visited = new Set<string>();
  for (const key of Object.keys(left).sort()) {
    if (keys.includes(key)) continue;
    const target = fields[key]?.reference ?? key;
    visited.add(target);
    if (key !== target || !same(left[key], right[target]))
      result.push({
        field: target,
        appField: key,
        app: left[key],
        ...(right[target] !== undefined && { reference: right[target] }),
      });
  }
  for (const key of Object.keys(right).sort())
    if (!keys.includes(key) && !visited.has(key))
      result.push({ field: key, appField: key, reference: right[key] });
  return result;
}

/** Mapping evidence may identify a pair; only a scoped accepted RFC can excuse its declared field translation. */
function exceptionFor(
  row: PaletteModeAssessment,
  mapping: ReviewedMapping | undefined,
  reference: AnalysisInput,
  gaps: readonly GapEntry[],
): PaletteModeAssessment["exceptions"] {
  if (
    !row.app ||
    !mapping ||
    !row.differences.length ||
    row.app.taxonomy?.issues.length
  )
    return [];
  const fields = mapping.nameFields ?? {};
  const covered = row.differences.every((difference) => {
    const rule = fields[difference.appField];
    if (!rule || rule.reference !== difference.field) return false;
    const value =
      rule.normalization === "integer" &&
      typeof difference.app === "string" &&
      /^-?\d+$/.test(difference.app)
        ? Number(difference.app)
        : ["colorName", "colorFamily"].includes(difference.appField) &&
            difference.field === "colorFamily"
          ? colorFamilyId(difference.app, reference)
          : difference.app;
    return same(value, difference.reference);
  });
  if (!covered) return [];
  return gaps.flatMap((gap) => {
    if (
      !gap.rfc.link ||
      !["drafted", "submitted", "accepted"].includes(gap.rfc.status) ||
      !gap.expected.some(
        (pair) =>
          pair.app === row.app?.id && pair.reference === row.reference.id,
      )
    )
      return [];
    return [
      {
        id: gap.id,
        link: gap.rfc.link,
        accepted:
          gap.rfc.status === "accepted" &&
          gap.profile === "reference-checkout" &&
          gap.expected.some(
            (pair) =>
              pair.app === row.app?.id &&
              pair.reference === row.reference.id &&
              pair.nameFields !== undefined &&
              same(pair.nameFields, fields),
          ) &&
          gap.revision === reference.source.revision &&
          reference.source.dirty === false &&
          gap.blockers.length === 0 &&
          gap.criteria.every(
            (criterion) =>
              criterion.check !== "manual" ||
              criterion.reviewedRevision === reference.source.revision,
          ),
      },
    ];
  });
}

export function assessPalette(
  app: AnalysisInput,
  reference: AnalysisInput,
  mappings: readonly ReviewedMapping[],
  gaps: readonly GapEntry[] = gapRegisterLoadIssues.length
    ? []
    : gapRegister.gaps,
): PaletteAssessment {
  mappings = [
    ...mappings,
    ...paletteLabelMappings(app, reference).filter(
      (candidate) =>
        !mappings.some(
          (mapping) =>
            mapping.app === candidate.app ||
            mapping.reference === candidate.reference,
        ),
    ),
  ];
  const keys = modeKeys(app, reference);
  const inventory = reference.records.filter(
    (row) => row.category === "tokens" && row.source === paletteSource,
  );
  const excluded = inventory.flatMap((row) =>
    row.lifecycle?.deprecatedIn
      ? [{ id: row.id, reason: `Deprecated in ${row.lifecycle.deprecatedIn}.` }]
      : [],
  );
  const eligible = inventory.filter((row) => !row.lifecycle?.deprecatedIn);
  const appRows = app.records.filter(
    (row) =>
      row.category === "tokens" &&
      row.classification === "generated" &&
      row.structuredName?.property === "color" &&
      !["colorRole", "component", "anatomy"].some(
        (key) => row.structuredName?.[key] !== undefined,
      ),
  );
  const contexts = new Map(
    [...appRows, ...eligible].map((row) => [
      row,
      contextFor(row, appRows.includes(row) ? app : reference, keys),
    ]),
  );
  const candidates = new Map(
    eligible.map((right) => [
      right,
      appRows.filter((left) => {
        const mapped = mappings.some(
          (mapping) =>
            mapping.app === left.id && mapping.reference === right.id,
        );
        const identity =
          left.identity !== undefined && left.identity === right.identity;
        const a = left.structuredName;
        const b = right.structuredName;
        const classified =
          a?.property === b?.property &&
          typeof a?.colorFamily === "string" &&
          a.colorFamily === b?.colorFamily &&
          typeof a.scaleIndex === "number" &&
          a.scaleIndex === b?.scaleIndex;
        if (mapped || identity) return true;
        return (
          classified &&
          same(contexts.get(left)?.context, contexts.get(right)?.context)
        );
      }),
    ]),
  );
  const selected = new Set<AnalysisRecord>();
  const assessments = eligible.map((right): PaletteModeAssessment => {
    const options = candidates.get(right)!;
    const left = options.length === 1 ? options[0] : undefined;
    const duplicated =
      reference.records.filter((row) => row.id === right.id).length !== 1 ||
      (right.identity !== undefined &&
        eligible.filter((row) => row.identity === right.identity).length !==
          1) ||
      (left !== undefined &&
        (app.records.filter((row) => row.id === left.id).length !== 1 ||
          (left.identity !== undefined &&
            appRows.filter((row) => row.identity === left.identity).length !==
              1) ||
          [...candidates.values()].filter((rows) => rows.includes(left))
            .length !== 1));
    const mapping = left
      ? mappings.filter(
          (item) => item.app === left.id && item.reference === right.id,
        )
      : [];
    const ambiguous = duplicated || options.length > 1 || mapping.length > 1;
    const row: PaletteModeAssessment = {
      reference: right,
      context: contexts.get(right)!.context,
      counterpart: ambiguous
        ? "ambiguous"
        : left
          ? "represented"
          : "not matched",
      classification: "unassessable",
      differences: [],
      exceptions: [],
      issues: [
        ...contexts.get(right)!.issues,
        ...classificationIssues(right, reference),
      ],
      value: "unassessable",
      valueAlignment: "unassessable",
    };
    if (!left || ambiguous) {
      row.issues.push(
        ambiguous
          ? "Multiple identities or counterparts; none selected."
          : "No unique generated counterpart.",
      );
      return row;
    }
    selected.add(left);
    row.app = left;
    if (mapping[0])
      row.mapping = {
        rationale: mapping[0].rationale,
        nameFields: mapping[0].nameFields,
      };
    row.differences = differencesFor(left, right, keys, mapping[0]);
    row.exceptions = exceptionFor(row, mapping[0], reference, gaps);
    const leftContext = contexts.get(left)!;
    row.issues.push(...leftContext.issues);
    if (!same(leftContext.context, row.context))
      row.issues.push("App and reference mode contexts differ.");
    const appIssues = classificationIssues(left, reference);
    row.classification = row.issues.length
      ? "unassessable"
      : !row.differences.length && !appIssues.length
        ? "aligned"
        : row.exceptions.some((exception) => exception.accepted)
          ? "accepted exception"
          : row.exceptions.length
            ? "proposed exception"
            : "different";
    row.issues.push(...appIssues);
    const hasContextIssue =
      leftContext.issues.length > 0 ||
      contexts.get(right)!.issues.length > 0 ||
      !same(leftContext.context, row.context);
    if (
      hasContextIssue ||
      left.reference ||
      right.reference ||
      left.unit !== undefined ||
      right.unit !== undefined
    ) {
      row.valueReason = hasContextIssue
        ? "Mode context is unavailable or different."
        : left.unit !== undefined || right.unit !== undefined
          ? "Color values cannot carry dimension units."
          : "Alias resolution is outside the primitive palette comparison.";
    } else {
      Object.assign(row, exactPaletteColor(left.value, right.value));
    }
    return row;
  });
  const grouped = new Map<string, PaletteModeAssessment[]>();
  const appConceptTargets = new Map<string, Set<string>>();
  for (const row of assessments) {
    const id = row.reference.conceptId ?? `unconfirmed:${row.reference.id}`;
    grouped.set(id, [...(grouped.get(id) ?? []), row]);
    if (row.app?.conceptId) {
      const targets =
        appConceptTargets.get(row.app.conceptId) ?? new Set<string>();
      targets.add(id);
      appConceptTargets.set(row.app.conceptId, targets);
    }
  }
  const concepts = [...grouped]
    .map(([id, rows]): PaletteConceptAssessment => {
      rows.sort((a, b) =>
        canonicalJson([a.context, a.reference.id]).localeCompare(
          canonicalJson([b.context, b.reference.id]),
          "en",
        ),
      );
      const name = rows[0].reference.structuredName;
      const family =
        typeof name?.colorFamily === "string"
          ? name.colorFamily
          : "Unclassified";
      const identityCertain =
        rows.every((row) =>
          Boolean(row.reference.conceptId && row.reference.identity),
        ) &&
        rows.every(
          (row) =>
            !row.app ||
            Boolean(
              row.app.conceptId &&
              row.app.identity &&
              appConceptTargets.get(row.app.conceptId)?.size === 1,
            ),
        ) &&
        rows.every((row) =>
          same(
            Object.fromEntries(
              Object.entries(row.reference.structuredName ?? {}).filter(
                ([key]) => !keys.includes(key),
              ),
            ),
            Object.fromEntries(
              Object.entries(name ?? {}).filter(([key]) => !keys.includes(key)),
            ),
          ),
        ) &&
        new Set(rows.map((row) => canonicalJson(row.context))).size ===
          rows.length &&
        new Set(
          rows.flatMap((row) =>
            row.app?.conceptId ? [row.app.conceptId] : [],
          ),
        ).size <= 1;
      const classificationsAligned = rows.every((row) =>
        ["aligned", "accepted exception"].includes(row.classification),
      );
      const comparable =
        identityCertain &&
        rows.every(
          (row) =>
            row.counterpart === "represented" &&
            row.valueAlignment !== "unassessable",
        );
      const alignment: PaletteAlignment =
        !identityCertain ||
        rows.some((row) => row.counterpart === "ambiguous") ||
        rows.some(
          (row) =>
            row.counterpart === "represented" &&
            row.valueAlignment === "unassessable",
        )
          ? "unassessable"
          : !comparable ||
              !classificationsAligned ||
              rows.some((row) => row.valueAlignment === "different")
            ? "different"
            : rows.some((row) => row.valueAlignment === "close")
              ? "close"
              : "exact";
      return {
        id,
        label: `${family}-${name?.scaleIndex ?? "unknown"}`,
        family,
        alignment,
        identityCertain,
        represented:
          identityCertain &&
          rows.some((row) => row.counterpart === "represented"),
        complete:
          identityCertain &&
          rows.every(
            (row) =>
              row.counterpart === "represented" &&
              ["aligned", "accepted exception"].includes(row.classification) &&
              row.value === "equal",
          ),
        rows,
      };
    })
    .sort((a, b) =>
      `${a.family === "gray" ? "0" : "1"}:${a.label}:${a.id}`.localeCompare(
        `${b.family === "gray" ? "0" : "1"}:${b.label}:${b.id}`,
        "en",
        { numeric: true },
      ),
    );
  const completeInventory = [app, reference].every(
    (input) => input.inventoryStatus === "complete",
  );
  const referenceContractAvailable = eligible.every(
    (row) =>
      contexts.get(row)!.issues.length === 0 &&
      classificationIssues(row, reference).length === 0,
  );
  const issues = [
    ...(!completeInventory
      ? [
          "Complete inventories are required for an official completion percentage.",
        ]
      : []),
    ...(!concepts.length
      ? ["No eligible primitive palette concepts were found."]
      : []),
    ...(!referenceContractAvailable
      ? [
          "Some reference classifications or mode declarations cannot be assessed.",
        ]
      : []),
    ...(concepts.some((concept) => !concept.identityCertain)
      ? [
          "Some concept identities are unconfirmed; their rows cannot establish completion.",
        ]
      : []),
  ];
  const appOnly = appRows
    .filter(
      (row) =>
        !selected.has(row) &&
        ![...candidates.values()].some((rows) => rows.includes(row)),
    )
    .sort((a, b) => a.id.localeCompare(b.id, "en"));
  const complete = concepts.filter((concept) => concept.complete).length;
  return {
    schemaVersion: 1,
    scope: "primitive-palette",
    baseline:
      app.source.kind === "defaults" ? "shipped defaults" : "provisional",
    freshness: "current",
    assessable:
      completeInventory &&
      referenceContractAvailable &&
      concepts.length > 0 &&
      concepts.every((concept) => concept.identityCertain),
    policy: {
      comparison: "normalized XYZ D65 and alpha",
      conversionRoundoff: roundoff,
      perceptualTolerance: 0,
      maxSrgbChannelDifference,
      alphaTolerance: 0,
    },
    sources: { app: app.source, reference: reference.source },
    counts: {
      concepts: concepts.length,
      represented: concepts.filter((concept) => concept.represented).length,
      classificationAligned: concepts.filter(
        (concept) =>
          concept.identityCertain &&
          concept.rows.every((row) =>
            ["aligned", "accepted exception"].includes(row.classification),
          ),
      ).length,
      complete,
      rows: assessments.length,
      equalRows: assessments.filter((row) => row.value === "equal").length,
      closeRows: assessments.filter((row) => row.valueAlignment === "close")
        .length,
      exactAligned: concepts.filter((concept) => concept.alignment === "exact")
        .length,
      closeEnough: concepts.filter((concept) => concept.alignment === "close")
        .length,
      notAligned: concepts.filter(
        (concept) => concept.alignment === "different",
      ).length,
      unassessable: concepts.filter(
        (concept) => concept.alignment === "unassessable",
      ).length,
      excludedDeprecated: excluded.length,
      appOnlyRows: appOnly.length,
    },
    completionPercent:
      completeInventory &&
      referenceContractAvailable &&
      concepts.length > 0 &&
      concepts.every((concept) => concept.identityCertain)
        ? (complete / concepts.length) * 100
        : null,
    concepts,
    excluded: excluded.sort((a, b) => a.id.localeCompare(b.id, "en")),
    appOnly,
    issues,
  };
}

export function paletteMarkdown(palette: PaletteAssessment): string {
  const text = (value: unknown) =>
    String(typeof value === "string" ? value : canonicalJson(value ?? null))
      .replaceAll("|", "\\|")
      .replaceAll("\n", " ");
  const counts = palette.counts;
  return [
    "## Primitive palette comparison",
    "",
    `Baseline: ${palette.baseline}. Freshness: ${palette.freshness}. Scope: non-deprecated primitive palette records, not all tokens.`,
    `Represented concepts: ${counts.represented}/${counts.concepts}. Classification aligned: ${counts.classificationAligned}/${counts.concepts}. Complete: ${counts.complete}/${counts.concepts}. Completion: ${palette.completionPercent === null ? "unavailable" : `${palette.completionPercent}%`}.`,
    `Exact mode values: ${counts.equalRows}/${counts.rows}. Deprecated rows excluded: ${counts.excludedDeprecated}. App-only rows: ${counts.appOnlyRows}.`,
    `Alignment tiers: 100% aligned: ${counts.exactAligned}. Close enough: ${counts.closeEnough}. Not aligned: ${counts.notAligned}. Unable to evaluate: ${counts.unassessable}. Close-enough mode values: ${counts.closeRows}/${counts.rows}.`,
    `Exact equality uses ${palette.policy.comparison}; conversion round-off allowance ${palette.policy.conversionRoundoff}, relative to max(1, channel magnitude). No perceptual tolerance, quantization or gamut mapping. Delta E is informational.`,
    `Close enough permits at most ${palette.policy.maxSrgbChannelDifference} per R, G and B channel on the 0–255 sRGB scale, without rounding or clipping. Alpha must match. Classifications and every required mode must still align. Exact completion remains separate.`,
    ...palette.issues.map((issue) => `- ${text(issue)}`),
    "",
    "| Concept | Context | Counterpart | Classification | App value | Reference value | Exact value | Value alignment | Differences and evidence |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...palette.concepts.flatMap((concept) =>
      concept.rows.map(
        (row) =>
          `| ${text(concept.label)} | ${text(row.context)} | ${row.counterpart} | ${row.classification} | ${text(row.app?.value)} | ${text(row.reference.value)} | ${row.value} | ${paletteAlignmentLabel(row.valueAlignment)} | ${text({ identityCertain: concept.identityCertain, differences: row.differences, mapping: row.mapping, issues: row.issues, exceptions: row.exceptions, valueReason: row.valueReason, deltaE2000: row.deltaE2000, rgbChannelDifferences: row.rgbChannelDifferences, app: row.app ? `${row.app.source}${row.app.pointer}` : null, reference: `${row.reference.source}${row.reference.pointer}`, referenceUuid: row.reference.identity, overrides: row.app?.overrides })} |`,
      ),
    ),
    "",
    ...palette.excluded.map(
      (row) => `- Excluded ${text(row.id)}: ${text(row.reason)}`,
    ),
    ...palette.appOnly.map(
      (row) => `- App only: ${text(row.id)} (${text(row.structuredName)}).`,
    ),
    "",
  ].join("\n");
}
