// Copyright 2026 Adobe. All rights reserved.
import { createNumericValidationStore } from "../../edit-session/state";
import type { EditorPreviewInput } from "../../edit-session/editorPreviewWork";
import { modeSelectionAtom } from "../../modes/selection";
import { previewOverridesAtom } from "../../modes/previewState";
import { dataVisPreviewAtom } from "./preview";

export type DataVisPreviewInput = Pick<
  EditorPreviewInput,
  "source" | "selection" | "overrides"
>;
export function computeDataVisPreview(input: DataVisPreviewInput) {
  const store = createNumericValidationStore(input.source);
  store.set(modeSelectionAtom, input.selection);
  store.set(previewOverridesAtom, input.overrides);
  return store.get(dataVisPreviewAtom);
}
