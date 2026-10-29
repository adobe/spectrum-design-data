// Copyright 2026 Adobe. All rights reserved.
import { Text } from "@react-spectrum/s2";
import {
  addRadiusScaleAtom,
  generatedRadiusAtom,
  isRadiusScaleNameTaken,
  radiusDocumentAtom,
  removeRadiusScaleAtom,
  restoreRadiusScaleAtom,
  updateRadiusScaleAtom,
  updateRadiusFormulaPartAtom,
} from "../../features/radius/state";
import { RadiusSample } from "../../views/radius/RadiusSample";
import {
  DimensionFoundationPanel,
  type DimensionFoundationBinding,
} from "./DimensionFoundationPanel";

const foundation: DimensionFoundationBinding = {
  noun: "radius",
  valuePolicy: "non-negative",
  documentAtom: radiusDocumentAtom,
  generatedAtom: generatedRadiusAtom,
  addScaleAtom: addRadiusScaleAtom,
  updateScaleAtom: updateRadiusScaleAtom,
  removeScaleAtom: removeRadiusScaleAtom,
  restoreScaleAtom: restoreRadiusScaleAtom,
  updateFormulaPartAtom: updateRadiusFormulaPartAtom,
  isNameTaken: isRadiusScaleNameTaken,
  preview: (scale, values) => {
    const value = values.find((value) => value.index === 0)?.value ?? NaN;
    return (
      <div className="radiusElement">
        <RadiusSample radius={value} label={`${scale.name} base preview`} />
        <Text>
          {Number.isFinite(value) && value >= 0
            ? `Base: ${value}px`
            : "Unavailable base radius"}
        </Text>
      </div>
    );
  },
};

export function FoundationsCornerRadiusPanel() {
  return (
    <DimensionFoundationPanel
      foundation={foundation}
      componentName="FoundationsCornerRadiusPanel"
    />
  );
}
