// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import {
  computeAnalysisComparison,
  computeAnalysisGaps,
  type AnalysisComparisonResult,
} from "./analysisWork";
import type { AnalysisInput } from "./comparison";
import { canonicalJson } from "./canonicalJson";
import type {
  AnalysisMessage,
  AnalysisReply,
  AnalysisValue,
} from "./analysisService";
import {
  loadWasm,
  unavailableValueResolution,
  wasmResolution,
} from "./wasmResolution";
import {
  reconstructPackagedReference,
  type PackagedReference,
} from "./packagedReference";

let reference: AnalysisInput | undefined;
let referenceKey: number | undefined;
let savedComparison:
  | { key: string; referenceKey?: number; result: AnalysisComparisonResult }
  | undefined;

self.onmessage = async (event: MessageEvent<AnalysisMessage>) => {
  const { id, input } = event.data;
  try {
    let value: AnalysisValue;
    if (input.type === "reference") {
      const response = await fetch(input.url);
      if (!response.ok)
        throw new Error(`Reference request failed (${response.status}).`);
      if (input.packaged) {
        const snapshot: PackagedReference = await response.json();
        const { module, hash } = await loadWasm();
        const dataset = module.Dataset.embedded();
        try {
          reference = reconstructPackagedReference(
            snapshot,
            dataset.query(""),
            hash,
          );
          const digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(canonicalJson(reference.records)),
          );
          const recordsHash = Array.from(new Uint8Array(digest), (byte) =>
            byte.toString(16).padStart(2, "0"),
          ).join("");
          if (recordsHash !== snapshot.recordsHash)
            throw new Error(
              "Packaged reference inventory fingerprint does not match this build.",
            );
        } finally {
          dataset.free();
        }
      } else {
        reference = (await response.json()) as AnalysisInput;
      }
      if (
        !reference?.source ||
        !Array.isArray(reference.records) ||
        !Array.isArray(reference.errors) ||
        !Array.isArray(reference.limitations)
      )
        throw new Error("Invalid reference inventory response.");
      try {
        reference = await wasmResolution.resolve(reference);
      } catch (failure) {
        reference = unavailableValueResolution(reference, failure);
      }
      referenceKey = undefined;
      savedComparison = undefined;
      value = { type: "reference", result: reference };
    } else {
      if (input.reference) reference = input.reference;
      else if (
        referenceKey !== undefined &&
        referenceKey !== event.data.referenceKey
      )
        throw new Error(
          "Analysis reference cache was replaced. Retry to reload it.",
        );
      referenceKey = event.data.referenceKey;
      if (input.type === "compare") {
        const result = await computeAnalysisComparison({ ...input, reference });
        reference = result.reference ?? reference;
        value = { type: "compare", result };
      } else {
        let saved: AnalysisComparisonResult;
        if (input.comparison.app.source.kind === "saved")
          saved = input.comparison;
        else {
          const key = canonicalJson(input.saved);
          if (
            !savedComparison ||
            savedComparison.key !== key ||
            savedComparison.referenceKey !== referenceKey
          ) {
            const result = await computeAnalysisComparison({
              type: "compare",
              source: {
                dataset: "saved",
                saved: input.saved,
                working: input.saved,
              },
              reference,
              resolveValues: true,
            });
            savedComparison = { key, referenceKey, result };
          }
          saved = savedComparison.result;
        }
        value = {
          type: "gaps",
          result: computeAnalysisGaps({
            ...input,
            reference,
            savedComparison: saved,
          }),
        };
      }
    }
    self.postMessage({ id, type: "ready", value } satisfies AnalysisReply);
  } catch (failure) {
    self.postMessage({
      id,
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    } satisfies AnalysisReply);
  }
};
