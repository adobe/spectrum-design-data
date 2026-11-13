// Copyright 2026 Adobe. All rights reserved.
import { registerSW } from "virtual:pwa-register";
import { initializeInstall } from "./install";
import { appStatusStore } from "./store";

export function initializeAppStatus() {
  window.addEventListener("online", () => appStatusStore.setOnline(true));
  window.addEventListener("offline", () => appStatusStore.setOnline(false));
  initializeInstall(window, appStatusStore);

  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh: () => appStatusStore.setUpdateAvailable(true),
  });
  appStatusStore.setApplyUpdate(() => {
    void updateServiceWorker(true);
  });
}
