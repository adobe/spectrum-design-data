// Copyright 2026 Adobe. All rights reserved.
import { Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ReactNode } from "react";
import "./PreviewListItem.css";

const row = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "full",
  minWidth: 0,
  gridColumnStart: 1,
  gridColumnEnd: -1,
  gridRowStart: 1,
  gridRowEnd: "span 2",
});
const insetStyles = style({ padding: 8, boxSizing: "border-box" });
const labelStyles = style({
  flexGrow: 1,
  minWidth: 0,
  font: "ui",
  fontWeight: "bold",
});

export function PreviewListItem({
  preview,
  label,
  actions,
  labelClassName,
  inset = false,
}: {
  preview: ReactNode;
  label: ReactNode;
  actions?: ReactNode;
  labelClassName?: string;
  inset?: boolean;
}) {
  return (
    <span
      className={`${row}${inset ? ` ${insetStyles}` : ""}`}
      data-component="PreviewListItem"
    >
      {preview}
      <Text
        slot="label"
        UNSAFE_className={labelClassName ?? String(labelStyles)}
      >
        {label}
      </Text>
      {actions}
    </span>
  );
}
