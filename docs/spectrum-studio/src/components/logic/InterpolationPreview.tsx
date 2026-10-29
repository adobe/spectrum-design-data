// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useMemo } from "react";
import { interpolationPreview } from "../../features/scales/previews";
import type { Interpolation } from "../../features/scales/interpolationDefinition";

const figureStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  flexShrink: 0,
  margin: 0,
});
const frameStyles = style({ color: "neutral", display: "block" });
const accentStyles = style({ color: "accent" });
const captionStyles = style({
  font: "detail",
  color: "neutral-subdued",
  margin: 0,
});

const SIZE = 120;
const PAD = 14;

/** A square plot where both axes run 0 to 1, to show the shape independent of any input or output range. */
export function InterpolationPreview({
  interpolation,
}: {
  interpolation: Interpolation;
}) {
  const preview = useMemo(
    () => interpolationPreview(interpolation),
    [interpolation],
  );
  const inner = SIZE - PAD * 2;
  const x = (value: number) => PAD + value * inner;
  const y = (value: number) => SIZE - PAD - value * inner;
  const path = preview.points
    .map(
      (point, index) => `${index === 0 ? "M" : "L"}${x(point.x)},${y(point.y)}`,
    )
    .join("");
  const summary = preview.isFitted
    ? `${interpolation.name}, plotted for x from 0 to 1`
    : `${interpolation.name} shape from 0 to 1`;

  return (
    <figure className={figureStyles}>
      <svg
        role="img"
        aria-label={summary}
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={frameStyles}
        data-testid="interpolation-preview"
      >
        <rect
          x={PAD}
          y={PAD}
          width={inner}
          height={inner}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.3}
        />
        <line
          x1={PAD}
          y1={SIZE - PAD}
          x2={SIZE - PAD}
          y2={PAD}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeDasharray="3 3"
        />
        <text
          x={PAD - 4}
          y={SIZE - PAD}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize="9"
          fill="currentColor"
          fillOpacity={0.7}
        >
          0
        </text>
        <text
          x={PAD - 4}
          y={PAD}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize="9"
          fill="currentColor"
          fillOpacity={0.7}
        >
          1
        </text>
        <text
          x={PAD}
          y={SIZE - PAD + 10}
          textAnchor="middle"
          fontSize="9"
          fill="currentColor"
          fillOpacity={0.7}
        >
          0
        </text>
        <text
          x={SIZE - PAD}
          y={SIZE - PAD + 10}
          textAnchor="middle"
          fontSize="9"
          fill="currentColor"
          fillOpacity={0.7}
        >
          1
        </text>
        {path && (
          <path
            className={accentStyles}
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}
      </svg>
      {preview.isFitted && (
        <figcaption className={captionStyles}>x from 0 to 1</figcaption>
      )}
    </figure>
  );
}
