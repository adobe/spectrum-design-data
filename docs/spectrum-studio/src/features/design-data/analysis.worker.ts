// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import {
  computeAnalysisComparison,
  computeAnalysisGaps,
  type AnalysisComparisonRequest,
  type AnalysisComparisonResult,
} from "./analysisWork";
import type { AnalysisInput } from "./comparison";
import { canonicalJson } from "./canonicalJson";
import {
  ANALYSIS_KEPT_RESULTS,
  type AnalysisMessage,
  type AnalysisReply,
  type AnalysisValue,
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
import {
  analysisCacheKey,
  createAnalysisCache,
  indexedDbAnalysisStore,
} from "./analysisCache";
import codeVersion from "virtual:analysis-code-version";

const cache = createAnalysisCache(indexedDbAnalysisStore, codeVersion);

let reference: AnalysisInput | undefined;
let referenceKey: number | undefined;
let savedComparison:
  | { key: string; referenceKey?: number; result: AnalysisComparisonResult }
  | undefined;
// Recent comparisons, so the page can refer to them by message id instead of
// copying the full app inventory and report back into the worker.
const kept = new Map<number, AnalysisComparisonResult>();
const keep = (id: number, result: AnalysisComparisonResult) => {
  kept.set(id, result);
  while (kept.size > ANALYSIS_KEPT_RESULTS)
    kept.delete(kept.keys().next().value!);
};

async function cachedComparison(
  request: AnalysisComparisonRequest,
  save: (write: () => Promise<void>) => void,
) {
  const key = await analysisCacheKey(request, request.reference);
  const stored = key ? await cache.get(key) : undefined;
  if (stored) return stored;
  const result = await computeAnalysisComparison(request);
  if (key) save(() => cache.put(key, { ...result, reference: undefined }));
  return result;
}

self.onmessage = async (event: MessageEvent<AnalysisMessage>) => {
  const { id, input, appKey, comparisonKey } = event.data;
  const saves: (() => Promise<void>)[] = [];
  const save = (write: () => Promise<void>) => saves.push(write);
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
        // A missing kept app only costs a fresh projection, so fall back quietly.
        const cachedApp =
          input.cachedApp ??
          (appKey !== undefined ? kept.get(appKey)?.app : undefined);
        const result = await cachedComparison(
          { ...input, cachedApp, reference },
          save,
        );
        reference = result.reference ?? reference;
        keep(id, result);
        // The page already holds the reference; sending it back is wasted copying.
        const reply = { ...result };
        delete reply.reference;
        value = { type: "compare", result: reply };
      } else {
        const comparison =
          input.comparison ??
          (comparisonKey !== undefined ? kept.get(comparisonKey) : undefined);
        if (!comparison)
          throw new Error(
            "Analysis comparison cache was replaced. Retry to recompute it.",
          );
        let saved: AnalysisComparisonResult;
        if (comparison.app.source.kind === "saved") saved = comparison;
        else {
          const key = canonicalJson(input.saved);
          if (
            !savedComparison ||
            savedComparison.key !== key ||
            savedComparison.referenceKey !== referenceKey
          ) {
            const result = await cachedComparison(
              {
                type: "compare",
                source: {
                  dataset: "saved",
                  saved: input.saved,
                  working: input.saved,
                },
                reference,
                resolveValues: true,
              },
              save,
            );
            savedComparison = { key, referenceKey, result };
          }
          saved = savedComparison.result;
        }
        value = {
          type: "gaps",
          result: computeAnalysisGaps({
            ...input,
            comparison,
            reference,
            savedComparison: saved,
          }),
        };
      }
    }
    self.postMessage({ id, type: "ready", value } satisfies AnalysisReply);
    // Storing happens after the reply so the page never waits on IndexedDB.
    for (const write of saves) await write();
  } catch (failure) {
    self.postMessage({
      id,
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    } satisfies AnalysisReply);
  }
};
