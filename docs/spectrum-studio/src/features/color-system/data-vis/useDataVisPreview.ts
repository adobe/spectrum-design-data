// Copyright 2026 Adobe. All rights reserved.
import { atom, useAtomValue, useStore } from "jotai";
import { useMemo, useSyncExternalStore } from "react";
import { useNumericRuntime } from "../../edit-session/numericContext";
import { browserDataVisPreviewAtom } from "./preview";
import {
  createDataVisPreviewRuntime,
  type DataVisPreviewState,
} from "./previewRuntime";

const runtimes = new WeakMap<
  ReturnType<typeof useStore>,
  ReturnType<typeof createDataVisPreviewRuntime>
>();
const inactive = atom(undefined);
const noSubscribe = () => () => {};
export function useDataVisPreview(): DataVisPreviewState & {
  retry: () => void;
} {
  const store = useStore();
  const numeric = useNumericRuntime();
  const runtime = useMemo(() => {
    let runtime = runtimes.get(store);
    if (!runtime) {
      runtime = createDataVisPreviewRuntime(
        store,
        () =>
          new Worker(new URL("./preview.worker.ts", import.meta.url), {
            type: "module",
          }),
      );
      runtimes.set(store, runtime);
    }
    return runtime;
  }, [store]);
  const state = useSyncExternalStore(
    numeric ? runtime.subscribe : noSubscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  );
  const accepted = useAtomValue(numeric ? inactive : browserDataVisPreviewAtom);
  return numeric
    ? { ...state, retry: runtime.retry }
    : { status: "ready", ready: accepted, retry: runtime.retry };
}
