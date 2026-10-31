// Copyright 2026 Adobe. All rights reserved.
import {
  lightDark,
  style,
} from "@react-spectrum/s2/style" with { type: "macro" };
import type { CSSProperties } from "react";
import {
  previewThemeStyle,
  usePreviewSurface,
} from "../../components/previewSurfaceContext";

const rampStyles = style({
  position: "relative",
  flexShrink: 0,
  width: { default: 64, isNarrow: 32 },
  minHeight: { default: 400, isNarrow: 0 },
  height: { default: "full", isNarrow: "auto" },
  flexGrow: { default: 0, isNarrow: 1 },
  borderRadius: "default",
  borderStyle: "solid",
  borderWidth: 1,
  borderColor: "gray-200",
  boxShadow: { default: "elevated", isNarrow: "none" },
});
const rampContainerStyles = style({
  position: { default: "sticky", isNarrow: "relative" },
  top: { default: 12, isNarrow: 0 },
  alignSelf: "stretch",
  display: "flex",
  flexDirection: "column",
  minHeight: { default: 400, isNarrow: 0 },
});
const dotStyles = style({
  position: "absolute",
  insetStart: "50%",
  width: 8,
  height: 8,
  borderRadius: "full",
  borderStyle: "solid",
  borderWidth: 1,
  borderColor: "white",
  backgroundColor: {
    default: "gray-25",
    isFocused: lightDark("accent-900", "accent-700"),
  },
  boxShadow: "elevated",
  transform: "translate(-50%, -50%)",
});

export function MarkerRamp({
  label,
  background,
  markers,
  focusedId,
  variant = "default",
}: {
  label: string;
  background: CSSProperties;
  markers: readonly { id: string; position: number }[];
  focusedId: string | null;
  variant?: "default" | "narrow";
}) {
  const surface = usePreviewSurface();
  return (
    <div className={rampContainerStyles({ isNarrow: variant === "narrow" })}>
      <div
        role="img"
        aria-label={label}
        className={rampStyles({ isNarrow: variant === "narrow" })}
        data-ramp-variant={variant}
        style={{ ...previewThemeStyle(surface), ...background }}
      >
        {markers.map((marker) => (
          <span
            key={marker.id}
            aria-hidden="true"
            className={dotStyles({ isFocused: marker.id === focusedId })}
            style={{ top: `${marker.position * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
