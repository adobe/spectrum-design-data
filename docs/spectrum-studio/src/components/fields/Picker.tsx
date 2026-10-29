// Copyright 2026 Adobe. All rights reserved.
import { Picker as SpectrumPicker } from "@react-spectrum/s2";
import type { ComponentProps } from "react";
import { getFieldLayoutProps, type FieldLayoutProps } from "./fieldLayout";

export type PickerProps = ComponentProps<typeof SpectrumPicker> &
  FieldLayoutProps;

/** Layout-only wrapper: retains Spectrum's collection, refs, and editing behavior. */
export function Picker({
  layout,
  labelPosition = "side",
  ...props
}: PickerProps) {
  return (
    <SpectrumPicker
      {...props}
      {...getFieldLayoutProps({ ...props, labelPosition, layout })}
    />
  );
}
