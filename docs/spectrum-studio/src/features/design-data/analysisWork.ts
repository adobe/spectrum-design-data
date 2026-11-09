// Copyright 2026 Adobe. All rights reserved.
import type { EditSessionSnapshot } from "../edit-session/state";
import { prepareAuthoringSnapshot } from "../edit-session/snapshotPreparation";
import { projectSnapshot } from "./authoringProjection";
import {
  canonicalJson,
  compareDesignData,
  type AnalysisInput,
  type AnalysisReport,
} from "./comparison";
import { defaultsAnalysisInput } from "./projection";
import { assessGaps, gapRegister, type GapResult } from "./gaps";
import { VALUE_CONTEXT_POLICY } from "./colorOpacityAssessment";

export type AnalysisDataset = "defaults" | "saved" | "working";
export type AnalysisWorkSource =
  | { dataset: "defaults" }
  | {
      dataset: "saved" | "working";
      working: EditSessionSnapshot;
      saved: EditSessionSnapshot;
    };
export interface AnalysisComparisonRequest {
  type: "compare";
  source: AnalysisWorkSource;
  reference?: AnalysisInput;
  cachedApp?: AnalysisInput;
  resolveValues?: boolean;
}
export interface AnalysisComparisonResult {
  app: AnalysisInput;
  report?: AnalysisReport;
  unsaved?: boolean;
}
export interface AnalysisGapRequest {
  type: "gaps";
  comparison: AnalysisComparisonResult;
  reference?: AnalysisInput;
  saved: EditSessionSnapshot;
  stale: boolean;
}
export interface AnalysisGapResult {
  selected: GapResult[];
  saved: GapResult[];
}

async function fingerprint(input: AnalysisInput): Promise<AnalysisInput> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalJson(input.records)),
  );
  const hash = Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  return { ...input, source: { ...input.source, hash } };
}

function isResolutionResult(
  value: unknown,
): value is Pick<AnalysisInput, "resolvedValues" | "valueResolution"> {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  if (!result.valueResolution || typeof result.valueResolution !== "object")
    return false;
  const evidence = result.valueResolution as Record<string, unknown>;
  if (
    typeof evidence.datasetHash !== "string" ||
    typeof evidence.engine !== "string" ||
    (evidence.referenceHash !== undefined &&
      typeof evidence.referenceHash !== "string") ||
    (evidence.error !== undefined && typeof evidence.error !== "string") ||
    (evidence.contextPolicy !== undefined &&
      typeof evidence.contextPolicy !== "string")
  )
    return false;
  if (result.resolvedValues === undefined)
    return typeof evidence.error === "string";
  return (
    Array.isArray(result.resolvedValues) &&
    result.resolvedValues.every((value: unknown) => {
      if (!value || typeof value !== "object") return false;
      const row = value as Record<string, unknown>;
      return (
        typeof row.id === "string" &&
        !!row.context &&
        typeof row.context === "object" &&
        !Array.isArray(row.context) &&
        Object.values(row.context).every((mode) => typeof mode === "string") &&
        Array.isArray(row.chain) &&
        row.chain.every((hop: unknown) => typeof hop === "string") &&
        (row.issue === null || typeof row.issue === "string")
      );
    })
  );
}

export async function computeAnalysisComparison(
  request: AnalysisComparisonRequest,
): Promise<AnalysisComparisonResult> {
  const { source, reference } = request;
  if (request.cachedApp && request.cachedApp.source.kind !== source.dataset)
    throw new Error("Cached Analysis input belongs to a different dataset.");
  const working =
    source.dataset !== "defaults"
      ? prepareAuthoringSnapshot(source.working)
      : undefined;
  const projected =
    request.cachedApp ??
    (source.dataset === "defaults"
      ? defaultsAnalysisInput()
      : projectSnapshot(
          source.dataset === "saved" ? source.saved : working!,
          source.dataset,
        ));
  let app = request.cachedApp ?? (await fingerprint(projected));
  if (
    request.resolveValues &&
    reference &&
    (!app.valueResolution ||
      app.valueResolution.contextPolicy !== VALUE_CONTEXT_POLICY ||
      app.valueResolution.referenceHash !== reference.source.hash)
  ) {
    try {
      const response = await fetch("/__design-data/resolve-values", {
        method: "POST",
        signal: AbortSignal.timeout(45000),
        headers: { "Content-Type": "application/json" },
        body: canonicalJson(app),
      });
      if (!response.ok) throw new Error(await response.text());
      const result: unknown = await response.json();
      if (!isResolutionResult(result))
        throw new Error("Invalid token resolution response.");
      app = {
        ...app,
        resolvedValues: result.resolvedValues,
        valueResolution: result.valueResolution,
      };
      if (result.valueResolution?.error)
        app.limitations = [...app.limitations, result.valueResolution.error];
    } catch (error) {
      app = {
        ...app,
        limitations: [
          ...app.limitations,
          `Token resolution unavailable: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }
  return {
    app,
    ...(reference && { report: compareDesignData(app, reference) }),
    ...(source.dataset !== "defaults" && {
      unsaved: canonicalJson(source.saved) !== canonicalJson(working),
    }),
  };
}

export function computeAnalysisGaps({
  comparison,
  reference,
  saved,
  stale,
}: AnalysisGapRequest): AnalysisGapResult {
  const savedInput =
    comparison.app.source.kind === "saved"
      ? comparison.app
      : projectSnapshot(saved, "saved");
  return {
    selected: assessGaps(
      comparison.app,
      reference,
      comparison.report?.findings ?? [],
      gapRegister,
      stale,
    ),
    saved: assessGaps(
      savedInput,
      reference,
      reference ? compareDesignData(savedInput, reference).findings : [],
      gapRegister,
      stale,
    ),
  };
}
