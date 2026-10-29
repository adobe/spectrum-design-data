// Copyright 2026 Adobe. All rights reserved.
import { Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ReactNode } from "react";

const rowStyles = style({ display: "flex", minWidth: "max" });
const labelStyles = style({
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  width: 84,
  paddingStart: 8,
  font: "detail",
  opacity: 0.7,
});
const scaleLabelStyles = style({
  display: "flex",
  alignItems: "baseline",
  flexShrink: 0,
  width: 84,
  paddingStart: 8,
  fontWeight: "bold",
});
const cellsStyles = style({ display: "flex", flexGrow: 1 });

export function AlignedSwatchRow({
  label,
  children,
  isScaleLabel = false,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  isScaleLabel?: boolean;
  className?: string;
}) {
  return (
    <div className={`${rowStyles} ${className ?? ""}`}>
      <Text
        UNSAFE_className={String(isScaleLabel ? scaleLabelStyles : labelStyles)}
      >
        {label}
      </Text>
      <div className={cellsStyles}>{children}</div>
    </div>
  );
}
