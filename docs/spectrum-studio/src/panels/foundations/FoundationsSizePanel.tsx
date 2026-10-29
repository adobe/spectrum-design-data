// Copyright 2026 Adobe. All rights reserved.
import {
  addSizeScaleAtom,
  generatedSizeAtom,
  isSizeScaleNameTaken,
  removeSizeScaleAtom,
  restoreSizeScaleAtom,
  sizeDocumentAtom,
  updateSizeScaleAtom,
} from "../../features/size/state";
import {
  DimensionFoundationPanel,
  type DimensionFoundationBinding,
} from "./DimensionFoundationPanel";

const sizeFoundation: DimensionFoundationBinding = {
  noun: "size",
  documentAtom: sizeDocumentAtom,
  generatedAtom: generatedSizeAtom,
  addScaleAtom: addSizeScaleAtom,
  updateScaleAtom: updateSizeScaleAtom,
  removeScaleAtom: removeSizeScaleAtom,
  restoreScaleAtom: restoreSizeScaleAtom,
  isNameTaken: isSizeScaleNameTaken,
};

export function FoundationsSizePanel() {
  return (
    <DimensionFoundationPanel
      foundation={sizeFoundation}
      componentName="FoundationsSizePanel"
    />
  );
}
