// Copyright 2026 Adobe. All rights reserved.
export function continuousStopBounds(
  points: readonly { id: string; position: number }[],
  id: string,
  kind: "sequential" | "diverging",
) {
  const index = points.findIndex((point) => point.id === id),
    point = points[index];
  if (!point) throw new Error("This color stop is unavailable.");
  const fixed =
    point.position === 0 ||
    point.position === 1 ||
    (kind === "diverging" && point.position === 0.5);
  return {
    fixed,
    minimum: fixed ? point.position : points[index - 1].position + 0.00000001,
    maximum: fixed ? point.position : points[index + 1].position - 0.00000001,
  };
}
