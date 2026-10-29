// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { BarSegment, BarTone } from "../features/impact/segments";
import "./StackedBar.css";

const TONES: Record<BarTone, string> = {
  orange: style({ backgroundColor: "orange-800" }),
  orangeSubtle: style({ backgroundColor: "orange-700" }),
  blue: style({ backgroundColor: "blue-800" }),
  seafoam: style({ backgroundColor: "seafoam-800" }),
  purple: style({ backgroundColor: "purple-800" }),
  yellow: style({ backgroundColor: "yellow-800" }),
  magenta: style({ backgroundColor: "magenta-800" }),
  cyan: style({ backgroundColor: "cyan-800" }),
  indigo: style({ backgroundColor: "indigo-800" }),
  red: style({ backgroundColor: "red-800" }),
};

const remainderStyles = style({ backgroundColor: "gray-200" });

/** A horizontal bar of stacked shares; the unfilled remainder is shown as a neutral track. */
export function StackedBar({
  segments,
  "aria-label": ariaLabel,
}: {
  segments: BarSegment[];
  "aria-label": string;
}) {
  const filled = segments.reduce(
    (total, segment) => total + segment.fraction,
    0,
  );
  return (
    <div
      data-component="StackedBar"
      role="img"
      aria-label={ariaLabel}
      className="stackedBar"
    >
      {segments.map((segment) => (
        <span
          key={segment.id}
          data-segment={segment.id}
          className={`stackedBarSegment ${TONES[segment.tone]}`}
          style={{ flexGrow: segment.fraction }}
        />
      ))}
      {filled < 1 && (
        <span
          data-segment="remainder"
          className={`stackedBarSegment ${remainderStyles}`}
          style={{ flexGrow: 1 - filled }}
        />
      )}
    </div>
  );
}
