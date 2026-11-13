// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  ColorSlider,
  Content,
  ContextualHelp,
  DialogTrigger,
  Heading,
  Picker,
  Popover,
  Slider,
} from "@react-spectrum/s2";
import { Dialog } from "react-aria-components";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { MAX_CONTRAST_MULTIPLIER } from "../features/color-system/polarity";
import {
  TEXT_ZOOM_RANGE,
  type FoundationDocuments,
  type FoundationParameterDefinition,
} from "../features/modes/parameters";
import { ColorScalePicker } from "./color-picker/ColorScalePicker";
import { DraftLightnessSlider, DraftSlider } from "./editable/DraftSlider";
import { NumberField } from "./fields/NumberField";
import { ColorPickerContents } from "./color-picker/ColorPickerContents";
import { popoverDialogStyles } from "./popoverLayout";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

export function ModeParameterControl({
  parameter,
  value,
  documents,
  onChange,
  focusOnMount = false,
}: {
  parameter: FoundationParameterDefinition;
  value: string | number;
  documents: FoundationDocuments;
  onChange: (value: string | number) => void;
  focusOnMount?: boolean;
}) {
  const sliderRef = useRef<ComponentRef<typeof Slider>>(null);
  const pickerRef = useRef<ComponentRef<typeof Picker>>(null);
  const colorRef = useRef<ComponentRef<typeof ColorSlider>>(null);
  const numberRef = useRef<ComponentRef<typeof NumberField>>(null);
  const [editingPercentage, setEditingPercentage] = useState(false);
  const contextualHelp = parameter.description ? (
    <ContextualHelp>
      <Heading>{parameter.label}</Heading>
      <Content>{parameter.description}</Content>
    </ContextualHelp>
  ) : undefined;
  useEffect(() => {
    if (!focusOnMount) return;
    if (sliderRef.current || pickerRef.current || numberRef.current)
      (sliderRef.current ?? pickerRef.current ?? numberRef.current)?.focus();
    // ColorSlider exposes a public DOM ref, not a focusable ref.
    else
      colorRef.current
        ?.UNSAFE_getDOMNode()
        ?.querySelector<HTMLInputElement>('input[type="range"]')
        ?.focus();
  }, [focusOnMount]);
  switch (parameter.control) {
    case "sizingPercentage":
      return (
        <NumberField
          label={parameter.label}
          contextualHelp={contextualHelp}
          value={Number(value)}
          ref={numberRef}
          onFocusChange={setEditingPercentage}
          formatOptions={{
            style: "percent",
            maximumFractionDigits: editingPercentage ? 20 : 2,
          }}
          onChange={(next) => {
            if (Number.isFinite(next) && next > 0) onChange(next);
          }}
          validate={(next) =>
            Number.isFinite(next) && next > 0
              ? null
              : "Enter a percentage greater than zero."
          }
        />
      );
    case "shadowDepth":
      return (
        <DraftSlider
          label={`${parameter.label} (%)`}
          value={Number(value)}
          minValue={0}
          maxValue={200}
          step={1}
          ref={sliderRef}
          onChange={onChange}
        />
      );
    case "shadowColor":
      return (
        <DialogTrigger>
          <ActionButton aria-label="Edit shadow color">
            <span
              aria-hidden="true"
              style={{
                width: 16,
                height: 16,
                backgroundColor: String(value),
                border: "1px solid currentColor",
                borderRadius: 4,
              }}
            />
            {parameter.label}
          </ActionButton>
          <Popover size="M" padding="none">
            <Dialog
              aria-label="Shadow color"
              className={`${popoverDialogStyles} ${style({ padding: 16 })}`}
            >
              <ColorPickerContents
                color={String(value)}
                showGamutPicker={false}
                onChange={(color) => onChange(color)}
              />
            </Dialog>
          </Popover>
        </DialogTrigger>
      );
    case "textZoom":
      return (
        <DraftSlider
          label={parameter.label}
          contextualHelp={contextualHelp}
          value={Number(value)}
          {...TEXT_ZOOM_RANGE}
          ref={sliderRef}
          formatOptions={{ signDisplay: "exceptZero" }}
          onChange={onChange}
        />
      );
    case "contrastMultiplier":
      return (
        <DraftSlider
          label={parameter.label}
          value={Number(value)}
          minValue={0}
          maxValue={MAX_CONTRAST_MULTIPLIER}
          step={0.01}
          ref={sliderRef}
          formatOptions={{ style: "percent" }}
          onChange={onChange}
        />
      );
    case "backgroundLightness":
      return (
        <DraftLightnessSlider
          label={parameter.label}
          UNSAFE_style={{ width: "100%" }}
          ref={colorRef}
          value={Number(value)}
          onChange={onChange}
        />
      );
    case "backgroundScale":
      if (!documents.color)
        throw new Error("Color scale selection requires a color document.");
      return (
        <ColorScalePicker
          ref={pickerRef}
          label={parameter.label}
          document={documents.color}
          selectedKey={String(value)}
          onSelectionChange={onChange}
          isReadOnly={false}
        />
      );
  }
}
