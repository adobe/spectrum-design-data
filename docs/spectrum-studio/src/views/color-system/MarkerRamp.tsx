// Copyright 2026 Adobe. All rights reserved.
import {
  lightDark,
  style,
} from "@react-spectrum/s2/style" with { type: "macro" };
import type { CSSProperties } from "react";

const rampStyles = style({
  position: "relative",
  flexShrink: 0,
  width: 64,
  minHeight: 400,
  height: "full",
  borderRadius: "default",
  borderStyle: "solid",
  borderWidth: 1,
  borderColor: "gray-200",
  boxShadow: "elevated",
});
const rampContainerStyles = style({
  position: "sticky",
  top: 12,
  alignSelf: "stretch",
  display: "flex",
  flexDirection: "column",
  minHeight: 400,
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
}: {
  label: string;
  background: CSSProperties;
  markers: readonly { id: string; position: number }[];
  focusedId: string | null;
}) {
  return (
    <div className={rampContainerStyles}>
      <div
        role="img"
        aria-label={label}
        className={rampStyles}
        style={background}
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
