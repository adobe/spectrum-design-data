// Copyright 2026 Adobe. All rights reserved.
import { LabeledValue } from "@react-spectrum/s2";
import type { ComponentProps, ReactNode } from "react";
import { NumberField } from "../fields/NumberField";
import { getFieldLayoutProps } from "../fields/fieldLayout";
import { useIsReadOnly } from "./useIsReadOnly";

type NumberFieldProps = ComponentProps<typeof NumberField>;

interface EditableNumberFieldProps extends Omit<NumberFieldProps, "label"> {
  label?: ReactNode;
  isReadOnly?: boolean;
  size?: NumberFieldProps["size"];
}

export function EditableNumberField({
  isReadOnly,
  labelPosition = "side",
  layout,
  ...props
}: EditableNumberFieldProps) {
  const readOnly = useIsReadOnly(isReadOnly);

  if (readOnly) {
    return (
      <LabeledValue
        label={props.label}
        {...getFieldLayoutProps({ ...props, labelPosition, layout })}
        labelAlign={props.labelAlign}
        size={props.size}
        contextualHelp={props.contextualHelp}
        styles={props.styles}
        value={props.value ?? props.defaultValue ?? 0}
        formatOptions={props.formatOptions}
      />
    );
  }

  return (
    <NumberField {...props} labelPosition={labelPosition} layout={layout} />
  );
}
