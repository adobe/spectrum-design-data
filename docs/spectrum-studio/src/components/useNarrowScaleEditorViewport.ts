// Copyright 2026 Adobe. All rights reserved.
import { useSyncExternalStore } from "react";

function subscribeToViewport(onChange: () => void) {
  const query = window.matchMedia("(max-width: 640px)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isNarrowViewport() {
  return window.matchMedia("(max-width: 640px)").matches;
}

export function useNarrowScaleEditorViewport() {
  return useSyncExternalStore(
    subscribeToViewport,
    isNarrowViewport,
    () => false,
  );
}
