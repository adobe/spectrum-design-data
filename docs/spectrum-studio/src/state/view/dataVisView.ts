// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";

export type ColorPanelTab =
  | "palette"
  | "scales"
  | "data-vis"
  | "contrasts"
  | "surfaces";
export const colorPanelTabAtom = atom<ColorPanelTab>("palette");
export const selectedDataVisScaleIdAtom = atom<string | null>(null);
