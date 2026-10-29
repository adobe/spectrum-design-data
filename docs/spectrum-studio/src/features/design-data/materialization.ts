// Copyright 2026 Adobe. All rights reserved.
import type { AnalysisInput, AnalysisRecord } from "./comparison";
import { canonicalJson } from "./canonicalJson";

export type OutputOrigin =
  | "evaluation-sample"
  | "generated-output"
  | "authored-source-record"
  | "unclassified";
export interface OutputScenario {
  id: string;
  kind: "evaluation" | "serialized-context";
  context: Record<string, string | string[]>;
  omittedAxes: string[];
}
export interface OutputRecipe {
  id: string;
  source: string;
  pointer: string;
  generator: string;
  definitionReferences: string[];
  declaredBindings: {
    parameter: string;
    modeParameterId: string;
    source: string;
    pointer: string;
  }[];
  dependencyAssessment: "declared-only";
  evaluatorVersion: "not-established";
}
export interface OutputAssignment {
  id: string;
  kind: "source-record" | "browser-value-edit" | "legacy-token-override";
  source: string;
  pointer: string;
  /** Raw source qualifiers only. Omission never implies wildcard/default here. */
  context: Record<string, string | string[]>;
  /** Browser authoring keys use mode-set/mode IDs, unlike serialized context keys. */
  selection?: Record<string, string>;
  /** Authored edit facts, not a reconstruction of the current generator baseline. */
  valueEvidence?: { assigned: string | number; baseline: string | number };
}
export interface OutputObservation {
  recordId: string;
  origin: OutputOrigin;
  scenarioId?: string;
  recipeId?: string;
  assignmentIds: string[];
  lineage:
    | "source-record"
    | "generated-baseline-and-edit"
    | "generator-source-only"
    | "unavailable";
}
export interface OutputMetadata {
  schemaVersion: 1;
  axes: string[];
  scenarios: OutputScenario[];
  recipes: OutputRecipe[];
  assignments: OutputAssignment[];
  observations: OutputObservation[];
  limitations: string[];
}
export interface OutputInventory extends OutputMetadata {
  status: "observed" | "partial" | "unavailable";
  counts: {
    observedRows: number;
    evaluationSamples: number;
    generatedOutputs: number;
    authoredSourceRecords: number;
    unclassifiedRows: number;
    explicitAssignments: number;
    canonicalMaterializedRows: null;
  };
}
export interface MaterializationReport {
  schemaVersion: 1;
  policy: "reporting-only-v1";
  inputs: { app: OutputInventory; reference: OutputInventory };
  limitations: string[];
}

export const outputContextKey = (context: Record<string, string | string[]>) =>
  JSON.stringify(
    Object.entries(context).sort(([left], [right]) =>
      left.localeCompare(right, "en"),
    ),
  );
export const browserAssignmentId = (tokenId: string, modeKey: string) =>
  `browser-value:${JSON.stringify([tokenId, modeKey])}`;

export function outputScenario(
  context: Record<string, string | string[]>,
  axes: readonly string[],
  kind: OutputScenario["kind"],
): OutputScenario {
  return {
    id: `${kind}:${outputContextKey(context)}`,
    kind,
    context: structuredClone(context),
    omittedAxes: axes.filter((axis) => !Object.hasOwn(context, axis)).sort(),
  };
}

export function emptyOutputMetadata(
  axes: readonly string[] = [],
): OutputMetadata {
  return {
    schemaVersion: 1,
    axes: [...new Set(axes)].sort(),
    scenarios: [],
    recipes: [],
    assignments: [],
    observations: [],
    limitations: [],
  };
}

/** Source inventory only: no resolver, platform layer inference, or default expansion. */
export function referenceOutputMetadata(
  records: readonly AnalysisRecord[],
  axes: readonly string[],
): OutputMetadata {
  const metadata = emptyOutputMetadata(axes);
  for (const record of records.filter((item) => item.category === "tokens")) {
    const id = `source-record:${record.id}`;
    metadata.assignments.push({
      id,
      kind: "source-record",
      source: record.source,
      pointer: record.pointer,
      context: structuredClone(record.context ?? {}),
    });
    metadata.observations.push({
      recordId: record.id,
      origin: "authored-source-record",
      assignmentIds: [id],
      lineage: "source-record",
    });
  }
  metadata.limitations.push(
    "Reference inventory retains authored source records and raw qualifiers. It does not establish manual/generated origin, platform/product lineage, resolved winners, or canonical materialization coverage.",
  );
  return metadata;
}

/** Check identities, references, contexts and count boundaries at the browser/CLI input boundary. */
export function isOutputMetadata(
  value: unknown,
  records: readonly AnalysisRecord[],
): value is OutputMetadata {
  const object = (item: unknown): item is Record<string, unknown> =>
    !!item && typeof item === "object" && !Array.isArray(item);
  const strings = (item: unknown): item is string[] =>
    Array.isArray(item) &&
    item.every((entry: unknown) => typeof entry === "string");
  const context = (item: unknown): item is Record<string, string | string[]> =>
    object(item) &&
    Object.values(item).every(
      (entry) => typeof entry === "string" || strings(entry),
    );
  const fields = (item: Record<string, unknown>, keys: string[]) =>
    keys.every((key) => typeof item[key] === "string");
  const member = (item: unknown, choices: string[]) =>
    typeof item === "string" && choices.includes(item);
  const tokenValue = (item: unknown) =>
    typeof item === "string" ||
    (typeof item === "number" && Number.isFinite(item));
  if (
    !object(value) ||
    value.schemaVersion !== 1 ||
    !strings(value.axes) ||
    new Set(value.axes).size !== value.axes.length ||
    !strings(value.limitations) ||
    !Array.isArray(value.scenarios) ||
    !Array.isArray(value.recipes) ||
    !Array.isArray(value.assignments) ||
    !Array.isArray(value.observations)
  )
    return false;
  if (
    !value.scenarios.every(
      (item: unknown) =>
        object(item) &&
        typeof item.id === "string" &&
        member(item.kind, ["evaluation", "serialized-context"]) &&
        context(item.context) &&
        strings(item.omittedAxes),
    )
  )
    return false;
  if (
    !value.recipes.every(
      (item: unknown) =>
        object(item) &&
        fields(item, ["id", "source", "pointer", "generator"]) &&
        strings(item.definitionReferences) &&
        item.dependencyAssessment === "declared-only" &&
        item.evaluatorVersion === "not-established" &&
        Array.isArray(item.declaredBindings) &&
        item.declaredBindings.every(
          (binding: unknown) =>
            object(binding) &&
            fields(binding, [
              "parameter",
              "modeParameterId",
              "source",
              "pointer",
            ]),
        ),
    )
  )
    return false;
  if (
    !value.assignments.every(
      (item: unknown) =>
        object(item) &&
        fields(item, ["id", "source", "pointer"]) &&
        member(item.kind, [
          "source-record",
          "browser-value-edit",
          "legacy-token-override",
        ]) &&
        context(item.context) &&
        (item.selection === undefined ||
          (object(item.selection) &&
            Object.values(item.selection).every(
              (entry) => typeof entry === "string",
            ))) &&
        (item.valueEvidence === undefined
          ? item.kind === "source-record"
          : object(item.valueEvidence) &&
            tokenValue(item.valueEvidence.assigned) &&
            tokenValue(item.valueEvidence.baseline)),
    )
  )
    return false;
  if (
    !value.observations.every(
      (item: unknown) =>
        object(item) &&
        typeof item.recordId === "string" &&
        member(item.origin, [
          "evaluation-sample",
          "generated-output",
          "authored-source-record",
          "unclassified",
        ]) &&
        strings(item.assignmentIds) &&
        member(item.lineage, [
          "source-record",
          "generated-baseline-and-edit",
          "generator-source-only",
          "unavailable",
        ]) &&
        (item.scenarioId === undefined ||
          typeof item.scenarioId === "string") &&
        (item.recipeId === undefined || typeof item.recipeId === "string"),
    )
  )
    return false;
  const metadata = value as unknown as OutputMetadata;
  const unique = (ids: string[]) =>
    ids.every((id) => id.trim()) && new Set(ids).size === ids.length;
  if (
    ![metadata.scenarios, metadata.recipes, metadata.assignments].every(
      (items) => unique(items.map((item) => item.id)),
    ) ||
    !unique(metadata.observations.map((item) => item.recordId))
  )
    return false;
  const tokens = records.filter((record) => record.category === "tokens");
  if (new Set(tokens.map((record) => record.id)).size !== tokens.length)
    return false;
  const recordIds = new Set(tokens.map((record) => record.id));
  const byRecord = new Map(tokens.map((record) => [record.id, record]));
  const scenarios = new Map(metadata.scenarios.map((item) => [item.id, item]));
  const recipeIds = new Set(metadata.recipes.map((item) => item.id));
  const assignments = new Map(
    metadata.assignments.map((item) => [item.id, item]),
  );
  if (
    metadata.scenarios.some((item) => {
      const expected = outputScenario(item.context, metadata.axes, item.kind);
      return (
        item.id !== expected.id ||
        JSON.stringify([...item.omittedAxes].sort()) !==
          JSON.stringify(expected.omittedAxes)
      );
    })
  )
    return false;
  return metadata.observations.every(
    (item) =>
      recordIds.has(item.recordId) &&
      (item.recipeId === undefined || recipeIds.has(item.recipeId)) &&
      (item.scenarioId === undefined || scenarios.has(item.scenarioId)) &&
      (item.scenarioId === undefined ||
        outputContextKey(scenarios.get(item.scenarioId)!.context) ===
          outputContextKey(byRecord.get(item.recordId)?.context ?? {})) &&
      item.assignmentIds.every((id) => assignments.has(id)) &&
      new Set(item.assignmentIds).size === item.assignmentIds.length &&
      (item.origin !== "evaluation-sample" ||
        (item.recipeId !== undefined &&
          item.scenarioId !== undefined &&
          scenarios.get(item.scenarioId)?.kind === "evaluation")) &&
      (!["evaluation-sample", "generated-output"].includes(item.origin) ||
        byRecord.get(item.recordId)?.classification === "generated") &&
      (item.lineage !== "generated-baseline-and-edit" ||
        (byRecord.get(item.recordId)?.overrides?.generatedValue !== undefined &&
          item.assignmentIds.some(
            (id) =>
              assignments.get(id)?.kind === "browser-value-edit" &&
              assignments.get(id)?.valueEvidence?.assigned ===
                byRecord.get(item.recordId)?.value,
          ))) &&
      (item.origin !== "authored-source-record" ||
        (byRecord.get(item.recordId)?.classification === "authored" &&
          item.lineage === "source-record" &&
          item.assignmentIds.some((id) => {
            const assignment = assignments.get(id)!;
            const record = byRecord.get(item.recordId)!;
            return (
              assignment.kind === "source-record" &&
              assignment.source === record.source &&
              assignment.pointer === record.pointer &&
              outputContextKey(assignment.context) ===
                outputContextKey(record.context ?? {})
            );
          }))),
  );
}

export function outputInventory(input: AnalysisInput): OutputInventory {
  const tokens = input.records.filter((record) => record.category === "tokens");
  const supplied = input.outputMetadata;
  const valid =
    supplied !== undefined && isOutputMetadata(supplied, input.records);
  const metadata = valid ? structuredClone(supplied) : emptyOutputMetadata();
  const observed = new Set(metadata.observations.map((item) => item.recordId));
  for (const record of tokens)
    if (!observed.has(record.id))
      metadata.observations.push({
        recordId: record.id,
        origin: "unclassified",
        assignmentIds: [],
        lineage: "unavailable",
      });
  if (!valid)
    metadata.limitations.push(
      supplied
        ? "Malformed output metadata is unavailable; no assignments or canonical coverage inferred."
        : "Output provenance adapter is unavailable; existing token rows are unclassified.",
    );
  for (const key of ["scenarios", "recipes", "assignments"] as const)
    metadata[key].sort((left, right) => left.id.localeCompare(right.id, "en"));
  metadata.observations.sort((left, right) =>
    left.recordId.localeCompare(right.recordId, "en"),
  );
  return {
    ...metadata,
    status: !valid
      ? "unavailable"
      : input.errors.length
        ? "partial"
        : "observed",
    counts: {
      observedRows: tokens.length,
      evaluationSamples: metadata.observations.filter(
        (item) => item.origin === "evaluation-sample",
      ).length,
      generatedOutputs: metadata.observations.filter(
        (item) => item.origin === "generated-output",
      ).length,
      authoredSourceRecords: metadata.observations.filter(
        (item) => item.origin === "authored-source-record",
      ).length,
      unclassifiedRows: metadata.observations.filter(
        (item) => item.origin === "unclassified",
      ).length,
      explicitAssignments: metadata.assignments.length,
      canonicalMaterializedRows: null,
    },
  };
}

export function materializationReport(
  app: AnalysisInput,
  reference: AnalysisInput,
): MaterializationReport {
  return {
    schemaVersion: 1,
    policy: "reporting-only-v1",
    inputs: {
      app: outputInventory(app),
      reference: outputInventory(reference),
    },
    limitations: [
      "Declarations imply no assignments. Equal values never merge explicit assignments. Omitted context is recorded as omitted, not interpreted as wildcard/default.",
      "Observed row and assignment inventories are not canonical materialization counts or coverage denominators. Canonical materialized rows remain unavailable.",
      "Declared bindings are not a numerical sensitivity test or proof every sampled axis affects a value. Recipe IDs are report-local references, not new persisted authoring identities.",
      "Authored lineage and effective output remain separate. No substitute resolver or SDK/spec query-inventory decision is implemented. Existing comparison-specific reviewed default normalization is unchanged.",
    ],
  };
}

export function outputEvidence(inventory: OutputInventory, recordId?: string) {
  const observation = inventory.observations.find(
    (item) => item.recordId === recordId,
  );
  return observation
    ? {
        observation,
        scenario: inventory.scenarios.find(
          (item) => item.id === observation.scenarioId,
        ),
        recipe: inventory.recipes.find(
          (item) => item.id === observation.recipeId,
        ),
        assignments: inventory.assignments.filter((item) =>
          observation.assignmentIds.includes(item.id),
        ),
      }
    : undefined;
}

export function materializationMarkdown(report: MaterializationReport): string {
  const text = (value: string) =>
    value.replaceAll("|", "\\|").replaceAll("\n", " ");
  return [
    "## Evaluation and materialization provenance",
    "",
    `Metadata schema version: ${report.schemaVersion}. Policy: ${report.policy}.`,
    "",
    "| Input | Status | Observed rows | Evaluation samples | Generated output | Authored source records | Unclassified | Explicit source assignments | Canonical materialized rows |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ...Object.entries(report.inputs).map(
      ([kind, input]) =>
        `| ${kind} | ${input.status} | ${input.counts.observedRows} | ${input.counts.evaluationSamples} | ${input.counts.generatedOutputs} | ${input.counts.authoredSourceRecords} | ${input.counts.unclassifiedRows} | ${input.counts.explicitAssignments} | unavailable |`,
    ),
    "",
    ...report.limitations.map((item) => `- ${text(item)}`),
    "",
    ...Object.entries(report.inputs).flatMap(([kind, input]) => [
      `### ${kind} output provenance`,
      "",
      ...input.limitations.map((item) => `- ${text(item)}`),
      "",
      ...input.recipes.map(
        (item) =>
          `- Recipe **${text(item.id)}**: ${text(item.source)}${text(item.pointer)}; generator ${text(item.generator)}; evaluator version ${item.evaluatorVersion}; references ${text(item.definitionReferences.join(", ")) || "none recorded"}; declared bindings ${text(canonicalJson(item.declaredBindings))}.`,
      ),
      "",
      ...input.scenarios.map(
        (item) =>
          `- Scenario **${text(item.id)}** (${item.kind}): recorded context ${text(canonicalJson(item.context))}; omitted axes ${text(item.omittedAxes.join(", ")) || "none"}.`,
      ),
      "",
      ...input.assignments.map(
        (item) =>
          `- Assignment **${text(item.id)}** (${item.kind}): ${text(item.source)}${text(item.pointer)}; recorded context ${text(canonicalJson(item.context))}${item.selection ? `; stored mode IDs ${text(canonicalJson(item.selection))}` : ""}${item.valueEvidence ? `; authored edit evidence ${text(canonicalJson(item.valueEvidence))}` : ""}.`,
      ),
      "",
      ...input.observations.map(
        (item) =>
          `- Row **${text(item.recordId)}**: ${item.origin}; scenario ${text(item.scenarioId ?? "unavailable")}; recipe ${text(item.recipeId ?? "unavailable")}; assignments ${text(item.assignmentIds.join(", ")) || "none observed"}; lineage ${item.lineage}.`,
      ),
      "",
    ]),
  ].join("\n");
}
