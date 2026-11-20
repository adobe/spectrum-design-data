// Copyright 2026 Adobe. All rights reserved.
import { useLayoutEffect, useMemo, type ReactNode } from "react";
import { useStore } from "jotai";
import { useNotify } from "../../components/notifications/notificationContext";
import { workerTask } from "../derived-work/workerTask";
import { boundedExecutor } from "../derived-work/boundedExecutor";
import { createNumericRuntime } from "./numericRuntime";
import { NumericContext } from "./numericContext";
import type { NumericWorkInput, NumericWorkOutput } from "./numericWork";
import { numericDraftPendingAtom } from "./numericState";
import {
  flushPersistedState,
  PERSISTENCE_ISSUE_PREFIXES,
  reportPersistenceIssueAtom,
} from "../../state/persist";

const execute = boundedExecutor(
  workerTask<NumericWorkInput, NumericWorkOutput>(
    () =>
      new Worker(new URL("./numeric.worker.ts", import.meta.url), {
        type: "module",
      }),
  ),
);

export function NumericDraftProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const notify = useNotify();
  const runtime = useMemo(
    () =>
      createNumericRuntime(store, execute, (message) => notify.error(message)),
    [store, notify],
  );
  useLayoutEffect(() => {
    const stop = runtime.start();
    const hide = () => {
      const pending = store.get(numericDraftPendingAtom);
      runtime.pagehide();
      if (!pending) return;
      try {
        flushPersistedState(store);
      } catch (failure) {
        store.set(
          reportPersistenceIssueAtom,
          `${PERSISTENCE_ISSUE_PREFIXES.authoring} ${failure instanceof Error ? failure.message : String(failure)}`,
        );
      }
    };
    // Apply pending edits before the existing bubble-phase persistence flush.
    window.addEventListener("pagehide", hide, true);
    return () => {
      window.removeEventListener("pagehide", hide, true);
      stop();
    };
  }, [runtime, store]);
  return (
    <NumericContext.Provider value={runtime}>
      {children}
    </NumericContext.Provider>
  );
}
