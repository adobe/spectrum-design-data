// Copyright 2026 Adobe. All rights reserved.
import { useEffect, useMemo, useRef, useState } from "react";
import { atom, useAtomValueRawSync } from "jotai";
import {
  authoringSourceSnapshotAtom,
  createDefaultSnapshot,
  editSessionSnapshotAtom,
  type EditSessionSnapshot,
} from "../edit-session/state";
import {
  LatestRequest,
  type DerivedState,
} from "../derived-work/LatestRequest";
import { workerTask } from "../derived-work/workerTask";
import type { AnalysisInput } from "./comparison";
import type {
  AnalysisComparisonRequest,
  AnalysisComparisonResult,
  AnalysisDataset,
  AnalysisGapRequest,
  AnalysisGapResult,
  AnalysisWorkSource,
} from "./analysisWork";

const defaultSnapshotAtom = atom(() => createDefaultSnapshot());
const compare = workerTask<AnalysisComparisonRequest, AnalysisComparisonResult>(
  () =>
    new Worker(new URL("./analysis.worker.ts", import.meta.url), {
      type: "module",
    }),
);
const gaps = workerTask<AnalysisGapRequest, AnalysisGapResult>(
  () =>
    new Worker(new URL("./analysis.worker.ts", import.meta.url), {
      type: "module",
    }),
);

export function useAnalysisWork(
  dataset: AnalysisDataset,
  reference: AnalysisInput | undefined,
  includeGaps: boolean,
  stale: boolean,
) {
  const sourceAtom = useMemo(
    () =>
      atom(
        (get): AnalysisWorkSource =>
          dataset === "defaults"
            ? { dataset }
            : {
                dataset,
                working: get(authoringSourceSnapshotAtom),
                saved: get(editSessionSnapshotAtom) ?? get(defaultSnapshotAtom),
              },
      ),
    [dataset],
  );
  const source = useAtomValueRawSync(sourceAtom);
  const savedAtom = useMemo(
    () =>
      atom((get) =>
        includeGaps
          ? (get(editSessionSnapshotAtom) ?? get(defaultSnapshotAtom))
          : undefined,
      ),
    [includeGaps],
  );
  const saved = useAtomValueRawSync(savedAtom);
  const cache = useRef<{
    key: EditSessionSnapshot | "defaults";
    app: AnalysisInput;
  }>(undefined);
  const input = useMemo((): AnalysisComparisonRequest => {
    const key =
      source.dataset === "defaults"
        ? "defaults"
        : source.dataset === "saved"
          ? source.saved
          : source.working;
    const cachedApp =
      cache.current?.key === key &&
      cache.current.app.source.kind === source.dataset
        ? cache.current.app
        : undefined;
    return { type: "compare", source, reference, cachedApp };
  }, [source, reference]);
  const [comparison, publishComparison] =
    useState<
      DerivedState<AnalysisComparisonRequest, AnalysisComparisonResult>
    >();
  const [assessment, publishAssessment] =
    useState<DerivedState<AnalysisGapRequest, AnalysisGapResult>>();
  const current =
    useRef<LatestRequest<AnalysisComparisonRequest, AnalysisComparisonResult>>(
      undefined,
    );
  const currentGaps =
    useRef<LatestRequest<AnalysisGapRequest, AnalysisGapResult>>(undefined);
  useEffect(() => {
    const controller = new LatestRequest(compare, (state) => {
      if (state.status === "ready") {
        const source = state.input.source;
        cache.current = {
          key:
            source.dataset === "defaults"
              ? "defaults"
              : source.dataset === "saved"
                ? source.saved
                : source.working,
          app: state.value.app,
        };
      }
      publishComparison(state);
    });
    const gapController = new LatestRequest(gaps, publishAssessment);
    current.current = controller;
    currentGaps.current = gapController;
    return () => {
      controller.cancel();
      gapController.cancel();
      current.current = undefined;
      currentGaps.current = undefined;
    };
  }, []);
  useEffect(() => {
    current.current?.request(input, "visible");
  }, [input]);
  const result =
    comparison?.input === input && comparison.status === "ready"
      ? comparison.value
      : undefined;
  const gapInput = useMemo(
    (): AnalysisGapRequest | undefined =>
      includeGaps && saved && result
        ? { type: "gaps", comparison: result, reference, saved, stale }
        : undefined,
    [includeGaps, saved, result, reference, stale],
  );
  useEffect(() => {
    if (gapInput) currentGaps.current?.request(gapInput, "visible");
    else currentGaps.current?.cancel();
  }, [gapInput]);
  const gapResult =
    assessment?.input === gapInput && assessment?.status === "ready"
      ? assessment.value
      : undefined;
  const compareError =
    comparison?.input === input && comparison.status === "unavailable"
      ? comparison.error
      : undefined;
  const gapError =
    includeGaps &&
    assessment?.input === gapInput &&
    assessment?.status === "unavailable"
      ? assessment.error
      : undefined;
  return {
    result,
    gapResult,
    error: compareError ?? gapError,
    state:
      compareError || gapError
        ? ("unavailable" as const)
        : result && (!includeGaps || gapResult)
          ? ("ready" as const)
          : ("pending" as const),
    retry: () => {
      if (compareError) current.current?.retry();
      else currentGaps.current?.retry();
    },
  };
}
