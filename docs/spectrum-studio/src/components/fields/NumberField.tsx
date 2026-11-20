// Copyright 2026 Adobe. All rights reserved.
import { NumberField as SpectrumNumberField } from "@react-spectrum/s2";
import type { ComponentProps } from "react";
import { getFieldLayoutProps, type FieldLayoutProps } from "./fieldLayout";
import { useNumericDraft } from "../editable/useNumericDraft";

export type NumberFieldProps = ComponentProps<typeof SpectrumNumberField> &
  FieldLayoutProps;

/** Retains Spectrum's number handling while isolating opted-in authoring drafts. */
export function NumberField({
  layout,
  labelPosition = "side",
  labelWidth,
  ...props
}: NumberFieldProps) {
  const draft = useNumericDraft(props);
  const field = (
    <SpectrumNumberField
      {...props}
      key={draft.enabled ? draft.key : undefined}
      label={draft.label}
      value={draft.enabled ? draft.value : props.value}
      onChange={draft.onChange}
      isInvalid={props.isInvalid || (draft.enabled && !!draft.error)}
      errorMessage={(draft.enabled && draft.error) || props.errorMessage}
      {...getFieldLayoutProps({ ...props, labelPosition, layout, labelWidth })}
    />
  );
  return draft.enabled ? <span {...draft.boundaryProps}>{field}</span> : field;
}
