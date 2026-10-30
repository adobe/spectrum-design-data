// Copyright 2026 Adobe. All rights reserved.
import { PickerItem, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useMemo, type ComponentProps } from "react";
import type { ColorSystemDocument } from "../../features/color-system/model";
import { buildScaleData } from "../../features/color-system/scaleGeneration";
import { EditablePicker } from "../editable";
import { termLabel } from "../../features/taxonomy/termPresentation";

interface ColorScalePickerProps extends Omit<
  ComponentProps<typeof EditablePicker>,
  | "children"
  | "items"
  | "displayValue"
  | "selectedKey"
  | "defaultSelectedKey"
  | "onSelectionChange"
  | "selectionMode"
  | "value"
  | "defaultValue"
  | "onChange"
  | "renderValue"
> {
  document: Pick<ColorSystemDocument, "scales" | "settings">;
  selectedKey: string;
  onSelectionChange: (scaleId: string) => void;
  baseOption?: { id: string; label: string };
  baseOptions?: readonly { id: string; label: string; isDisabled?: boolean }[];
}

const gradientStyles = style({
  display: "inline-block",
  flexShrink: 0,
  width: 32,
  height: 18,
  borderRadius: "sm",
});

export function ColorScalePicker({
  document,
  selectedKey,
  onSelectionChange,
  baseOption,
  baseOptions = [],
  labelPosition = "side",
  ...props
}: ColorScalePickerProps) {
  const items = useMemo(
    () =>
      document.scales.map((scale) => ({
        id: scale.id,
        name: termLabel(scale.name),
        gradient: `linear-gradient(to right, ${buildScaleData(
          scale,
          document.settings.colorOutput,
        )
          .ramp.map((color) => color.css)
          .join(", ")})`,
      })),
    [document.scales, document.settings.colorOutput],
  );
  const options = baseOption ? [baseOption, ...baseOptions] : baseOptions;
  const displayValue =
    options.find((option) => option.id === selectedKey)?.label ??
    items.find((item) => item.id === selectedKey)?.name ??
    "Unavailable source";

  return (
    <EditablePicker
      {...props}
      labelPosition={labelPosition}
      selectedKey={selectedKey}
      displayValue={displayValue}
      onSelectionChange={(key) => {
        if (key !== null) onSelectionChange(String(key));
      }}
    >
      {options.map((option) => (
        <PickerItem
          key={option.id}
          id={option.id}
          textValue={option.label}
          isDisabled={"isDisabled" in option && option.isDisabled}
        >
          {option.label}
        </PickerItem>
      ))}
      {items.map((item) => (
        <PickerItem key={item.id} id={item.id} textValue={item.name}>
          <div
            slot="icon"
            data-testid="base-color-scale-gradient"
            data-color-scale-id={item.id}
            className={gradientStyles}
            style={{ background: item.gradient }}
            aria-hidden="true"
          />
          <Text slot="label">{item.name}</Text>
        </PickerItem>
      ))}
    </EditablePicker>
  );
}
