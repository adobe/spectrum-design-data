// Copyright 2026 Adobe. All rights reserved.

export const INITIAL_WINDOW_SIZE = { width: 1920, height: 1080 };
export const INITIAL_WINDOW_SIZE_STORAGE_KEY =
  "spectrum-studio:initial-window-size:v1";

export interface WindowSizeEnvironment {
  isStandalone: boolean;
  screen: {
    availWidth: number;
    availHeight: number;
    availLeft?: number;
    availTop?: number;
  };
  storage: Pick<Storage, "getItem" | "setItem">;
  resizeTo: (width: number, height: number) => void;
  moveTo: (x: number, y: number) => void;
}

// Sizes the installed app window once per target size, shrinking to fit
// smaller screens. Later launches keep whatever size the user chose.
export function applyInitialWindowSize(env: WindowSizeEnvironment): boolean {
  if (!env.isStandalone) return false;
  const target = `${INITIAL_WINDOW_SIZE.width}x${INITIAL_WINDOW_SIZE.height}`;
  try {
    if (env.storage.getItem(INITIAL_WINDOW_SIZE_STORAGE_KEY) === target)
      return false;
    env.storage.setItem(INITIAL_WINDOW_SIZE_STORAGE_KEY, target);
  } catch {
    return false;
  }
  const { availWidth, availHeight, availLeft = 0, availTop = 0 } = env.screen;
  const width = Math.min(INITIAL_WINDOW_SIZE.width, availWidth);
  const height = Math.min(INITIAL_WINDOW_SIZE.height, availHeight);
  env.moveTo(
    availLeft + Math.round((availWidth - width) / 2),
    availTop + Math.round((availHeight - height) / 2),
  );
  env.resizeTo(width, height);
  return true;
}

export function initializeWindowSize() {
  applyInitialWindowSize({
    isStandalone: window.matchMedia("(display-mode: standalone)").matches,
    screen: window.screen as WindowSizeEnvironment["screen"],
    storage: window.localStorage,
    resizeTo: (width, height) => window.resizeTo(width, height),
    moveTo: (x, y) => window.moveTo(x, y),
  });
}
