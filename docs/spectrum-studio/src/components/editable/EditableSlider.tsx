// Copyright 2026 Adobe. All rights reserved.
import { LabeledValue, Slider } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ComponentProps, ReactNode } from "react";
import { useIsReadOnly } from "./useIsReadOnly";

type SliderProps = ComponentProps<typeof Slider>;

interface EditableSliderProps extends Omit<SliderProps, "label"> {
  label: ReactNode;
  isReadOnly?: boolean;
}

export function EditableSlider({ isReadOnly, ...props }: EditableSliderProps) {
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
    <Slider
      UNSAFE_className={String(style({ width: "full", maxWidth: 420 }))}
      {...props}
    />
  );
}
