// Copyright 2026 Adobe. All rights reserved.

export const INSTALL_HASH = "#install";

// Chrome and Edge's `beforeinstallprompt` event. Not in the DOM type library.
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<unknown>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallBrowser = "safari" | "firefox" | "other";

export const INSTALL_STEPS: Record<InstallBrowser, string> = {
  safari: "In Safari, choose File › Add to Dock.",
  firefox:
    "Firefox can't install web apps. Open Studio in Chrome or Edge to install it.",
  other:
    "Use the install icon at the right of the address bar, or choose Install from the browser menu. If Studio is already installed, open it from your apps instead.",
};

export const INSTALL_BENEFITS = [
  "Opens in its own window, without browser tabs and toolbars",
  "Starts from the Dock, taskbar or Start menu",
  "Keeps working offline",
];

export function isInstalledApp(env: {
  matchMedia: (query: string) => { matches: boolean };
  navigator: { standalone?: boolean };
}): boolean {
  return (
    env.matchMedia("(display-mode: standalone)").matches ||
    env.navigator.standalone === true
  );
}

export function installBrowser(userAgent: string): InstallBrowser {
  if (/Firefox\//.test(userAgent)) return "firefox";
  if (
    /Safari\//.test(userAgent) &&
    !/Chrome\/|Chromium\/|Edg\//.test(userAgent)
  )
    return "safari";
  return "other";
}

// Returns true when the page was opened with `#install`, and removes the hash
// so a refresh doesn't open the dialog again.
export function consumeInstallHash(
  location: Pick<Location, "hash" | "pathname" | "search">,
  history: Pick<History, "replaceState" | "state">,
): boolean {
  if (location.hash !== INSTALL_HASH) return false;
  history.replaceState(history.state, "", location.pathname + location.search);
  return true;
}

export interface InstallEnvironment {
  addEventListener: (type: string, listener: (event: Event) => void) => void;
  matchMedia: (query: string) => {
    matches: boolean;
    addEventListener?: (type: "change", listener: () => void) => void;
  };
  navigator: { standalone?: boolean };
  location: Pick<Location, "hash" | "pathname" | "search">;
  history: Pick<History, "replaceState" | "state">;
}

export interface InstallStore {
  setInstallPrompt: (event: InstallPromptEvent | null) => void;
  setInstalled: (value: boolean) => void;
  openInstallDialog: () => void;
}

// Runs before React renders so the one-time `beforeinstallprompt` isn't missed.
export function initializeInstall(
  env: InstallEnvironment,
  store: InstallStore,
) {
  const installed = isInstalledApp(env);
  store.setInstalled(installed);

  env.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    store.setInstallPrompt(event as InstallPromptEvent);
  });
  env.addEventListener("appinstalled", () => store.setInstalled(true));
  env
    .matchMedia("(display-mode: standalone)")
    .addEventListener?.("change", () =>
      store.setInstalled(isInstalledApp(env)),
    );

  // Also handles `#install` added to an already-open page, which doesn't reload.
  const handleInstallHash = () => {
    if (consumeInstallHash(env.location, env.history) && !isInstalledApp(env))
      store.openInstallDialog();
  };
  env.addEventListener("hashchange", handleInstallHash);
  handleInstallHash();
}
