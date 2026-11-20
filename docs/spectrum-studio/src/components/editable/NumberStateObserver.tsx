// Copyright 2026 Adobe. All rights reserved.
import { useContext, useLayoutEffect, type ContextType } from "react";
import { NumberFieldStateContext } from "react-aria-components";

export type NumberState = NonNullable<
  ContextType<typeof NumberFieldStateContext>
>;

// The existing label places this observer inside RAC's public state context.
export function NumberStateObserver({
  observe,
}: {
  observe: (state: NumberState) => void;
}) {
  const state = useContext(NumberFieldStateContext);
  useLayoutEffect(() => {
    if (state) observe(state);
  }, [state, observe]);
  return null;
}
