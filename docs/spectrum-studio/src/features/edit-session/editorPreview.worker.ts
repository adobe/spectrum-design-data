// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import {
  computeEditorPreview,
  type EditorPreviewInput,
  type EditorPreviewOutput,
  type StructurePreviewReferencesCache,
} from "./editorPreviewWork";
import type {
  PreviewReply,
  PreviewRequest,
} from "../derived-work/PreviewWorker";

const referencesCache: StructurePreviewReferencesCache = {};

self.onmessage = ({
  data,
}: MessageEvent<PreviewRequest<EditorPreviewInput>>) => {
  let reply: PreviewReply<EditorPreviewOutput>["reply"];
  try {
    reply = {
      type: "ready",
      value: computeEditorPreview(data.input, referencesCache),
    };
  } catch (failure) {
    reply = {
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
  self.postMessage({
    id: data.id,
    reply,
  } satisfies PreviewReply<EditorPreviewOutput>);
};
