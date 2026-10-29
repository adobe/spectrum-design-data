// Copyright 2026 Adobe. All rights reserved.
import { generatedSizeAtom, sizeDocumentAtom } from "../../features/size/state";
import { DimensionAnalyze } from "../analyze/DimensionAnalyze";

export function SizeAnalyze() {
  return (
    <DimensionAnalyze
      title="Size"
      noun="size"
      generatedAtom={generatedSizeAtom}
      documentAtom={sizeDocumentAtom}
    />
  );
}
