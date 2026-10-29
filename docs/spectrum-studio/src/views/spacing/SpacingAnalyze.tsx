// Copyright 2026 Adobe. All rights reserved.
import {
  generatedSpacingAtom,
  spacingDocumentAtom,
} from "../../features/spacing/state";
import { DimensionAnalyze } from "../analyze/DimensionAnalyze";

export function SpacingAnalyze() {
  return (
    <DimensionAnalyze
      title="Spacing"
      noun="spacing"
      generatedAtom={generatedSpacingAtom}
      documentAtom={spacingDocumentAtom}
    />
  );
}
