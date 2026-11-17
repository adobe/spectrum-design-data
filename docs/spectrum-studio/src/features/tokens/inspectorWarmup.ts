// Copyright 2026 Adobe. All rights reserved.
import { atom, type Atom, type createStore } from "jotai";
import { componentTokensAtom } from "../components/state";
import { shippedTokenIdsAtom, tokenDialogCatalogAtom } from "./dialogState";

type Store = ReturnType<typeof createStore>;
export type IdleScheduler = (task: () => void) => () => void;

export const tokenUsageCatalogAtom = atom((get) => {
  try {
    return { tokens: get(componentTokensAtom), error: undefined };
  } catch (failure) {
    return {
      tokens: [],
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
});

export const tokenInspectorDataAtom = atom((get) => ({
  catalog: get(tokenDialogCatalogAtom),
  provenance: get(shippedTokenIdsAtom),
  usageCatalog: get(tokenUsageCatalogAtom),
}));

/** True once the inspector's derived data has been computed at least once. */
export const tokenInspectorWarmAtom = atom(false);

export const idleScheduler: IdleScheduler = (task) => {
  if (typeof requestIdleCallback === "function") {
    const handle = requestIdleCallback(task, { timeout: 2000 });
    return () => cancelIdleCallback(handle);
  }
  const handle = setTimeout(task, 50);
  return () => clearTimeout(handle);
};

/** Runs `task` once the browser has painted the current frame. */
export function afterNextPaint(task: () => void): () => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const frame = requestAnimationFrame(() => {
    timeout = setTimeout(task, 0);
  });
  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(timeout);
  };
}

/**
 * Reads each atom in its own idle slot so its value is cached before it is
 * needed, then sets `doneAtom`. Returns a cancel function.
 */
export function warmAtomsWhenIdle(
  store: Store,
  atoms: readonly Atom<unknown>[],
  doneAtom: typeof tokenInspectorWarmAtom,
  schedule: IdleScheduler = idleScheduler,
): () => void {
  if (store.get(doneAtom)) return () => {};
  let cancel: () => void = () => {};
  let stopped = false;
  const step = (index: number) => {
    cancel = schedule(() => {
      if (stopped || store.get(doneAtom)) return;
      if (index >= atoms.length) {
        store.set(doneAtom, true);
        return;
      }
      try {
        store.get(atoms[index]);
      } catch {
        // Failures surface when the dialog reads the same atom.
      }
      step(index + 1);
    });
  };
  step(0);
  return () => {
    stopped = true;
    cancel();
  };
}

export function scheduleTokenInspectorWarmup(
  store: Store,
  schedule?: IdleScheduler,
): () => void {
  return warmAtomsWhenIdle(
    store,
    [
      tokenDialogCatalogAtom,
      shippedTokenIdsAtom,
      tokenUsageCatalogAtom,
      tokenInspectorDataAtom,
    ],
    tokenInspectorWarmAtom,
    schedule,
  );
}
