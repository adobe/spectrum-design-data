// Copyright 2026 Adobe. All rights reserved.
import { useRef, useState, type CSSProperties } from "react";

const boundaryStyle: CSSProperties = { display: "contents" };

type SliderValue = number | readonly number[];

function sliderNumber(value: SliderValue) {
  return typeof value === "number" ? value : value[0];
}

/**
 * Slider event handlers that call `save` once per settled value. `pending`
 * holds an unsaved position between renders; `setDraft` shows it until the
 * saved `value` catches up.
 */
export function sliderDraftEvents(
  pending: { current: number | undefined },
  value: number | undefined,
  setDraft: (draft: number | undefined) => void,
  save?: (value: number) => void,
) {
  const finish = (next: SliderValue) => {
    const settled = sliderNumber(next);
    pending.current = undefined;
    setDraft(undefined);
    if (!Object.is(settled, value)) save?.(settled);
  };
  return {
    onChange: (next: SliderValue) => {
      pending.current = sliderNumber(next);
      // An uncontrolled slider keeps its own position.
      if (value !== undefined) setDraft(pending.current);
    },
    onChangeEnd: finish,
    flush: () => {
      if (pending.current !== undefined) finish(pending.current);
    },
  };
}

/**
 * Keeps a slider's in-progress position inside the slider, so a drag
 * re-renders only the slider instead of every consumer of the saved value.
 *
 * `save` runs once per settled value: on pointer release, on each keyboard
 * step, and on assistive-technology changes. Assistive technology changes the
 * native range input without an end event, so spread `boundaryProps` on an
 * element wrapping the slider to save those changes immediately.
 */
export function useSliderDraft(
  value: number | undefined,
  save?: (value: number) => void,
) {
  const [draft, setDraft] = useState<number>();
  const pending = useRef<number | undefined>(undefined);
  const { onChange, onChangeEnd, flush } = sliderDraftEvents(
    pending,
    value,
    setDraft,
    save,
  );
  return {
    value: draft ?? value,
    onChange,
    onChangeEnd,
    boundaryProps: { style: boundaryStyle, onChange: flush, onBlur: flush },
  };
}
