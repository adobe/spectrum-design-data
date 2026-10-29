// Copyright 2026 Adobe. All rights reserved.
import type { Interpolation } from "../scales/interpolationDefinition";

export const TYPOGRAPHY_INTERPOLATIONS: readonly Interpolation[] = [
  {
    id: "interpolation-linear",
    name: "Linear",
    description: "A straight blend between local endpoints.",
    kind: "method",
    method: "linear",
  },
  {
    id: "interpolation-cosine",
    name: "Cosine",
    description: "A smooth blend between local endpoints.",
    kind: "method",
    method: "cosine",
  },
  {
    id: "interpolation-exponential",
    name: "Exponential",
    description: "A proportional blend between positive local endpoints.",
    kind: "method",
    method: "exponential",
  },
];

export function requireTypographyInterpolation(
  library: readonly Interpolation[],
  id: string,
): Interpolation {
  const interpolation = library.find((item) => item.id === id);
  if (!interpolation)
    throw new Error(`Interpolation ${id} is no longer available.`);
  return interpolation;
}
