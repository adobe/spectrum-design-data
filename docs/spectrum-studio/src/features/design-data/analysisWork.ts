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
import { unavailableValueResolution, wasmResolution } from "./wasmResolution";

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
  reference?: AnalysisInput;
  report?: AnalysisReport;
  unsaved?: boolean;
}
export interface AnalysisGapRequest {
  type: "gaps";
  comparison: AnalysisComparisonResult;
  reference?: AnalysisInput;
  saved: EditSessionSnapshot;
  stale: boolean;
  savedComparison?: AnalysisComparisonResult;
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

export async function computeAnalysisComparison(
  request: AnalysisComparisonRequest,
  resolveValues = wasmResolution.resolve,
): Promise<AnalysisComparisonResult> {
  const { source } = request;
  let reference = request.reference;
  if (request.cachedApp && request.cachedApp.source.kind !== source.dataset)
    throw new Error("Cached Analysis input belongs to a different dataset.");
  const working =
    source.dataset !== "defaults" && !request.cachedApp
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
      app.valueResolution.error ||
      reference.valueResolution?.error ||
      app.valueResolution.contextPolicy !== VALUE_CONTEXT_POLICY ||
      app.valueResolution.referenceHash !== reference.source.hash ||
      app.valueResolution.engine !== reference.valueResolution?.engine)
  ) {
    try {
      reference = await resolveValues(reference);
      app = await resolveValues(app, reference);
    } catch (error) {
      app = unavailableValueResolution(app, error, reference);
    }
  }
  return {
    app,
    ...(reference && { reference, report: compareDesignData(app, reference) }),
    ...(source.dataset !== "defaults" && {
      unsaved:
        canonicalJson(source.saved) !==
        canonicalJson(working ?? prepareAuthoringSnapshot(source.working)),
    }),
  };
}

export function computeAnalysisGaps({
  comparison,
  reference,
  saved,
  stale,
  savedComparison,
}: AnalysisGapRequest): AnalysisGapResult {
  const savedInput =
    savedComparison?.app ??
    (comparison.app.source.kind === "saved"
      ? comparison.app
      : projectSnapshot(saved, "saved"));
  const savedReport =
    savedComparison?.report ??
    (comparison.app.source.kind === "saved"
      ? comparison.report
      : reference
        ? compareDesignData(savedInput, reference)
        : undefined);
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
      savedReport?.findings ?? [],
      gapRegister,
      stale,
    ),
  };
}
