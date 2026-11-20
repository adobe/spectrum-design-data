// Copyright 2026 Adobe. All rights reserved.
export { opacityObservations } from "../../features/opacity/analysis";

export function formatOpacityPercent(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

export function opacitySwatchStyle(value: number) {
  return {
    backgroundColor:
      "var(--elements-preview-foreground, light-dark(black, white))",
    opacity: value,
  };
}

export function opacityEditDescription(level: {
  overridden: boolean;
  stale: boolean;
}) {
  return level.overridden
    ? level.stale
      ? "Out of date manual override"
      : "Manual override"
    : "Generated";
}
