// Copyright 2026 Adobe. All rights reserved.
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  type FormEvent,
  type PointerEvent,
  type KeyboardEvent,
  type ComponentProps,
} from "react";
import type { NumberField } from "@react-spectrum/s2";
import { atom, useAtomValue } from "jotai";
import { selectAtom } from "jotai/utils";
import { NumberStateObserver, type NumberState } from "./NumberStateObserver";
import { useNumericRuntime } from "../../features/edit-session/numericContext";
import {
  numericDraftResetAtom,
  numericDraftStateAtom,
} from "../../features/edit-session/numericState";

type Props = ComponentProps<typeof NumberField>;
interface InputSession {
  key: string;
  state: NumberState | null;
  raw?: string;
  pending?: string;
  invalid: boolean;
  stepping: boolean;
  frame?: number;
  sent?: { value: number; source: number | undefined };
}
const boundaryStyle = { display: "contents" } as const;
const unscopedAtom = atom("");

export function numericInputError(
  value: number,
  props: Pick<Props, "minValue" | "maxValue" | "validate">,
) {
  if (
    !Number.isFinite(value) ||
    (props.minValue !== undefined && value < props.minValue) ||
    (props.maxValue !== undefined && value > props.maxValue)
  )
    return "Enter a valid number within this field's range.";
  const validation = props.validate?.(value);
  return typeof validation === "string"
    ? validation || undefined
    : Array.isArray(validation)
      ? validation.join(" ") || undefined
      : undefined;
}

export function useNumericDraft(props: Props) {
  const runtime = useNumericRuntime();
  const scope = useAtomValue(runtime?.scopeAtom ?? unscopedAtom);
  const reset = useAtomValue(numericDraftResetAtom);
  const instance = useId();
  const id = `${instance}:${scope}`;
  const errorAtom = useMemo(
    () => selectAtom(numericDraftStateAtom, (state) => state.errors.get(id)),
    [id],
  );
  const error = useAtomValue(errorAtom);
  const enabled =
    !!runtime &&
    !!props.label &&
    props.value !== undefined &&
    !props.isReadOnly &&
    !props.isDisabled;
  const [local, setLocal] = useState({
    scope,
    reset,
    owned: false,
    value: props.value,
    focused: false,
  });
  const session = useMemo<InputSession>(
    () => ({
      key: `${scope}:${reset}`,
      state: null,
      invalid: false,
      stepping: false,
    }),
    [scope, reset],
  );
  if (local.scope !== scope || local.reset !== reset) {
    setLocal({
      scope,
      reset,
      owned: false,
      value: props.value,
      focused: false,
    });
  } else if (
    local.owned &&
    !local.focused &&
    !session.invalid &&
    Object.is(props.value, session.sent?.value)
  )
    setLocal({ ...local, owned: false });

  useLayoutEffect(
    () => () => {
      if (session.frame !== undefined) cancelAnimationFrame(session.frame);
      runtime?.release(id);
    },
    [runtime, id, session, enabled],
  );

  const submit = (value: number) => {
    if (!runtime || !Number.isFinite(value)) return;
    if (
      Object.is(session.sent?.value, value) &&
      Object.is(session.sent?.source, props.value)
    )
      return;
    if (runtime.capture(id, () => props.onChange?.(value)))
      session.sent = { value, source: props.value };
  };
  const receive = (next: NumberState) => {
    session.state = next;
    if (
      session.pending === undefined &&
      session.invalid &&
      !local.focused &&
      session.raw !== undefined &&
      next.inputValue !== session.raw
    ) {
      next.setInputValue(session.raw);
      return;
    }
    if (session.pending === undefined || session.pending !== next.inputValue)
      return;
    session.pending = undefined;
    session.raw = next.inputValue;
    const value = next.numberValue;
    const error = numericInputError(value, props);
    session.invalid = !!error;
    runtime?.setError(id, error);
    if (!session.invalid) submit(value);
  };
  const receiver = useRef(receive);
  useLayoutEffect(() => {
    receiver.current = receive;
  });
  return {
    enabled,
    key: session.key,
    value: local.owned ? local.value : props.value,
    label: enabled ? (
      <>
        {props.label}
        <NumberStateObserver observe={receive} />
      </>
    ) : (
      props.label
    ),
    error,
    onChange(value: number) {
      if (!enabled) {
        props.onChange?.(value);
        return;
      }
      if (session.invalid && !session.stepping) return;
      if (!Number.isFinite(value)) {
        session.invalid = true;
        runtime?.setError(
          id,
          "Enter a valid number within this field's range.",
        );
        return;
      }
      session.invalid = false;
      runtime?.setError(id);
      setLocal((previous) => ({ ...previous, owned: true, value }));
      submit(value);
    },
    boundaryProps: {
      style: boundaryStyle,
      onFocusCapture() {
        setLocal((previous) => ({
          ...previous,
          focused: true,
          owned: true,
          value: previous.owned ? previous.value : props.value,
        }));
      },
      onInputCapture(event: FormEvent<HTMLSpanElement>) {
        if (!(event.target instanceof HTMLInputElement)) return;
        session.stepping = false;
        session.pending = event.target.value;
        session.raw = event.target.value;
        if (session.frame !== undefined) cancelAnimationFrame(session.frame);
        session.frame = requestAnimationFrame(() => {
          session.frame = undefined;
          if (session.state) receiver.current(session.state);
          if (session.pending !== undefined)
            runtime?.setError(id, "Finish entering this number.");
        });
      },
      onPointerDownCapture(event: PointerEvent<HTMLSpanElement>) {
        session.stepping =
          event.target instanceof Element &&
          !!event.target.closest('[slot="increment"],[slot="decrement"]');
      },
      onKeyDownCapture(event: KeyboardEvent<HTMLSpanElement>) {
        session.stepping = [
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          "Home",
          "End",
        ].includes(event.key);
      },
      onKeyUp(event: KeyboardEvent<HTMLSpanElement>) {
        if ((session.stepping || event.key === "Enter") && !session.invalid)
          runtime?.settle();
      },
      onPointerUp() {
        if (session.stepping && !session.invalid) runtime?.settle();
      },
      onBlur() {
        setLocal((previous) => ({ ...previous, focused: false }));
        if (session.invalid && session.raw !== undefined)
          session.state?.setInputValue(session.raw);
        else runtime?.settle();
      },
    },
  };
}
