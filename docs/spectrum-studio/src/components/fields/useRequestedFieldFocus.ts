// Copyright 2026 Adobe. All rights reserved.
import type { TextFieldRef } from "@react-spectrum/s2";
import { useLayoutEffect, useRef } from "react";

export function useRequestedFieldFocus(
  requested: boolean,
  onFocused?: () => void,
) {
  const ref = useRef<TextFieldRef>(null);
  useLayoutEffect(() => {
    const field = ref.current;
    if (!requested || !field) return;
    field.focus();
    const input = field.getInputElement();
    if (input && input.ownerDocument.activeElement === input) {
      input.scrollIntoView({ block: "nearest" });
      onFocused?.();
    }
  }, [requested, onFocused]);
  return ref;
}
