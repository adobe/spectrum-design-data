// Copyright 2026 Adobe. All rights reserved.
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { atom, useAtomValue } from "jotai";
import { useNumericRuntime } from "../../features/edit-session/numericContext";
import { numericDraftResetAtom } from "../../features/edit-session/numericState";

const boundaryStyle: CSSProperties = { display: "contents" };
const unscopedAtom = atom("");

type SliderValue = number | readonly number[];

function sliderNumber(value: SliderValue) {
  return typeof value === "number" ? value : value[0];
}

export function sliderPreviewEvents(
  publish: (value: number) => void,
  requestFrame: (callback: () => void) => number,
  cancelFrame: (handle: number) => void,
) {
  let frame: number | undefined;
  let latest: number | undefined;
  let revision = 0;
  const cancel = () => {
    revision += 1;
    if (frame !== undefined) cancelFrame(frame);
    frame = undefined;
    latest = undefined;
  };
  return {
    change(value: number) {
      latest = value;
      if (frame !== undefined) return;
      const current = revision;
      frame = requestFrame(() => {
        if (current !== revision) return;
        frame = undefined;
        const next = latest;
        latest = undefined;
        if (next !== undefined) publish(next);
      });
    },
    cancel,
  };
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
  keepUntilAccepted = false,
) {
  const finish = (next: SliderValue) => {
    const settled = sliderNumber(next);
    pending.current = undefined;
    setDraft(keepUntilAccepted ? settled : undefined);
    if (keepUntilAccepted || !Object.is(settled, value)) save?.(settled);
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
 * Keeps the thumb local while frame-coalescing live authoring proposals or
 * explicit adaptive previews. Outside a numeric edit session, `save` retains
 * its settle-only behavior. The boundary also flushes keyboard and assistive
 * changes that do not produce a pointer-release event.
 */
export function useSliderDraft(
  value: number | undefined,
  save?: (value: number) => void,
  onPreviewChange?: (value: number) => void,
) {
  const runtime = useNumericRuntime();
  const scope = useAtomValue(runtime?.scopeAtom ?? unscopedAtom);
  const reset = useAtomValue(numericDraftResetAtom);
  const instance = useId();
  const id = `${instance}:${scope}`;
  const live = !!runtime && !!save && value !== undefined && !onPreviewChange;
  const [draft, setDraft] = useState<number>();
  const pending = useRef<number | undefined>(undefined);
  const publish = (next: number) => {
    if (onPreviewChange) onPreviewChange(next);
    else if (live) runtime.capture(id, () => save?.(next));
  };
  const previewCallback = useRef(publish);
  useLayoutEffect(() => {
    previewCallback.current = publish;
  });
  const [preview] = useState(() =>
    sliderPreviewEvents(
      (next) => previewCallback.current?.(next),
      (callback) => requestAnimationFrame(callback),
      (handle) => cancelAnimationFrame(handle),
    ),
  );
  useLayoutEffect(() => preview.cancel, [preview]);
  useLayoutEffect(() => {
    pending.current = undefined;
    preview.cancel();
    setDraft(undefined);
    return () => {
      preview.cancel();
      runtime?.release(id);
    };
  }, [scope, reset, preview, runtime, id]);
  useLayoutEffect(() => {
    if (Object.is(draft, value)) setDraft(undefined);
  }, [draft, value]);
  const { onChange, onChangeEnd, flush } = sliderDraftEvents(
    pending,
    value,
    setDraft,
    live
      ? (next) => {
          runtime.capture(id, () => save?.(next));
          runtime.settle();
        }
      : save,
    live,
  );
  const finish = (next: SliderValue) => {
    preview.cancel();
    onChangeEnd(next);
  };
  const finishPending = () => {
    preview.cancel();
    flush();
  };
  return {
    key: `${scope}:${reset}`,
    value: draft ?? value,
    onChange: (next: SliderValue) => {
      onChange(next);
      if (onPreviewChange || live) preview.change(sliderNumber(next));
    },
    onChangeEnd: finish,
    boundaryProps: {
      style: boundaryStyle,
      onChange: finishPending,
      onBlur: finishPending,
    },
  };
}
