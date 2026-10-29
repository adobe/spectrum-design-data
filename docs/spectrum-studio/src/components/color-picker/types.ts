// Copyright 2026 Adobe. All rights reserved.
import type Color from "colorjs.io";
import type { StylesProp } from "@react-spectrum/s2";
import type { CSSProperties } from "react";

import type { PickerColorSpace, PickerGamut, PickerModel } from "./colorUtils";

export interface ColorPickerContentsProps {
  color: string;
  onChange: (color: string, parsedColor: Color) => void;
  colorSpace?: PickerColorSpace;
  gamut?: PickerGamut;
  model?: PickerModel;
  showGamutPicker?: boolean;
  className?: string;
  styles?: StylesProp;
  style?: CSSProperties;
}

export type { PickerColorSpace, PickerGamut, PickerModel };
