// Copyright 2026 Adobe. All rights reserved.
import { elevationComparisonSeries } from "./comparisons";

export type ElevationComparisonInput = Parameters<
  typeof elevationComparisonSeries
>;
export function computeElevationComparison(input: ElevationComparisonInput) {
  return elevationComparisonSeries(...input);
}
