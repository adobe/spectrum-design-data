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
  const app = request.cachedApp ?? (await fingerprint(projected));
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
