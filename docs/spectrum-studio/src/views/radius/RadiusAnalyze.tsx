// Copyright 2026 Adobe. All rights reserved.
import {
  generatedRadiusAtom,
  radiusDocumentAtom,
} from "../../features/radius/state";
import { DimensionAnalyze } from "../analyze/DimensionAnalyze";

export function RadiusAnalyze() {
  return (
    <DimensionAnalyze
      title="Radius"
      noun="radius"
      generatedAtom={generatedRadiusAtom}
      documentAtom={radiusDocumentAtom}
      valuePolicy="non-negative"
    />
  );
}
