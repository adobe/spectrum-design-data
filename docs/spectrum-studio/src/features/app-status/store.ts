// Copyright 2026 Adobe. All rights reserved.
import type { InstallPromptEvent } from "./install";
import type { AppStatusSnapshot } from "./status";

export function createAppStatusStore(isOnline: boolean) {
  let snapshot: AppStatusSnapshot = {
    isOnline,
    updateAvailable: false,
    canPromptInstall: false,
    isInstalled: false,
    installDialogOpen: false,
  };
  let applyUpdateHandler: () => void = () => {};
  let installPrompt: InstallPromptEvent | null = null;
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
    setInstallPrompt(event: InstallPromptEvent | null) {
      installPrompt = event;
      update({ canPromptInstall: event !== null });
    },
    // Call only from a click: browsers ignore prompts without a user gesture,
    // and each event can be used once.
    promptInstall(): boolean {
      const event = installPrompt;
      if (!event) return false;
      installPrompt = null;
      update({ canPromptInstall: false, installDialogOpen: false });
      void event.prompt();
      return true;
    },
    setInstalled(value: boolean) {
      if (value) installPrompt = null;
      update(
        value
          ? {
              isInstalled: true,
              canPromptInstall: false,
              installDialogOpen: false,
            }
          : { isInstalled: false },
      );
    },
    openInstallDialog: () => update({ installDialogOpen: true }),
    closeInstallDialog: () => update({ installDialogOpen: false }),
  };
}

export const appStatusStore = createAppStatusStore(
  typeof navigator === "undefined" ? true : navigator.onLine,
);
