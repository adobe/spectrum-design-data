// Copyright 2026 Adobe. All rights reserved.
import { useSyncExternalStore } from "react";
import { getAppStatus } from "./status";
import { appStatusStore } from "./store";

export function useAppStatus() {
  const snapshot = useSyncExternalStore(
    appStatusStore.subscribe,
    appStatusStore.getSnapshot,
  );
  return getAppStatus(snapshot);
}
