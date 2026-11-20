// Copyright 2026 Adobe. All rights reserved.
import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { numericPreviewSnapshotAtom } from "./numericState";
import { modeSelectionAtom } from "../modes/selection";
import { previewOverridesAtom } from "../modes/previewState";
import { usePreviewWorker } from "../derived-work/usePreviewWorker";
import type {
  EditorPreviewInput,
  EditorPreviewOutput,
} from "./editorPreviewWork";

const createWorker = () =>
  new Worker(new URL("./editorPreview.worker.ts", import.meta.url), {
    type: "module",
  });

export function useEditorPreview(
  kind: EditorPreviewInput["kind"],
  selectedId: string | null,
) {
  const source = useAtomValue(numericPreviewSnapshotAtom);
  const selection = useAtomValue(modeSelectionAtom);
  const overrides = useAtomValue(previewOverridesAtom);
  const input = useMemo(
    (): EditorPreviewInput => ({
      kind,
      source,
      selection,
      overrides,
      selectedId,
    }),
    [kind, source, selection, overrides, selectedId],
  );
  return usePreviewWorker<EditorPreviewInput, EditorPreviewOutput>(
    input,
    createWorker,
  );
}
