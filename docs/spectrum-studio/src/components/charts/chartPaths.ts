// Copyright 2026 Adobe. All rights reserved.
export interface ChartPoint {
  x: number;
  y: number | null;
  breakBefore?: boolean;
  label?: string;
}
export type ChartLineType = "linear" | "steps" | "curve";

export function chartSegments(points: readonly ChartPoint[]) {
  const segments: { x: number; y: number; label?: string }[][] = [];
  let current: { x: number; y: number; label?: string }[] = [];
  for (const point of points) {
    if (
      !Number.isFinite(point.x) ||
      (point.y !== null && !Number.isFinite(point.y))
    )
      throw new Error("Chart coordinates must be finite or an explicit gap.");
    if (point.y === null || point.breakBefore) {
      if (current.length) segments.push(current);
      current = [];
    }
    if (point.y !== null) current.push({ ...point, y: point.y });
  }
  if (current.length) segments.push(current);
  return segments;
}

export function chartPath(
  points: readonly ChartPoint[],
  type: ChartLineType = "linear",
) {
  return chartSegments(points)
    .map((segment) => {
      let path = `M${segment[0].x},${segment[0].y}`;
      const spans = segment
        .slice(1)
        .map((point, index) => point.x - segment[index].x);
      if (spans.some((span) => span <= 0))
        throw new Error(
          "Chart x coordinates must increase within each segment.",
        );
      const slopes = spans.map(
        (span, index) => (segment[index + 1].y - segment[index].y) / span,
      );
      const tangents = segment.map((_, index) => {
        if (index === 0) return slopes[0] ?? 0;
        if (index === segment.length - 1) return slopes[index - 1];
        const previous = slopes[index - 1];
        const next = slopes[index];
        if (previous * next <= 0) return 0;
        const w1 = 2 * spans[index] + spans[index - 1];
        const w2 = spans[index] + 2 * spans[index - 1];
        return (w1 + w2) / (w1 / previous + w2 / next);
      });
      for (let index = 1; index < segment.length; index += 1) {
        const previous = segment[index - 1];
        const point = segment[index];
        if (type === "steps")
          path += `H${(previous.x + point.x) / 2}V${point.y}H${point.x}`;
        else if (type === "curve") {
          const third = (point.x - previous.x) / 3;
          path += `C${previous.x + third},${previous.y + tangents[index - 1] * third} ${point.x - third},${point.y - tangents[index] * third} ${point.x},${point.y}`;
        } else path += `L${point.x},${point.y}`;
      }
      return path;
    })
    .join(" ");
}
