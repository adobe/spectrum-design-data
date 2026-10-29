// Copyright 2026 Adobe. All rights reserved.
import { createContext, useContext, type ReactNode } from "react";
import type { ColorGamut } from "../../features/color-system/outputSettings";
import type { PickerGamut } from "./colorUtils";

const GamutContext = createContext<ColorGamut>("srgb");

export function ColorPickerDefaultsProvider({
  gamut,
  children,
}: {
  gamut: ColorGamut;
  children: ReactNode;
}) {
  return (
    <GamutContext.Provider value={gamut}>{children}</GamutContext.Provider>
  );
}

export function useDefaultPickerGamut(): PickerGamut {
  const gamut = useContext(GamutContext);
  return gamut === "display-p3"
    ? "Display-P3"
    : gamut === "rec2020"
      ? "Rec2020"
      : "sRGB";
}
