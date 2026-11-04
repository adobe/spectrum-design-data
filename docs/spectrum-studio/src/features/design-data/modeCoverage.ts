// Copyright 2026 Adobe. All rights reserved.
import type {
  AnalysisInput,
  AnalysisRecord,
  ReviewedMapping,
} from "./comparison";
import { canonicalJson } from "./canonicalJson";

export type ModeSupport = "pass" | "fail" | "enhancement" | "unassessable";
export interface ModeDeclaration {
  key: string;
  modes: string[];
  default?: string;
  record: AnalysisRecord;
  issues: string[];
}
export interface ModePair {
  id: string;
  reference?: string;
  app?: string;
  result: ModeSupport;
  reason: string;
}
export interface ModeSetCoverage {
  id: string;
  reference?: ModeDeclaration;
  app?: ModeDeclaration;
  result: ModeSupport;
  evidence: string;
  confidence:
    | "exact-identity"
    | "canonical-key"
    | "reviewed-mapping"
    | "unassessable";
  issues: string[];
  modes: ModePair[];
}
export interface ModeCoverage {
  schemaVersion: 1;
  result: Exclude<ModeSupport, "enhancement">;
  sets: ModeSetCoverage[];
  counts: {
    requiredSets: number;
    requiredModes: number;
    missingSets: number;
    missingModes: number;
    enhancementSets: number;
    enhancementModes: number;
  };
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export function modeDeclaration(record: AnalysisRecord): ModeDeclaration {
  const value = object(record.value) ? record.value : {};
  const key = value.key ?? value.name;
  const raw = Array.isArray(value.modes) ? value.modes : [];
  const modes = raw.flatMap((mode: unknown) =>
    typeof mode === "string"
      ? [mode]
      : object(mode) && typeof mode.key === "string"
        ? [mode.key]
        : [],
  );
  const defaultMatches: unknown[] =
    typeof value.defaultModeId === "string"
      ? raw.filter(
          (mode: unknown) => object(mode) && mode.id === value.defaultModeId,
        )
      : [];
  const selected = defaultMatches.length === 1 ? defaultMatches[0] : undefined;
  const ids = raw.flatMap((mode: unknown) =>
    object(mode) && typeof mode.id === "string" ? [mode.id] : [],
  );
  const defaultMode =
    typeof value.default === "string"
      ? value.default
      : object(selected) && typeof selected.key === "string"
        ? selected.key
        : undefined;
  return {
    key: typeof key === "string" ? key : "",
    modes,
    default: defaultMode,
    record,
    issues: [
      ...(new Set(ids).size === ids.length
        ? []
        : ["Mode identities are duplicated."]),
      ...(typeof key === "string" && key.length
        ? []
        : ["Mode set has no canonical key."]),
      ...(raw.length &&
      raw.length === modes.length &&
      modes.every(Boolean) &&
      new Set(modes).size === modes.length
        ? []
        : ["Mode list is empty, invalid, or duplicated."]),
      ...(defaultMode && modes.includes(defaultMode)
        ? []
        : ["Mode set has no valid declared default."]),
    ],
  };
}

const declarationCache = new WeakMap<AnalysisRecord[], ModeDeclaration[]>();
export function modeDeclarations(input: AnalysisInput) {
  let declarations = declarationCache.get(input.records);
  if (!declarations) {
    declarations = input.records
      .filter((row) => row.category === "mode-sets")
      .map(modeDeclaration);
    declarationCache.set(input.records, declarations);
  }
  return declarations;
}

export function assessModeCoverage(
  app: AnalysisInput,
  reference: AnalysisInput,
  mappings: readonly ReviewedMapping[] = [],
): ModeCoverage {
  const left = modeDeclarations(app),
    right = modeDeclarations(reference);
  const complete = [app, reference].every(
    (input) =>
      (input.inventoryStatus ??
        (input.errors.length ? "partial" : "complete")) === "complete" &&
      !input.errors.length &&
      input.source.hash !== "unavailable",
  );
  const candidates = (target: ModeDeclaration) =>
    left.filter(
      (candidate) =>
        (target.key && candidate.key === target.key) ||
        (target.record.identity &&
          candidate.record.identity === target.record.identity) ||
        mappings.some(
          (mapping) =>
            mapping.app === candidate.record.id &&
            mapping.reference === target.record.id,
        ),
    );
  const selected = new Set<ModeDeclaration>();
  const sets: ModeSetCoverage[] = right.map((target) => {
    const options = candidates(target);
    options.forEach((candidate) => selected.add(candidate));
    const candidate = options.length === 1 ? options[0] : undefined;
    const ambiguous =
      options.length > 1 ||
      right.some(
        (other) =>
          other !== target &&
          (other.key === target.key ||
            (candidate && candidates(other).includes(candidate))),
      );
    const issues = [
      ...target.issues,
      ...(candidate?.issues ?? []),
      ...(!complete ? ["Mode inventory is incomplete or unavailable."] : []),
      ...(ambiguous
        ? ["Mode-set matching is ambiguous; no mapping selected."]
        : []),
    ];
    const mapping =
      candidate &&
      mappings.find(
        (mapping) =>
          mapping.app === candidate.record.id &&
          mapping.reference === target.record.id,
      );
    if (
      mapping?.modeKeys &&
      Object.entries(mapping.modeKeys).some(
        ([from, to]) =>
          !candidate?.modes.includes(from) || !target.modes.includes(to),
      )
    )
      issues.push(
        "Reviewed mode mapping refers to an undeclared app or reference mode.",
      );
    if (
      mapping?.modeKeys &&
      new Set(Object.values(mapping.modeKeys)).size !==
        Object.values(mapping.modeKeys).length
    )
      issues.push("Reviewed mode mapping is not one-to-one.");
    const pairs = target.modes.map((mode): ModePair => {
      const options =
        candidate?.modes.filter(
          (key) =>
            mapping?.modeKeys?.[key] === mode ||
            (mapping?.modeKeys?.[key] === undefined && key === mode),
        ) ?? [];
      const conflict =
        options.length > 1 ||
        (options[0] !== undefined &&
          Object.values(mapping?.modeKeys ?? {}).filter((key) => key === mode)
            .length > 1);
      return {
        id: canonicalJson([target.key, mode]),
        reference: mode,
        app: options.length === 1 && !conflict ? options[0] : undefined,
        result:
          issues.length || conflict
            ? "unassessable"
            : options.length
              ? "pass"
              : "fail",
        reason: conflict
          ? "Mode mapping is ambiguous."
          : issues.length
            ? issues.join(" ")
            : options.length
              ? "Required mode is supported."
              : "Required app mode is missing.",
      };
    });
    if (
      pairs.some((pair) => pair.result === "unassessable") &&
      !issues.length
    ) {
      issues.push("Mode matching is ambiguous; no mapping selected.");
      for (const pair of pairs) {
        pair.result = "unassessable";
        pair.reason = issues.join(" ");
      }
    }
    if (candidate)
      for (const mode of candidate.modes) {
        if (pairs.some((pair) => pair.app === mode)) continue;
        const mapped = mapping?.modeKeys?.[mode];
        const unresolved =
          issues.length > 0 ||
          (mapped !== undefined && !target.modes.includes(mapped)) ||
          pairs.some((pair) => pair.result === "unassessable");
        pairs.push({
          id: canonicalJson([target.key, "app", mode]),
          app: mode,
          result: unresolved ? "unassessable" : "enhancement",
          reason: unresolved
            ? "Mode matching cannot establish an enhancement."
            : "Additional app mode.",
        });
      }
    return {
      id: target.record.id,
      reference: target,
      app: ambiguous ? undefined : candidate,
      result: issues.length
        ? "unassessable"
        : !candidate || pairs.some((mode) => mode.result === "fail")
          ? "fail"
          : pairs.some((mode) => mode.result === "unassessable")
            ? "unassessable"
            : "pass",
      evidence: mapping
        ? mapping.rationale
        : candidate?.key === target.key
          ? "Matching canonical mode-set keys."
          : candidate
            ? "Matching identity."
            : "No app declaration with a matching key, identity, or reviewed mapping.",
      confidence:
        ambiguous || !candidate
          ? "unassessable"
          : mapping
            ? "reviewed-mapping"
            : target.record.identity &&
                target.record.identity === candidate.record.identity
              ? "exact-identity"
              : "canonical-key",
      issues,
      modes: pairs,
    };
  });
  for (const candidate of left) {
    if (selected.has(candidate)) continue;
    const duplicate =
      left.filter((other) => other.key === candidate.key).length !== 1;
    const issues = [
      ...candidate.issues,
      ...(!complete ? ["Mode inventory is incomplete or unavailable."] : []),
      ...(duplicate ? ["Duplicate app mode-set key."] : []),
    ];
    sets.push({
      id: candidate.record.id,
      app: candidate,
      result: issues.length ? "unassessable" : "enhancement",
      evidence: "App mode set has no reference counterpart.",
      confidence: "unassessable",
      issues,
      modes: [],
    });
  }
  const required = sets.filter((set) => set.reference);
  return {
    schemaVersion: 1,
    result: required.some((set) => set.result === "fail")
      ? "fail"
      : !required.length ||
          required.some((set) => set.result === "unassessable")
        ? "unassessable"
        : "pass",
    sets,
    counts: {
      requiredSets: right.length,
      requiredModes: right.reduce((sum, set) => sum + set.modes.length, 0),
      missingSets: required.filter((set) => set.result === "fail" && !set.app)
        .length,
      missingModes: required
        .filter((set) => set.app)
        .reduce(
          (sum, set) =>
            sum + set.modes.filter((mode) => mode.result === "fail").length,
          0,
        ),
      enhancementSets: sets.filter((set) => set.result === "enhancement")
        .length,
      enhancementModes: sets.reduce(
        (sum, set) =>
          sum +
          set.modes.filter((mode) => mode.result === "enhancement").length,
        0,
      ),
    },
  };
}

export function modeCoverageMarkdown(coverage: ModeCoverage): string {
  const cell = (value: string) =>
    value.replaceAll("|", "\\|").replaceAll("\n", " ");
  return [
    "## Mode coverage",
    "",
    "| Mode set | Mode | Result | Evidence |",
    "| --- | --- | --- | --- |",
    ...coverage.sets
      .filter((set) => set.result !== "enhancement")
      .flatMap((set) =>
        !set.app || set.issues.length
          ? [
              `| ${cell(set.reference?.key ?? set.app?.key ?? "Unknown")} | All | ${set.result} | ${cell([...set.issues, set.evidence].join(" "))} |`,
            ]
          : set.modes
              .filter((mode) => mode.reference)
              .map(
                (mode) =>
                  `| ${cell(set.reference?.key ?? "")} | ${cell(mode.reference ?? "")} | ${mode.result} | ${cell(mode.reason)} |`,
              ),
      ),
    "",
    "## Mode enhancements",
    "",
    ...coverage.sets.flatMap((set) =>
      set.result === "enhancement"
        ? [`- ${cell(set.app?.key ?? "")}: additional app mode set.`]
        : set.modes
            .filter((mode) => mode.result === "enhancement")
            .map(
              (mode) =>
                `- ${cell(set.app?.key ?? "")}: ${cell(mode.app ?? "")}, additional app mode.`,
            ),
    ),
    "",
  ].join("\n");
}
