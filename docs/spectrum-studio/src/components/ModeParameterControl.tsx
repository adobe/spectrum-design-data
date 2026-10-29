// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  ColorSlider,
  DialogTrigger,
  Picker,
  Popover,
  Slider,
} from "@react-spectrum/s2";
import { Dialog } from "react-aria-components";
import { parseColor } from "react-aria-components";
import { useEffect, useRef, type ComponentRef } from "react";
import { MAX_CONTRAST_MULTIPLIER } from "../features/color-system/polarity";
import {
  TEXT_ZOOM_RANGE,
  type FoundationDocuments,
  type FoundationParameterDefinition,
} from "../features/modes/parameters";
import { ColorScalePicker } from "./color-picker/ColorScalePicker";
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
  useEffect(() => {
    if (!focusOnMount) return;
    if (sliderRef.current || pickerRef.current)
      (sliderRef.current ?? pickerRef.current)?.focus();
    // ColorSlider exposes a public DOM ref, not a focusable ref.
    else
      colorRef.current
        ?.UNSAFE_getDOMNode()
        ?.querySelector<HTMLInputElement>('input[type="range"]')
        ?.focus();
  }, [focusOnMount]);
  switch (parameter.control) {
    case "shadowDepth":
      return (
        <Slider
          label={`${parameter.label} (%)`}
          value={Number(value)}
          minValue={0}
          maxValue={200}
          step={1}
          ref={sliderRef}
          onChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
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
        <Slider
          label={parameter.label}
          value={Number(value)}
          {...TEXT_ZOOM_RANGE}
          ref={sliderRef}
          formatOptions={{ signDisplay: "exceptZero" }}
          onChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
        />
      );
    case "contrastMultiplier":
      return (
        <Slider
          label={parameter.label}
          value={Number(value)}
          minValue={0}
          maxValue={MAX_CONTRAST_MULTIPLIER}
          step={0.01}
          ref={sliderRef}
          formatOptions={{ style: "percent" }}
          onChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
        />
      );
    case "backgroundLightness":
      return (
        <ColorSlider
          label={parameter.label}
          channel="lightness"
          UNSAFE_style={{ width: "100%" }}
          ref={colorRef}
          value={parseColor(`hsl(0, 0%, ${Number(value) * 100}%)`)}
          onChange={(next) => {
            if (next) onChange(next.getChannelValue("lightness") / 100);
          }}
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
