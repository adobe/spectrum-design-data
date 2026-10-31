// Copyright 2026 Adobe. All rights reserved.
import { Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ReactNode } from "react";

const row = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "full",
  minWidth: 0,
});
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
}: {
  preview: ReactNode;
  label: ReactNode;
  actions?: ReactNode;
  labelClassName?: string;
}) {
  return (
    <span className={row}>
      {preview}
      <Text UNSAFE_className={labelClassName ?? String(labelStyles)}>
        {label}
      </Text>
      {actions}
    </span>
  );
}
