// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";

// View layer: presentation-only selections for the color system surfaces.
export const selectedColorScaleIdAtom = atom<string | null>(null);
export const selectedColorStopIdAtom = atom<string | null>(null);
export const selectedContrastIdAtom = atom<string | null>(null);
export const showOpaqueComparisonAtom = atom(false);
export const showCssOpacityComparisonAtom = atom(false);
export const showContrastValuesAtom = atom(false);
export const showColorValuesAtom = atom(false);
export const rampSurfaceIdAtom = atom<string | null>(null);
export const previewScaleIdAtom = atom<string | null>(null);
export const activeContrastIdAtom = atom<string | null>(null);
export const nestDepthAtom = atom(2);
export const showMetaAtom = atom(false);

export interface ColorAnalysisPreferences {
  tab: "chromaticity" | "lightness";
  slice: number;
  markerMode: "slices" | "keys";
  paths: boolean;
  guides: boolean;
  lineType: "steps" | "curve";
  showValues: boolean;
  referenceScaleId: string | null;
  valuesScaleId: string | null;
}
export const DEFAULT_COLOR_ANALYSIS: ColorAnalysisPreferences = {
  tab: "chromaticity",
  slice: 0.5,
  markerMode: "slices",
  paths: false,
  guides: true,
  lineType: "steps",
  showValues: false,
  referenceScaleId: null,
  valuesScaleId: null,
};
export const colorAnalysisPreferencesAtom = atom<ColorAnalysisPreferences>(
  DEFAULT_COLOR_ANALYSIS,
);
