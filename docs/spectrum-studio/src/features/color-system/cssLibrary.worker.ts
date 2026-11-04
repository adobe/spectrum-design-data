// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />

import {
  buildColorLibrary,
  type ColorLibraryMode,
  type ContrastLibraryMode,
  type CustomContrastLibraryMode,
} from "./cssLibrary";
import type { Rule } from "../logic/model";
import type { ColorSystemDocument } from "./model";
import type { TaxonomyDocument } from "../taxonomy/model";
import type { WorkerReply } from "../derived-work/workerTask";
import type { OpacitySource } from "../opacity/generation";

export interface CssLibraryWorkerRequest {
  opacitySource?: OpacitySource;
  document: ColorSystemDocument;
  modes?: ColorLibraryMode[];
  contrastModes?: ContrastLibraryMode[];
  taxonomy?: TaxonomyDocument;
  rules?: Rule[];
  customModes?: CustomContrastLibraryMode[];
}

export type CssLibraryWorkerResponse = WorkerReply<string>;

self.onmessage = (event: MessageEvent<CssLibraryWorkerRequest>) => {
  try {
    self.postMessage({
      type: "ready",
      value: buildColorLibrary(
        event.data.document,
        event.data.modes,
        event.data.contrastModes,
        event.data.taxonomy,
        event.data.rules,
        event.data.customModes,
        event.data.opacitySource,
      ),
    } satisfies CssLibraryWorkerResponse);
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error instanceof Error ? error.message : "CSS generation failed.",
    } satisfies CssLibraryWorkerResponse);
  }
};
