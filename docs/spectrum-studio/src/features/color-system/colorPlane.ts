// Copyright 2026 Adobe. All rights reserved.
export type AxisRange = readonly [number, number];
export type PlaneDomains = readonly [AxisRange, AxisRange];

export function planePosition(
  a: number,
  b: number,
  size: number,
  domains: PlaneDomains,
) {
  return {
    x: ((a - domains[0][0]) / (domains[0][1] - domains[0][0])) * size,
    y: (1 - (b - domains[1][0]) / (domains[1][1] - domains[1][0])) * size,
  };
}

export function planeCoordinates(
  x: number,
  y: number,
  size: number,
  domains: PlaneDomains,
) {
  return [
    domains[0][0] + (x / size) * (domains[0][1] - domains[0][0]),
    domains[1][0] + (1 - y / size) * (domains[1][1] - domains[1][0]),
  ] as const;
}
