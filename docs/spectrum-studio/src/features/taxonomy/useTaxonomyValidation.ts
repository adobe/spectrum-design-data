// Copyright 2026 Adobe. All rights reserved.
import { useCallback, useEffect, useMemo, useState } from "react";
import { LatestRequest } from "../derived-work/LatestRequest";
import { workerTask } from "../derived-work/workerTask";
import {
  currentTaxonomyValidation,
  taxonomyDraftError,
  type ReferencedTaxonomySource,
  type TaxonomyValidationRequest,
  type TaxonomyValidationResult,
  type TaxonomyValidationState,
} from "./referenceValidation";
import type { TaxonomyDocument } from "./model";

const execute = workerTask<TaxonomyValidationRequest, TaxonomyValidationResult>(
  () =>
    new Worker(new URL("./taxonomyValidation.worker.ts", import.meta.url), {
      type: "module",
    }),
);

export function useTaxonomyValidation(
  source: ReferencedTaxonomySource,
  committing = false,
) {
  const [state, publish] = useState<TaxonomyValidationState>();
  const controller = useMemo(() => new LatestRequest(execute, publish), []);
  useEffect(() => () => controller.cancel(), [controller, source]);
  const current = currentTaxonomyValidation(state, source);
  const pending = current?.status === "pending" || committing;
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setRevealed(true), 100);
    return () => {
      clearTimeout(timer);
      setRevealed(false);
    };
  }, [pending]);
  const request = useCallback(
    (
      termId: string,
      field: "value" | "description",
      text: string,
      document: TaxonomyDocument,
    ) => controller.request({ source, termId, field, text, document }),
    [controller, source],
  );
  const cancel = useCallback(() => {
    controller.cancel();
    publish(undefined);
  }, [controller]);
  const retry = useCallback(() => controller.retry(), [controller]);
  return {
    pending,
    showPending: pending && revealed,
    termId: current?.input.termId,
    field: current?.input.field,
    text: current?.input.text,
    failure: current?.status === "unavailable" ? current.error : undefined,
    request,
    error: (termId: string, field: "value" | "description", text: string) =>
      taxonomyDraftError(state, source, termId, field, text),
    cancel,
    retry,
  };
}
