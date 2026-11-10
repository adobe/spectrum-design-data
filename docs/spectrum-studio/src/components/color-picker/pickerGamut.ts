// Copyright 2026 Adobe. All rights reserved.
import { createContext, useContext } from "react";
import type { ColorGamut } from "../../features/color-system/outputSettings";
import type { PickerGamut } from "./colorUtils";

export const PickerGamutContext = createContext<ColorGamut>("srgb");

export function useDefaultPickerGamut(): PickerGamut {
  const gamut = useContext(PickerGamutContext);
  return gamut === "display-p3"
    ? "Display-P3"
    : gamut === "rec2020"
      ? "Rec2020"
      : "sRGB";
}
