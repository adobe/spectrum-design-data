// Copyright 2026 Adobe. All rights reserved.
/**
 * Rounds to the nearest multiple of `factor` at `depth` (1, 10, 100, …): 0.031 at depth 100, factor 2 → 0.04.
 * A factor of 0 or less leaves the value unrounded.
 */
export function roundToFactor(value: number, factor: number, depth = 1) {
  if (factor <= 0) return value;
  // Depth 1 keeps the exact arithmetic the typography reference parity depends on.
  if (depth === 1) return Math.round(value / factor) * factor;
  return (Math.round((value * depth) / factor) * factor) / depth;
}
