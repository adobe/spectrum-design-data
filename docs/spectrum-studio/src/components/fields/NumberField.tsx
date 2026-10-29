// Copyright 2026 Adobe. All rights reserved.
import { NumberField as SpectrumNumberField } from "@react-spectrum/s2";
import type { ComponentProps } from "react";
import { getFieldLayoutProps, type FieldLayoutProps } from "./fieldLayout";

export type NumberFieldProps = ComponentProps<typeof SpectrumNumberField> &
  FieldLayoutProps;

/** Layout-only wrapper: retains Spectrum's number handling, refs, and editing behavior. */
export function NumberField({
  layout,
  labelPosition = "side",
  ...props
}: NumberFieldProps) {
  return (
    <SpectrumNumberField
      {...props}
      {...getFieldLayoutProps({ ...props, labelPosition, layout })}
    />
  );
}
