// Copyright 2026 Adobe. All rights reserved.

export type AppStatus = "offline" | "update" | "online";

export interface AppStatusSnapshot {
  isOnline: boolean;
  updateAvailable: boolean;
  canPromptInstall: boolean;
  isInstalled: boolean;
  installDialogOpen: boolean;
}

export const APP_STATUS_MESSAGES: Record<AppStatus, string> = {
  offline: "Offline. Changes are saved locally.",
  update: "Update available. Click to reload.",
  online: "Up to date",
};

export function getAppStatus({
  isOnline,
  updateAvailable,
}: Pick<AppStatusSnapshot, "isOnline" | "updateAvailable">): AppStatus {
  if (!isOnline) return "offline";
  if (updateAvailable) return "update";
  return "online";
}

export function pressAppStatus(status: AppStatus, applyUpdate: () => void) {
  if (status === "update") applyUpdate();
}
