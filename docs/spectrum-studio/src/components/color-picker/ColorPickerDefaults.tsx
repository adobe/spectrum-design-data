// Copyright 2026 Adobe. All rights reserved.
import type { ReactNode } from "react";
import type { ColorGamut } from "../../features/color-system/outputSettings";
import { PickerGamutContext } from "./pickerGamut";

export function ColorPickerDefaultsProvider({
  gamut,
  children,
}: {
  gamut: ColorGamut;
  children: ReactNode;
}) {
  return (
    <PickerGamutContext.Provider value={gamut}>
      {children}
    </PickerGamutContext.Provider>
  );
}
