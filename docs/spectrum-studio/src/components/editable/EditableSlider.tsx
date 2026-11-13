// Copyright 2026 Adobe. All rights reserved.
import { LabeledValue } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ReactNode } from "react";
import { DraftSlider, type DraftSliderProps } from "./DraftSlider";
import { useIsReadOnly } from "./useIsReadOnly";
import "./EditableSlider.css";

interface EditableSliderProps extends Omit<DraftSliderProps, "label"> {
  label: ReactNode;
  isReadOnly?: boolean;
  labelGap?: "compact";
}

export function EditableSlider({
  isReadOnly,
  labelGap,
  ...props
}: EditableSliderProps) {
  const readOnly = useIsReadOnly(isReadOnly);

  if (readOnly) {
    return (
      <LabeledValue
        label={props.label}
        labelPosition={props.labelPosition}
        value={props.value ?? 0}
        formatOptions={props.formatOptions}
      />
    );
  }

  return (
    <DraftSlider
      UNSAFE_className={`${style({ width: "full", maxWidth: 420 })}${labelGap === "compact" ? " editableSliderCompactLabel" : ""}`}
      {...props}
    />
  );
}
