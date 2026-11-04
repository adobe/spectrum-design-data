// Copyright 2026 Adobe. All rights reserved.
import type { AppStatusSnapshot } from "./status";

export function createAppStatusStore(isOnline: boolean) {
  let snapshot: AppStatusSnapshot = { isOnline, updateAvailable: false };
  let applyUpdateHandler: () => void = () => {};
  const listeners = new Set<() => void>();

  const update = (next: Partial<AppStatusSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setOnline: (value: boolean) => update({ isOnline: value }),
    setUpdateAvailable: (value: boolean) => update({ updateAvailable: value }),
    setApplyUpdate(handler: () => void) {
      applyUpdateHandler = handler;
    },
    applyUpdate: () => applyUpdateHandler(),
  };
}

export const appStatusStore = createAppStatusStore(
  typeof navigator === "undefined" ? true : navigator.onLine,
);
