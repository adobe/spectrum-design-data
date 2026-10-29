// Copyright 2026 Adobe. All rights reserved.
import { ProgressCircle } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

const containerStyles = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "full",
  height: "full",
  minHeight: 0,
  flexGrow: 1,
});

export function LoadingIndicator({
  size = "M",
  "aria-label": ariaLabel = "Loading",
}: {
  size?: "L" | "M";
  "aria-label"?: string;
}) {
  return (
    <div className={containerStyles}>
      <ProgressCircle isIndeterminate size={size} aria-label={ariaLabel} />
    </div>
  );
}
