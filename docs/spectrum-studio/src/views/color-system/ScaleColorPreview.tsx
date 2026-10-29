// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

const preview = style({
  display: "block",
  flexShrink: 0,
  width: { default: 128, isSmall: 20 },
  height: { default: 32, isSmall: 20 },
  borderRadius: "sm",
  borderStyle: "solid",
  borderWidth: 1,
  borderColor: "gray-200",
  backgroundColor: "layer-2",
});

export function ScaleColorPreview({
  colors,
  positions,
  continuous = true,
  label,
  background,
  size = "M",
  interpolation,
}: {
  colors: readonly string[];
  positions?: readonly number[];
  continuous?: boolean;
  label: string;
  background?: string;
  size?: "S" | "M";
  interpolation?: "oklab" | "oklch";
}) {
  const stops = colors.flatMap((color, index) =>
    continuous
      ? [
          `${color} ${(positions?.[index] ?? (colors.length > 1 ? index / (colors.length - 1) : 0)) * 100}%`,
        ]
      : [
          `${color} ${(index / colors.length) * 100}%`,
          `${color} ${((index + 1) / colors.length) * 100}%`,
        ],
  );
  return (
    <span
      role="img"
      aria-label={label}
      className={preview({ isSmall: size === "S" })}
      style={{
        ...(stops.length && {
          background: `linear-gradient(to right${continuous && interpolation ? ` in ${interpolation}` : ""}, ${stops.join(", ")})`,
        }),
        ...(background !== undefined && { backgroundColor: background }),
      }}
    />
  );
}
