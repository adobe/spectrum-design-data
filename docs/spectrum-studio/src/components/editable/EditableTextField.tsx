// Copyright 2026 Adobe. All rights reserved.
import { LabeledValue, TextField } from "@react-spectrum/s2";
import type { ComponentProps, ReactNode } from "react";
import { useIsReadOnly } from "./useIsReadOnly";

type TextFieldProps = ComponentProps<typeof TextField>;

interface EditableTextFieldProps extends Omit<TextFieldProps, "label"> {
  label: ReactNode;
  isReadOnly?: boolean;
}

export function EditableTextField({
  isReadOnly,
  ...props
}: EditableTextFieldProps) {
  const readOnly = useIsReadOnly(isReadOnly);

  if (readOnly) {
    return (
      <LabeledValue
        label={props.label}
        labelPosition={props.labelPosition}
        value={props.value ?? ""}
      />
    );
  }

  return <TextField {...props} />;
}
