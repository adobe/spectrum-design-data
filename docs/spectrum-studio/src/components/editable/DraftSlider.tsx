// Copyright 2026 Adobe. All rights reserved.
import { ColorSlider, Slider } from "@react-spectrum/s2";
import { useMemo, type ComponentProps } from "react";
import { parseColor, type Color } from "react-aria-components";
import { useSliderDraft } from "./useSliderDraft";

export type DraftSliderProps = Omit<
  ComponentProps<typeof Slider>,
  "defaultValue" | "onChange" | "onChangeEnd"
> & {
  /** Receives live authoring proposals in an edit session, or settled values outside one. */
  onChange?: (value: number) => void;
  /** Updates temporary preview state while dragging, at most once per frame. */
  onPreviewChange?: (value: number) => void;
};

/**
 * Keeps thumb movement local while the shared draft boundary handles previews
 * and accepted writes. Release flushes the latest proposal.
 */
export function DraftSlider({
  value,
  onChange,
  onPreviewChange,
  ...props
}: DraftSliderProps) {
  const draft = useSliderDraft(value, onChange, onPreviewChange);
  return (
    <div {...draft.boundaryProps}>
      <Slider
        {...props}
        key={draft.key}
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
  onPreviewChange?: (value: number) => void;
};

function lightness(color: Color) {
  return color.getChannelValue("lightness") / 100;
}

/** Neutral lightness `ColorSlider` with the same draft-then-save behavior as `DraftSlider`. */
export function DraftLightnessSlider({
  value,
  onChange,
  onPreviewChange,
  ...props
}: DraftLightnessSliderProps) {
  const draft = useSliderDraft(value, onChange, onPreviewChange);
  const shown = draft.value ?? value;
  const color = useMemo(
    () => parseColor(`hsl(0, 0%, ${shown * 100}%)`),
    [shown],
  );
  return (
    <div {...draft.boundaryProps}>
      <ColorSlider
        {...props}
        key={draft.key}
        channel="lightness"
        value={color}
        onChange={(next) => draft.onChange(lightness(next))}
        onChangeEnd={(next) => draft.onChangeEnd(lightness(next))}
      />
    </div>
  );
}
