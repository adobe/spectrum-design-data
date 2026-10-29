// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useMemo } from "react";
import {
  SCALE_PREVIEW_FIRST_INDEX,
  SCALE_PREVIEW_LAST_INDEX,
  scalePreviewPoints,
} from "../../features/scales/previews";
import type { ScaleType } from "../../features/scales/scaleType";

const frameStyles = style({
  color: "neutral",
  width: "full",
  display: "block",
});
const accentStyles = style({ color: "accent" });
const captionStyles = style({
  font: "detail",
  color: "neutral-subdued",
  margin: 0,
});
const mutedStyles = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});

const WIDTH = 320;
const HEIGHT = 120;
const PAD = 12;

/** Compact plot of a scale's values for indices -4 to 8, with the base (index 0) marked. */
export function ScaleSparkline({ scaleType }: { scaleType: ScaleType }) {
  const points = useMemo(() => scalePreviewPoints(scaleType), [scaleType]);
  const finite = points.filter((point) => Number.isFinite(point.value));
  if (finite.length < 2)
    return (
      <p className={mutedStyles} role="status">
        No preview available.
      </p>
    );

  const low = Math.min(...finite.map((point) => point.value));
  const high = Math.max(...finite.map((point) => point.value));
  const span = high - low || 1;
  const x = (index: number) =>
    PAD +
    ((index - SCALE_PREVIEW_FIRST_INDEX) /
      (SCALE_PREVIEW_LAST_INDEX - SCALE_PREVIEW_FIRST_INDEX)) *
      (WIDTH - PAD * 2);
  const y = (value: number) =>
    HEIGHT - PAD - ((value - low) / span) * (HEIGHT - PAD * 2);
  // Indices without a value break the line instead of bridging the gap.
  const segments: string[] = [];
  let current = "";
  for (const point of points) {
    if (!Number.isFinite(point.value)) {
      if (current) segments.push(current);
      current = "";
      continue;
    }
    current += `${current ? "L" : "M"}${x(point.index)},${y(point.value)}`;
  }
  if (current) segments.push(current);

  return (
    <figure style={{ margin: 0 }}>
      <svg
        role="img"
        aria-label={`${scaleType.name} values for indices ${SCALE_PREVIEW_FIRST_INDEX} to ${SCALE_PREVIEW_LAST_INDEX}`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={frameStyles}
        data-testid="scale-preview"
      >
        <line
          x1={x(0)}
          x2={x(0)}
          y1={PAD}
          y2={HEIGHT - PAD}
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeDasharray="3 3"
        />
        <g className={accentStyles}>
          {segments.map((path) => (
            <path
              key={path}
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          ))}
          {finite.map((point) => (
            <circle
              key={point.index}
              cx={x(point.index)}
              cy={y(point.value)}
              r={point.index === 0 ? 4.5 : 2.5}
              fill="currentColor"
              fillOpacity={point.index === 0 ? 1 : 0.5}
            />
          ))}
        </g>
      </svg>
      <figcaption className={captionStyles}>
        Indices {SCALE_PREVIEW_FIRST_INDEX} to {SCALE_PREVIEW_LAST_INDEX} from a
        base of {scaleType.base.default}
      </figcaption>
    </figure>
  );
}
