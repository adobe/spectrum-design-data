// Copyright 2026 Adobe. All rights reserved.
import {
  addSpacingScaleAtom,
  generatedSpacingAtom,
  isSpacingScaleNameTaken,
  removeSpacingScaleAtom,
  restoreSpacingScaleAtom,
  spacingDocumentAtom,
  updateSpacingScaleAtom,
} from "../../features/spacing/state";
import {
  DimensionFoundationPanel,
  type DimensionFoundationBinding,
} from "./DimensionFoundationPanel";

const spacingFoundation: DimensionFoundationBinding = {
  noun: "spacing",
  documentAtom: spacingDocumentAtom,
  generatedAtom: generatedSpacingAtom,
  addScaleAtom: addSpacingScaleAtom,
  updateScaleAtom: updateSpacingScaleAtom,
  removeScaleAtom: removeSpacingScaleAtom,
  restoreScaleAtom: restoreSpacingScaleAtom,
  isNameTaken: isSpacingScaleNameTaken,
};

export function FoundationsSpacingPanel() {
  return (
    <DimensionFoundationPanel
      foundation={spacingFoundation}
      componentName="FoundationsSpacingPanel"
    />
  );
}
