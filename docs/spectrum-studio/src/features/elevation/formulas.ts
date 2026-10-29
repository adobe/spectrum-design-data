// Copyright 2026 Adobe. All rights reserved.
import type { ScaleType } from "../scales/scaleType";

export const ELEVATION_POWER_FORMULA_ID = "scale-type-elevation-power";
export const ELEVATION_LINEAR_FORMULA_ID = "scale-type-elevation-linear";
export const ELEVATION_FORMULAS: readonly ScaleType[] = [
  {
    id: ELEVATION_POWER_FORMULA_ID,
    name: "Elevation power",
    description: "Multiply blur by the ratio at each level.",
    kind: "geometric",
    locked: true,
    base: { default: 4, step: 1, overridable: true, adaptable: false },
    parameters: [
      {
        id: "ratio",
        label: "Scale",
        default: 2,
        step: 0.1,
        min: 1,
        overridable: true,
        adaptable: false,
      },
    ],
  },
  {
    id: ELEVATION_LINEAR_FORMULA_ID,
    name: "Elevation linear",
    description: "Add a fixed blur increment at each level.",
    kind: "linear",
    locked: true,
    base: { default: 4, step: 1, overridable: true, adaptable: false },
    parameters: [
      {
        id: "step",
        label: "Scale",
        default: 2,
        step: 1,
        min: 0,
        overridable: true,
        adaptable: false,
      },
    ],
  },
];
