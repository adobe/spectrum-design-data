// Copyright 2026 Adobe. All rights reserved.
import type {
  AnalysisInput,
  AnalysisFinding,
  AnalysisRecord,
  ReviewedMapping,
} from "./comparison";
import { canonicalJson } from "./canonicalJson";
import { declaredDefaultMode } from "./mappings";
import { COLOR_ALIGNMENT_POLICY, exactPaletteColor } from "./paletteAssessment";
import {
  assessModeCoverage,
  modeDeclarations,
  type ModeCoverage,
} from "./modeCoverage";
import {
  summarizeModeResults,
  modeResultsMarkdown,
  type ModeResultSummary,
} from "./modeResults";
import {
  foundationValueType,
  foundationProperty,
  compareFoundationValue,
  differenceText,
  type FoundationValueType,
  type ScalarValue,
} from "./foundationValues";
import {
  buildTokenInventory,
  inventoryTokenLabel,
  isInventoryToken,
  isDeprecatedInventoryToken,
  tokenInventoryMarkdown,
  type TokenInventory,
} from "./tokenInventory";

export type ValueVerdict = "pass" | "acceptable" | "fail" | "unassessable";
export type ValueContext = Record<string, string>;
export const VALUE_CONTEXT_POLICY = "reference-required-token-inventory-v4";
export interface ResolvedModeValue {
  selectedId?: string;
  label?: string;
  id: string;
  context: ValueContext;
  value: unknown;
  chain: string[];
  issue: string | null;
}
export interface ColorOpacityRow {
  candidateIds?: string[];
  deltaE2000?: number;
  difference?: ScalarValue;
  id: string;
  context: ValueContext;
  appContext?: ValueContext;
  modeFailures?: string[];
  app?: AnalysisRecord;
  reference: AnalysisRecord;
  appValue?: unknown;
  referenceValue?: unknown;
  verdict: ValueVerdict;
  issues: string[];
  appChain: string[];
  referenceChain: string[];
}
export interface ClassificationDifference {
  field: string;
  app?: unknown;
  reference?: unknown;
}
export interface ColorOpacityConcept {
  id: string;
  label: string;
  type: FoundationValueType;
  family?: string;
  verdict: ValueVerdict;
  differences: ClassificationDifference[];
  rows: ColorOpacityRow[];
}
export interface ColorOpacityAssessment {
  inventory?: TokenInventory;
  modeBreakdown: ModeResultSummary[];
  colorPolicy: typeof COLOR_ALIGNMENT_POLICY;
  modeCoverage: ModeCoverage;
  enhancements: ColorOpacityEnhancement[];
  resolution: {
    app?: AnalysisInput["valueResolution"];
    reference?: AnalysisInput["valueResolution"];
  };
  schemaVersion: 4;
  scope: "foundation-tokens";
  concepts: ColorOpacityConcept[];
  counts: Record<ValueVerdict, number> & {
    concepts: number;
    rows: number;
    excludedDeprecated: number;
    sourceRows: number;
    appOnlyRows: number;
  };
  exactPercent: number | null;
  acceptablePercent: number | null;
  excluded: string[];
  appOnly: string[];
  issues: string[];
}
export interface ColorOpacityEnhancement {
  id: string;
  conceptId: string;
  label: string;
  type: FoundationValueType;
  context: ValueContext;
  app?: AnalysisRecord;
  value: unknown;
  reason: string;
  issue: string | null;
}
export const verdictLabel: Record<ValueVerdict, string> = {
  pass: "Pass",
  acceptable: "Acceptable",
  fail: "Fail",
  unassessable: "Unable to evaluate",
};
export const valueContextKey = (context: ValueContext) =>
  canonicalJson(context);
export const resolutionKey = (id: string, context: ValueContext) =>
  canonicalJson([id, context]);
export const isValueToken = (row: AnalysisRecord) =>
  row.category === "tokens" && foundationValueType(row) !== undefined;

const contextIndexes = new WeakMap<
  AnalysisRecord[],
  {
    axes: string[];
    targets: Map<string, AnalysisRecord[]>;
    contexts: Map<string, ValueContext[]>;
  }
>();
function contextIndex(input: AnalysisInput) {
  let index = contextIndexes.get(input.records);
  if (!index) {
    const targets = new Map<string, AnalysisRecord[]>();
    for (const row of input.records.filter((row) =>
      ["tokens", "compatibility-aliases"].includes(row.category),
    )) {
      for (const id of new Set([row.id, row.identity, row.conceptId]))
        if (id) {
          const entries = targets.get(id) ?? [];
          entries.push(row);
          targets.set(id, entries);
        }
    }
    index = { axes: modeAxes(input), targets, contexts: new Map() };
    contextIndexes.set(input.records, index);
  }
  return index;
}
const resolvedIndexes = new WeakMap<
  ResolvedModeValue[],
  Map<string, ResolvedModeValue>
>();
function resolvedValue(
  input: AnalysisInput,
  id: string,
  context: ValueContext,
) {
  if (!input.resolvedValues) return;
  let index = resolvedIndexes.get(input.resolvedValues);
  if (!index) {
    index = new Map(
      input.resolvedValues.map((row) => [
        resolutionKey(row.id, row.context),
        row,
      ]),
    );
    resolvedIndexes.set(input.resolvedValues, index);
  }
  return index.get(resolutionKey(id, context));
}

export function modeAxes(input: AnalysisInput): string[] {
  return [
    ...new Set(
      modeDeclarations(input)
        .map((declaration) => declaration.key)
        .filter(Boolean),
    ),
  ].sort();
}

/** Only token/dependency axes are expanded, not unrelated adaptive controls. */
export function requiredValueContexts(
  row: AnalysisRecord,
  input: AnalysisInput,
): ValueContext[] {
  const index = contextIndex(input);
  const cached = index.contexts.get(row.id);
  if (cached) return cached;
  const axes = index.axes;
  const visited = new Set<string>();
  const modes = new Map<string, Set<string>>();
  function visit(record: AnalysisRecord) {
    if (visited.has(record.id)) return;
    visited.add(record.id);
    for (const axis of axes) {
      const value = record.context?.[axis] ?? record.structuredName?.[axis];
      const entries =
        typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
      if (entries.length) {
        const set = modes.get(axis) ?? new Set<string>();
        for (const entry of entries)
          if (typeof entry === "string") set.add(entry);
        modes.set(axis, set);
      }
    }
    if (record.conceptId)
      for (const sibling of index.targets.get(record.conceptId) ?? [])
        visit(sibling);
    if (record.reference)
      for (const target of index.targets.get(record.reference) ?? [])
        visit(target);
  }
  visit(row);
  let contexts: ValueContext[] = [{}];
  for (const [axis, values] of [...modes].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const defaultMode = declaredDefaultMode(input, axis);
    if (defaultMode) values.add(defaultMode);
    contexts = contexts.flatMap((context) =>
      [...values].sort().map((value) => ({ ...context, [axis]: value })),
    );
  }
  const result = contexts.filter((context) =>
    contextMatches(row, context, input, false),
  );
  index.contexts.set(row.id, result);
  return result;
}

export function contextMatches(
  row: AnalysisRecord,
  context: ValueContext,
  input: AnalysisInput,
  omittedDefault = true,
) {
  return Object.entries(context).every(([axis, value]) => {
    const explicit = row.context?.[axis] ?? row.structuredName?.[axis];
    if (explicit === undefined)
      return (
        !omittedDefault ||
        Boolean(row.reference) ||
        declaredDefaultMode(input, axis) === value
      );
    return (
      explicit === value ||
      (Array.isArray(explicit) && explicit.includes(value))
    );
  });
}

function mostSpecificRows(rows: AnalysisRecord[], axes: readonly string[]) {
  const specificity = (row: AnalysisRecord) =>
    axes.filter(
      (axis) =>
        row.context?.[axis] !== undefined ||
        row.structuredName?.[axis] !== undefined,
    ).length;
  const maximum = Math.max(-1, ...rows.map(specificity));
  return rows.filter((row) => specificity(row) === maximum);
}

function declaredAxisModes(input: AnalysisInput, axis: string): string[] {
  const declarations = modeDeclarations(input).filter(
    (declaration) => declaration.key === axis,
  );
  return declarations.length === 1 ? declarations[0].modes : [];
}

function declaredContextVariants(input: AnalysisInput): ValueContext[] {
  let contexts: ValueContext[] = [{}];
  for (const axis of modeAxes(input)) {
    contexts = contexts.flatMap((context) => [
      context,
      ...declaredAxisModes(input, axis).map((mode) => ({
        ...context,
        [axis]: mode,
      })),
    ]);
    if (contexts.length > 256)
      throw new Error(
        "Value resolution exceeds 256 declared context combinations.",
      );
  }
  return contexts;
}

function comparisonContexts(
  row: AnalysisRecord,
  reference: AnalysisInput,
  counterparts: AnalysisRecord[],
  app: AnalysisInput,
  coverage: ModeCoverage,
): ValueContext[] {
  let contexts = requiredValueContexts(row, reference);
  for (const axis of modeAxes(reference)) {
    const appAxis =
      coverage.sets.find((set) => set.reference?.key === axis)?.app?.key ??
      axis;
    if (
      !counterparts.some((left) =>
        requiredValueContexts(left, app).some(
          (context) => context[appAxis] !== undefined,
        ),
      )
    )
      continue;
    contexts = contexts.flatMap((context) =>
      context[axis] !== undefined
        ? [context]
        : [
            {
              ...context,
              ...(declaredDefaultMode(reference, axis)
                ? { [axis]: declaredDefaultMode(reference, axis)! }
                : {}),
            },
          ],
    );
  }
  return contexts;
}

function appValueContext(
  context: ValueContext,
  counterparts: AnalysisRecord[],
  app: AnalysisInput,
  coverage: ModeCoverage,
): { context: ValueContext; failures: string[]; issues: string[] } {
  const translated: ValueContext = {};
  const failures: string[] = [],
    issues: string[] = [];
  for (const [axis, mode] of Object.entries(context)) {
    const set = coverage.sets.find((set) => set.reference?.key === axis);
    const pair = set?.modes.find((pair) => pair.reference === mode);
    if (set?.result === "fail" && !set.app) failures.push(set.id);
    else if (pair?.result === "fail") failures.push(pair.id);
    else if (
      !set?.app ||
      set.issues.length ||
      !pair?.app ||
      pair.result === "unassessable"
    )
      issues.push(`Mode mapping is unavailable for ${axis}: ${mode}.`);
    else translated[set.app.key] = pair.app;
  }
  for (const axis of modeAxes(app)) {
    if (translated[axis] !== undefined) continue;
    if (
      !counterparts.some((row) =>
        requiredValueContexts(row, app).some(
          (context) => context[axis] !== undefined,
        ),
      )
    )
      continue;
    const shared = coverage.sets.find(
      (set) => set.app?.key === axis && set.reference,
    );
    const mode = shared?.modes.find(
      (pair) => pair.reference === shared.reference?.default,
    );
    const defaultMode = shared ? mode?.app : declaredDefaultMode(app, axis);
    if (!defaultMode) issues.push(`No valid baseline mode for ${axis}.`);
    else translated[axis] = defaultMode;
  }
  return { context: translated, failures: [...new Set(failures)], issues };
}

export function resolutionRequests(
  input: AnalysisInput,
  reference?: AnalysisInput,
) {
  const extraContexts = reference
    ? [...declaredContextVariants(input), ...declaredContextVariants(reference)]
    : input.source.kind === "reference"
      ? declaredContextVariants(input)
      : [];
  const queries = input.records.filter(isInventoryToken).flatMap((row) =>
    [
      ...new Map(
        [...requiredValueContexts(row, input), ...extraContexts]
          .filter((context) => contextMatches(row, context, input, false))
          .map((context) => [valueContextKey(context), context]),
      ).values(),
    ].map((context) => ({
      id: row.id,
      context,
      selectConcept: true,
    })),
  );
  return {
    modeSets: modeAxes(input).map((axis) => {
      const declaration = input.records.find(
        (row) =>
          row.category === "mode-sets" &&
          row.value &&
          typeof row.value === "object" &&
          ((row.value as Record<string, unknown>).name === axis ||
            (row.value as Record<string, unknown>).key === axis),
      );
      const rawModes = (
        declaration?.value as Record<string, unknown> | undefined
      )?.modes;
      const modes = Array.isArray(rawModes)
        ? rawModes.flatMap((mode: unknown) =>
            typeof mode === "string"
              ? [mode]
              : mode &&
                  typeof mode === "object" &&
                  "key" in mode &&
                  typeof mode.key === "string"
                ? [mode.key]
                : [],
          )
        : [];
      const defaultMode = declaredDefaultMode(input, axis);
      if (!defaultMode || !modes.includes(defaultMode))
        throw new Error(`Mode axis ${axis} has no valid declared default.`);
      return { name: axis, modes, default: defaultMode };
    }),
    records: input.records
      .filter((row) =>
        ["tokens", "compatibility-aliases"].includes(row.category),
      )
      .map((row) => ({
        id: row.id,
        source: row.source,
        raw: {
          name: { ...row.structuredName, ...row.context },
          uuid: row.identity ?? row.id,
          ...(row.conceptId && { conceptId: row.conceptId }),
          ...(row.reference ? { $ref: row.reference } : { value: row.value }),
        },
      })),
    queries,
  };
}

function classification(
  row: AnalysisRecord,
  vocabulary: AnalysisRecord[],
  axes: string[],
) {
  return Object.fromEntries(
    Object.entries(row.structuredName ?? {})
      .filter(([key]) => !axes.includes(key) && key !== "legacyKey")
      .map(([key, value]) => {
        if (typeof value === "string") {
          const candidates = vocabulary.filter((record) => {
            const entry = record.value as Record<string, unknown>;
            return entry.id === value || entry.label === value;
          });
          if (candidates.length === 1)
            value = (candidates[0].value as Record<string, unknown>).id;
        }
        return [key, Array.isArray(value) ? [...value].sort() : value];
      }),
  );
}

export function normalizedOpacity(value: unknown): number | undefined {
  const text = typeof value === "string" ? value.trim() : undefined;
  if (
    text !== undefined &&
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?:%)?$/.test(text)
  )
    return;
  const number =
    typeof value === "number"
      ? value
      : text === undefined
        ? Number.NaN
        : Number(text.replace(/%$/, "")) / (text.endsWith("%") ? 100 : 1);
  return Number.isFinite(number) && number >= 0 && number <= 1
    ? number
    : undefined;
}

export function aggregateVerdicts(
  verdicts: readonly ValueVerdict[],
): ValueVerdict {
  if (verdicts.includes("fail")) return "fail";
  if (!verdicts.length || verdicts.includes("unassessable"))
    return "unassessable";
  return verdicts.includes("acceptable") ? "acceptable" : "pass";
}

function effectiveValue(
  row: AnalysisRecord,
  context: ValueContext,
  input: AnalysisInput,
) {
  if (
    input.valueResolution &&
    input.valueResolution.datasetHash !== input.source.hash
  )
    return {
      id: row.id,
      context,
      value: undefined,
      chain: [],
      issue: "Resolved value evidence belongs to an older dataset.",
    };
  const resolved = resolvedValue(input, row.id, context);
  if (resolved) return resolved;
  if (!row.reference && row.value !== undefined)
    return {
      id: row.id,
      context,
      value: row.value,
      chain: [row.id],
      issue: null,
    };
  return {
    id: row.id,
    context,
    value: undefined,
    chain: [],
    issue: "Mode-aware alias resolution is unavailable.",
  };
}

function contextIssues(row: AnalysisRecord, input: AnalysisInput): string[] {
  return Object.entries(row.context ?? {}).flatMap(([axis, value]) => {
    const declarations = input.records.filter(
      (record) =>
        record.category === "mode-sets" &&
        record.value &&
        typeof record.value === "object" &&
        ((record.value as Record<string, unknown>).name === axis ||
          (record.value as Record<string, unknown>).key === axis),
    );
    if (declarations.length !== 1)
      return [`Mode axis ${axis} has no unique declaration.`];
    const modes = (declarations[0].value as Record<string, unknown>).modes;
    const allowed = Array.isArray(modes)
      ? modes.flatMap((mode: unknown) =>
          typeof mode === "string"
            ? [mode]
            : mode &&
                typeof mode === "object" &&
                "key" in mode &&
                typeof mode.key === "string"
              ? [mode.key]
              : [],
        )
      : [];
    return (typeof value === "string" ? [value] : value)
      .filter((mode) => !allowed.includes(mode))
      .map((mode) => `Mode ${axis}: ${mode} is not declared.`);
  });
}

export function assessColorsAndOpacities(
  app: AnalysisInput,
  reference: AnalysisInput,
  mappings: readonly ReviewedMapping[] = [],
  modeCoverage = assessModeCoverage(app, reference, mappings),
  findings: readonly AnalysisFinding[] = [],
): ColorOpacityAssessment {
  const inventory = reference.records.filter(isValueToken);
  const eligible = inventory.filter((row) => !isDeprecatedInventoryToken(row));
  const appRows = app.records
    .filter(isValueToken)
    .filter((row) => !isDeprecatedInventoryToken(row));
  const axes = [...new Set([...modeAxes(app), ...modeAxes(reference)])];
  const vocabulary = reference.records.filter(
    (row) =>
      row.category === "registry" && row.value && typeof row.value === "object",
  );
  const appNames = new Map(
    appRows.map((row) => [row.id, classification(row, vocabulary, axes)]),
  );
  const nameIndex = new Map<string, AnalysisRecord[]>();
  const identityIndex = new Map<string, AnalysisRecord[]>();
  const conceptIndex = new Map<string, AnalysisRecord[]>();
  const appById = new Map(appRows.map((row) => [row.id, row]));
  for (const row of appRows) {
    if (row.conceptId)
      conceptIndex.set(row.conceptId, [
        ...(conceptIndex.get(row.conceptId) ?? []),
        row,
      ]);
    const key = canonicalJson(appNames.get(row.id));
    nameIndex.set(key, [...(nameIndex.get(key) ?? []), row]);
    if (row.identity)
      identityIndex.set(row.identity, [
        ...(identityIndex.get(row.identity) ?? []),
        row,
      ]);
  }
  const selected = new Set<string>();
  const grouped = new Map<string, ColorOpacityConcept>();
  const conceptCandidates = new Map<string, Map<string, AnalysisRecord>>();
  const baselineContexts = new Map<string, Set<string>>();
  const uncertainRequirements = new Set<string>();
  for (const right of eligible) {
    const id = right.conceptId ?? right.identity ?? right.id;
    const name = classification(right, vocabulary, axes);
    const concept = grouped.get(id) ?? {
      id,
      label:
        reference.resolvedValues?.find((row) => row.id === right.id)?.label ??
        (inventoryTokenLabel(right).startsWith("{")
          ? Object.entries(name)
              .map(([key, value]) =>
                key === "property"
                  ? value
                  : Array.isArray(value)
                    ? value.join("-")
                    : value,
              )
              .join("-")
          : inventoryTokenLabel(right)),
      type: foundationValueType(right)!,
      family:
        typeof name.colorFamily === "string" ? name.colorFamily : undefined,
      verdict: "unassessable" as ValueVerdict,
      differences: [],
      rows: [],
    };
    grouped.set(id, concept);
    const mapped = mappings.filter((mapping) => mapping.reference === right.id);
    const mappedTypographyConcepts = new Set(
      mapped
        .filter((mapping) => mapping.kind === "typography-size")
        .flatMap((mapping) => appById.get(mapping.app)?.conceptId ?? []),
    );
    const sharedConcept = right.conceptId
      ? conceptIndex.get(right.conceptId)
      : undefined;
    const counterparts = sharedConcept ?? [
      ...new Map(
        [
          ...(right.identity ? (identityIndex.get(right.identity) ?? []) : []),
          ...(nameIndex.get(canonicalJson(name)) ?? []),
          ...mappings
            .filter((mapping) => mapping.reference === right.id)
            .flatMap((mapping) => {
              const row = appById.get(mapping.app);
              return row ? [row] : [];
            }),
          ...appRows.filter(
            (row) =>
              row.conceptId !== undefined &&
              mappedTypographyConcepts.has(row.conceptId),
          ),
        ].map((row) => [row.id, row]),
      ).values(),
    ];
    for (const counterpart of counterparts) selected.add(counterpart.id);
    const collected =
      conceptCandidates.get(id) ?? new Map<string, AnalysisRecord>();
    for (const counterpart of counterparts)
      collected.set(counterpart.id, counterpart);
    conceptCandidates.set(id, collected);
    for (const context of comparisonContexts(
      right,
      reference,
      counterparts,
      app,
      modeCoverage,
    )) {
      const selectedReference = resolvedValue(reference, right.id, context);
      if (
        selectedReference?.selectedId &&
        selectedReference.selectedId !== right.id
      )
        continue;
      const baseline = appValueContext(
        context,
        counterparts,
        app,
        modeCoverage,
      );
      const required = baselineContexts.get(id) ?? new Set<string>();
      required.add(valueContextKey(baseline.context));
      baselineContexts.set(id, required);
      const options = counterparts.filter((left) => {
        if (!contextMatches(left, baseline.context, app, false)) return false;
        const winner = resolvedValue(app, left.id, baseline.context);
        return (
          !winner ||
          Boolean(winner.issue) ||
          !winner.selectedId ||
          winner.selectedId === left.id
        );
      });
      const matches = mostSpecificRows(options, axes);
      const left = matches.length === 1 ? matches[0] : undefined;
      const row: ColorOpacityRow = {
        id: resolutionKey(`${right.id}${right.pointer}`, context),
        context,
        appContext: baseline.context,
        modeFailures: baseline.failures,
        reference: right,
        app: left,
        candidateIds: matches.map((candidate) => candidate.id),
        verdict: "unassessable",
        issues: [...contextIssues(right, reference), ...baseline.issues],
        appChain: [],
        referenceChain: [],
      };
      const b = effectiveValue(right, context, reference);
      if (
        b.issue ||
        contextIssues(right, reference).length ||
        baseline.issues.length
      )
        uncertainRequirements.add(id);
      row.referenceValue = b.value;
      row.referenceChain = b.chain;
      if (b.issue) row.issues.push(b.issue);
      concept.rows.push(row);
      if (baseline.failures.length) {
        row.verdict = "fail";
        row.issues.push(
          `Required mode support is missing. See mode coverage: ${baseline.failures.join(", ")}.`,
        );
        continue;
      }
      if (!left) {
        row.verdict =
          !row.issues.length && counterparts.length && !options.length
            ? "fail"
            : "unassessable";
        row.issues.push(
          matches.length > 1
            ? "Multiple app counterparts; none selected."
            : counterparts.length
              ? "Required app mode value is unavailable."
              : "No confirmed app counterpart.",
        );
        continue;
      }
      selected.add(left.id);
      const leftName = appNames.get(left.id)!;
      const reviewedTypography = mapped.some(
        (mapping) =>
          mapping.kind === "typography-size" &&
          (mapping.app === left.id ||
            (left.conceptId !== undefined &&
              mappedTypographyConcepts.has(left.conceptId))),
      );
      for (const field of reviewedTypography
        ? []
        : new Set([...Object.keys(leftName), ...Object.keys(name)])) {
        if (
          canonicalJson(leftName[field] ?? null) !==
            canonicalJson(name[field] ?? null) &&
          !concept.differences.some((difference) => difference.field === field)
        )
          concept.differences.push({
            field,
            app: leftName[field],
            reference: name[field],
          });
      }
      const a = effectiveValue(left, baseline.context, app);
      row.appValue = a.value;
      row.referenceValue = b.value;
      row.appChain = a.chain;
      row.referenceChain = b.chain;
      row.issues.push(
        ...[
          a.issue,
          ...contextIssues(left, app),
          ...(left.taxonomy?.issues ?? []),
        ].filter((issue): issue is string => Boolean(issue)),
      );
      if (row.issues.length) continue;
      if (concept.type === "opacity") {
        const av = normalizedOpacity(a.value),
          bv = normalizedOpacity(b.value);
        if (av === undefined || bv === undefined)
          row.issues.push("Opacity must be a finite alpha from 0 to 1.");
        else row.verdict = av === bv ? "pass" : "fail";
        if (av !== undefined && bv !== undefined)
          row.difference = { value: av - bv, unit: "" };
      } else if (concept.type === "color") {
        const comparison = exactPaletteColor(a.value, b.value);
        row.deltaE2000 =
          comparison.deltaE2000 ??
          (comparison.valueAlignment === "exact" ? 0 : undefined);
        row.verdict = {
          exact: "pass",
          close: "acceptable",
          different: "fail",
          unassessable: "unassessable",
        }[comparison.valueAlignment] as ValueVerdict;
        if (comparison.valueReason && row.verdict !== "pass")
          row.issues.push(comparison.valueReason);
      } else {
        const result = compareFoundationValue(
          concept.type,
          a.value,
          b.value,
          left.unit,
          right.unit,
          foundationProperty(right),
        );
        row.verdict = result.verdict;
        row.difference = result.difference;
        if (result.issue) row.issues.push(result.issue);
      }
    }
  }
  const concepts = [...grouped.values()].sort((a, b) =>
    a.label.localeCompare(b.label),
  );
  const enhancements: ColorOpacityEnhancement[] = [];
  for (const concept of concepts) {
    if (
      uncertainRequirements.has(concept.id) ||
      reference.inventoryStatus !== "complete" ||
      reference.errors.length ||
      app.errors.length
    )
      continue;
    const counterparts = [
      ...(conceptCandidates.get(concept.id)?.values() ?? []),
    ];
    const contexts = new Map<string, ValueContext>();
    for (const counterpart of counterparts) {
      for (const context of requiredValueContexts(counterpart, app)) {
        const complete = { ...context };
        for (const axis of modeAxes(app)) {
          if (
            complete[axis] === undefined &&
            counterparts.some((row) =>
              requiredValueContexts(row, app).some(
                (context) => context[axis] !== undefined,
              ),
            )
          ) {
            const mode = declaredDefaultMode(app, axis);
            if (mode) complete[axis] = mode;
          }
        }
        contexts.set(valueContextKey(complete), complete);
      }
    }
    for (const [key, context] of contexts) {
      if (baselineContexts.get(concept.id)?.has(key)) continue;
      const declarationsValid = Object.entries(context).every(
        ([axis, mode]) => {
          const declaration = modeDeclarations(app).filter(
            (set) => set.key === axis,
          );
          const set = modeCoverage.sets.find((set) => set.app?.key === axis);
          return (
            declaration.length === 1 &&
            !declaration[0].issues.length &&
            declaration[0].modes.includes(mode) &&
            set &&
            set.result !== "unassessable" &&
            !set.modes.some(
              (pair) => pair.app === mode && pair.result === "unassessable",
            )
          );
        },
      );
      if (!declarationsValid) continue;
      const options = mostSpecificRows(
        counterparts.filter((row) => {
          if (!contextMatches(row, context, app, false)) return false;
          const winner = resolvedValue(app, row.id, context);
          return !winner?.selectedId || winner.selectedId === row.id;
        }),
        axes,
      );
      if (!options.length) continue;
      const row = options.length === 1 ? options[0] : undefined;
      const resolved = row
        ? effectiveValue(row, context, app)
        : {
            value: undefined,
            issue:
              "Multiple app value candidates; mode-aware resolution is unavailable.",
          };
      enhancements.push({
        id: resolutionKey(concept.id, context),
        conceptId: concept.id,
        label: concept.label,
        type: concept.type,
        context,
        app: row,
        value: resolved.value,
        issue: resolved.issue,
        reason:
          "Additional app token variant; not required by this reference token.",
      });
    }
  }
  for (const concept of concepts) {
    concept.verdict = aggregateVerdicts([
      ...concept.rows.map((row) => row.verdict),
      ...(concept.differences.length ? ["fail" as const] : []),
    ]);
    if (
      reference.inventoryStatus !== "complete" ||
      reference.errors.length ||
      app.errors.length ||
      app.inventoryStatus === "partial" ||
      app.inventoryStatus === "unavailable" ||
      reference.source.hash === "unavailable"
    )
      concept.verdict = "unassessable";
  }
  const counts = {
    pass: 0,
    acceptable: 0,
    fail: 0,
    unassessable: 0,
    concepts: concepts.length,
    rows: concepts.reduce((sum, concept) => sum + concept.rows.length, 0),
    sourceRows: eligible.length,
    excludedDeprecated: inventory.length - eligible.length,
    appOnlyRows: appRows.filter((row) => !selected.has(row.id)).length,
  };
  for (const concept of concepts) counts[concept.verdict]++;
  return {
    inventory: buildTokenInventory(
      app,
      reference,
      concepts,
      (record, input) => {
        const contexts = requiredValueContexts(record, input);
        return (contexts.length ? contexts : [{}]).map((context) => {
          const resolved = effectiveValue(record, context, input);
          return { context, value: resolved.value, issue: resolved.issue };
        });
      },
      findings,
    ),
    schemaVersion: 4,
    colorPolicy: COLOR_ALIGNMENT_POLICY,
    modeBreakdown: summarizeModeResults(
      concepts,
      reference.inventoryStatus === "complete" &&
        !reference.errors.length &&
        !app.errors.length,
    ),
    modeCoverage,
    enhancements,
    scope: "foundation-tokens",
    concepts,
    counts,
    resolution: {
      app: app.valueResolution,
      reference: reference.valueResolution,
    },
    exactPercent:
      counts.concepts &&
      reference.inventoryStatus === "complete" &&
      !reference.errors.length &&
      !app.errors.length &&
      app.inventoryStatus !== "partial" &&
      app.inventoryStatus !== "unavailable"
        ? (counts.pass / counts.concepts) * 100
        : null,
    acceptablePercent:
      counts.concepts &&
      reference.inventoryStatus === "complete" &&
      !reference.errors.length &&
      !app.errors.length &&
      app.inventoryStatus !== "partial" &&
      app.inventoryStatus !== "unavailable"
        ? ((counts.pass + counts.acceptable) / counts.concepts) * 100
        : null,
    excluded: inventory.filter(isDeprecatedInventoryToken).map((row) => row.id),
    appOnly: appRows
      .filter((row) => !selected.has(row.id))
      .map((row) => row.id),
    issues: [...app.limitations, ...reference.limitations],
  };
}

export function colorOpacityMarkdown(assessment: ColorOpacityAssessment) {
  const cell = (value: unknown) =>
    String(value ?? "Unavailable")
      .replaceAll("|", "\\|")
      .replaceAll("\n", " ");
  return [
    "## Tokens",
    "",
    ...(assessment.inventory
      ? [tokenInventoryMarkdown(assessment.inventory), ""]
      : []),
    `Resolution engines: app ${assessment.resolution.app?.engine ?? "unavailable"}; reference ${assessment.resolution.reference?.engine ?? "unavailable"}.`,
    "",
    `${assessment.counts.concepts} tokens; ${assessment.counts.rows} required mode values.`,
    `Non-exact colors are Acceptable when Delta E ${assessment.colorPolicy.deltaEMethod} is less than ${assessment.colorPolicy.acceptableDeltaEExclusive} and alpha matches. Opacity and other foundation values must match exactly after unit normalization. Numeric differences are App minus Design data.`,
    modeResultsMarkdown(assessment.modeBreakdown),
    "",
    "| Token | Mode | App value | Design data value | Difference | Value result | Token overview |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...assessment.concepts.flatMap((concept) =>
      concept.rows.map(
        (row) =>
          `| ${cell(concept.label)} | ${cell(
            Object.entries(row.context)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ") || "All modes",
          )} | ${cell(row.appValue)} | ${cell(row.referenceValue)} | ${cell(differenceText(row))} | ${verdictLabel[row.verdict]} | ${verdictLabel[concept.verdict]} |`,
      ),
    ),
    "",
    "### Token enhancements",
    "",
    "| Token | App mode | App value | Reason |",
    "| --- | --- | --- | --- |",
    ...assessment.enhancements.map(
      (row) =>
        `| ${cell(row.label)} | ${cell(
          Object.entries(row.context)
            .map(([key, mode]) => `${key}: ${mode}`)
            .join(", "),
        )} | ${cell(row.value)} | ${cell([row.reason, row.issue].filter(Boolean).join(" "))} |`,
    ),
    "",
    ...assessment.concepts.flatMap((concept) => [
      ...concept.differences.map(
        (difference) =>
          `- **${cell(concept.label)}**, ${cell(difference.field)}: App ${cell(canonicalJson(difference.app ?? null))} → Design data ${cell(canonicalJson(difference.reference ?? null))}.`,
      ),
      ...concept.rows.flatMap((row) => [
        ...row.issues.map(
          (issue) =>
            `- **${cell(concept.label)}** (${cell(valueContextKey(row.context))}): ${cell(issue)}`,
        ),
        ...(row.reference.reference || row.app?.reference
          ? [
              `- **${cell(concept.label)}**: App reference ${cell(row.app?.reference ?? "Literal")}; Design data reference ${cell(row.reference.reference ?? "Literal")}.`,
              `  App chain: ${cell(row.appChain.join(" → ") || "Unavailable")}. Design data chain: ${cell(row.referenceChain.join(" → ") || "Unavailable")}.`,
            ]
          : []),
      ]),
    ]),
    "",
  ].join("\n");
}
