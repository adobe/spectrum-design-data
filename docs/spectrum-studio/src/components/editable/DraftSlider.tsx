// Copyright 2026 Adobe. All rights reserved.
import { ColorSlider, Slider } from "@react-spectrum/s2";
import { useMemo, type ComponentProps } from "react";
import { parseColor, type Color } from "react-aria-components";
import { useSliderDraft } from "./useSliderDraft";

export type DraftSliderProps = Omit<
  ComponentProps<typeof Slider>,
  "defaultValue" | "onChange" | "onChangeEnd"
> & {
  /** Saves a settled value: on release, each keyboard step, or an assistive-technology change. */
  onChange?: (value: number) => void;
};

/**
 * Spectrum `Slider` that keeps an in-progress drag local and saves through
 * `onChange` only when the value settles.
 */
export function DraftSlider({ value, onChange, ...props }: DraftSliderProps) {
  const draft = useSliderDraft(value, onChange);
  return (
    <div {...draft.boundaryProps}>
      <Slider
        {...props}
        value={draft.value}
        onChange={draft.onChange}
        onChangeEnd={draft.onChangeEnd}
      />
    </div>
  );
}

export type DraftLightnessSliderProps = Omit<
  ComponentProps<typeof ColorSlider>,
  | "channel"
  | "colorSpace"
  | "defaultValue"
  | "value"
  | "onChange"
  | "onChangeEnd"
> & {
  /** Lightness from 0 to 1. */
  value: number;
  /** Saves a settled lightness from 0 to 1, like `DraftSlider`. */
  onChange: (value: number) => void;
};

function lightness(color: Color) {
  return color.getChannelValue("lightness") / 100;
}

/** Neutral lightness `ColorSlider` with the same draft-then-save behavior as `DraftSlider`. */
export function DraftLightnessSlider({
  value,
  onChange,
  ...props
}: DraftLightnessSliderProps) {
  const draft = useSliderDraft(value, onChange);
  const shown = draft.value ?? value;
  const color = useMemo(
    () => parseColor(`hsl(0, 0%, ${shown * 100}%)`),
    [shown],
  );
  return (
    <div {...draft.boundaryProps}>
      <ColorSlider
        {...props}
        channel="lightness"
        value={color}
        onChange={(next) => draft.onChange(lightness(next))}
        onChangeEnd={(next) => draft.onChangeEnd(lightness(next))}
      />
    </div>
  );
}
