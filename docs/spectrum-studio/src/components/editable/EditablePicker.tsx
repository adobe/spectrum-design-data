// Copyright 2026 Adobe. All rights reserved.
import { LabeledValue, Picker } from "@react-spectrum/s2";
import { css } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ComponentProps, ReactNode } from "react";
import { getFieldLayoutProps } from "../fields/fieldLayout";
import { useIsReadOnly } from "./useIsReadOnly";

type PickerProps = ComponentProps<typeof Picker>;

interface EditablePickerProps extends Omit<PickerProps, "label"> {
  label: ReactNode;
  /** Defaults to "side"; use "top" for a stacked label, including inside a Form. */
  labelPosition?: PickerProps["labelPosition"];
  /** LabeledValue renders text, so the selected item's label cannot be derived from its key. */
  displayValue: string;
  isReadOnly?: boolean;
  /**
   * Side labels default to two equal columns filling the parent's allocated width.
   * "flex" retains Spectrum's content-sized label; explicit top labels stay stacked.
   * Grid width and columns take precedence over caller styles.
   */
  layout?: "flex" | "grid";
}

const quietValueStyles = css("& > span { contain: none !important; }");

export function EditablePicker({
  isReadOnly,
  displayValue,
  layout,
  labelPosition = "side",
  ...props
}: EditablePickerProps) {
  const readOnly = useIsReadOnly(isReadOnly);
  const isGrid = labelPosition === "side" && layout !== "flex";
  const layoutProps = getFieldLayoutProps({
    ...props,
    labelPosition,
    layout,
    UNSAFE_className: [
      props.UNSAFE_className,
      readOnly && props.isQuiet && !isGrid ? quietValueStyles : undefined,
    ]
      .filter(Boolean)
      .join(" "),
    UNSAFE_style: {
      ...(readOnly && props.isQuiet && !isGrid ? { width: "fit-content" } : {}),
      ...props.UNSAFE_style,
    },
  });

  if (readOnly) {
    return (
      <LabeledValue
        label={props.label}
        {...layoutProps}
        labelAlign={props.labelAlign}
        size={props.size}
        contextualHelp={props.contextualHelp}
        value={displayValue}
        styles={props.styles}
      />
    );
  }

  return <Picker {...props} {...layoutProps} />;
}
