// Copyright 2026 Adobe. All rights reserved.
export interface TypeScalePreset {
  id: string;
  label: string;
  ratio: number;
}

export const TYPE_SCALE_PRESETS: TypeScalePreset[] = [
  { id: "minor-second", label: "Minor second", ratio: 1.067 },
  { id: "major-second", label: "Major second", ratio: 1.125 },
  { id: "minor-third", label: "Minor third", ratio: 1.2 },
  { id: "major-third", label: "Major third", ratio: 1.25 },
  { id: "perfect-fourth", label: "Perfect fourth", ratio: 1.333 },
  { id: "augmented-fourth", label: "Augmented fourth", ratio: 1.414 },
  { id: "perfect-fifth", label: "Perfect fifth", ratio: 1.5 },
  { id: "minor-sixth", label: "Minor sixth", ratio: 1.6 },
  { id: "golden-ratio", label: "Golden ratio", ratio: 1.618 },
  { id: "major-sixth", label: "Major sixth", ratio: 1.667 },
  { id: "minor-seventh", label: "Minor seventh", ratio: 1.778 },
  { id: "major-seventh", label: "Major seventh", ratio: 1.875 },
  { id: "octave", label: "Octave", ratio: 2 },
  { id: "custom", label: "Custom", ratio: 0 },
];

export function presetForRatio(
  ratio: number,
  tolerance = 0.0005,
): TypeScalePreset {
  return (
    TYPE_SCALE_PRESETS.find(
      (preset) =>
        preset.id !== "custom" && Math.abs(preset.ratio - ratio) <= tolerance,
    ) ?? TYPE_SCALE_PRESETS[TYPE_SCALE_PRESETS.length - 1]
  );
}
