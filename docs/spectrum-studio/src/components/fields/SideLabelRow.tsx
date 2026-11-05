// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useId, type ReactNode } from "react";
import { FieldLabel, type FieldLabelSize } from "./FieldLabel";
import { sideLabelColumns, type LabelWidth } from "./fieldLayout";

const rowStyles = style({
  display: "grid",
  alignItems: "center",
  columnGap: "text-to-control",
  minWidth: 0,
  width: "full",
});

export interface SideLabelRowProps {
  label: ReactNode;
  /** Receives the label's id so the control can use `aria-labelledby`. */
  children: (labelId: string) => ReactNode;
  size?: FieldLabelSize;
  /** Same options as side-labelled fields; defaults to equal columns. */
  labelWidth?: LabelWidth;
  isDisabled?: boolean;
}

/**
 * Side label for controls without a built-in label (button groups), laid out
 * with the same grid as side-labelled Pickers and fields.
 */
export function SideLabelRow({
  label,
  children,
  size = "M",
  labelWidth,
  isDisabled,
}: SideLabelRowProps) {
  const labelId = useId();
  return (
    <div
      className={rowStyles}
      style={{ gridTemplateColumns: sideLabelColumns(labelWidth) }}
      data-component="SideLabelRow"
    >
      <FieldLabel id={labelId} size={size} isDisabled={isDisabled}>
        {label}
      </FieldLabel>
      <div className={style({ minWidth: 0, display: "flex" })}>
        {children(labelId)}
      </div>
    </div>
  );
}
