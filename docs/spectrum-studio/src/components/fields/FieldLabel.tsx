// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ReactNode } from "react";

export type FieldLabelSize = "S" | "M" | "L" | "XL";

const labelStyles = style({
  font: {
    size: { S: "ui-sm", M: "ui", L: "ui-lg", XL: "ui-xl" },
  },
  color: { default: "neutral-subdued", isDisabled: "disabled" },
  cursor: "default",
  minWidth: 0,
  overflowWrap: "anywhere",
});

export interface FieldLabelProps {
  children: ReactNode;
  /** Matches the size of the control it labels. */
  size?: FieldLabelSize;
  id?: string;
  /** Renders a `<label>` tied to a native form control when set. */
  htmlFor?: string;
  isDisabled?: boolean;
}

/** Spectrum field-label text for controls that have no built-in label. */
export function FieldLabel({
  children,
  size = "M",
  id,
  htmlFor,
  isDisabled = false,
}: FieldLabelProps) {
  const className = labelStyles({ size, isDisabled });
  return htmlFor ? (
    <label id={id} htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ) : (
    <span id={id} className={className} data-component="FieldLabel">
      {children}
    </span>
  );
}
