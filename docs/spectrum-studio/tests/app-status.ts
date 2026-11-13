// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  consumeInstallHash,
  initializeInstall,
  INSTALL_STEPS,
  installBrowser,
  isInstalledApp,
  type InstallEnvironment,
  type InstallPromptEvent,
} from "../src/features/app-status/install";
import {
  APP_STATUS_MESSAGES,
  getAppStatus,
  pressAppStatus,
  type AppStatus,
} from "../src/features/app-status/status";
import { createAppStatusStore } from "../src/features/app-status/store";
import { setTitleBarColor } from "../src/features/app-status/titleBar";
import {
  applyInitialWindowSize,
  INITIAL_WINDOW_SIZE_STORAGE_KEY,
  type WindowSizeEnvironment,
} from "../src/features/app-status/windowSize";

// Offline wins over an available update, which wins over online.
assert.equal(
  getAppStatus({ isOnline: false, updateAvailable: true }),
  "offline",
);
assert.equal(
  getAppStatus({ isOnline: false, updateAvailable: false }),
  "offline",
);
assert.equal(getAppStatus({ isOnline: true, updateAvailable: true }), "update");
assert.equal(
  getAppStatus({ isOnline: true, updateAvailable: false }),
  "online",
);

assert.deepEqual(APP_STATUS_MESSAGES, {
  offline: "Offline. Changes are saved locally.",
  update: "Update available. Click to reload.",
  online: "Up to date",
});

// Pressing only applies the update in the update state.
for (const status of ["offline", "update", "online"] as AppStatus[]) {
  let applied = 0;
  pressAppStatus(status, () => applied++);
  assert.equal(applied, status === "update" ? 1 : 0, `press in ${status}`);
}

// Store notifies subscribers and forwards applyUpdate to the registered handler.
const store = createAppStatusStore(true);
let notified = 0;
const unsubscribe = store.subscribe(() => notified++);
store.setUpdateAvailable(true);
store.setOnline(false);
assert.deepEqual(store.getSnapshot(), {
  isOnline: false,
  updateAvailable: true,
  canPromptInstall: false,
  isInstalled: false,
  installDialogOpen: false,
});
assert.equal(notified, 2);
unsubscribe();
store.setOnline(true);
assert.equal(notified, 2);
let applied = 0;
store.applyUpdate();
store.setApplyUpdate(() => applied++);
store.applyUpdate();
assert.equal(applied, 1);

// Installed app window opens at 1920x1080 once, fitted and centred on smaller screens.
function windowEnvironment(
  screen: WindowSizeEnvironment["screen"],
  isStandalone = true,
) {
  const stored = new Map<string, string>();
  const calls: string[] = [];
  const env: WindowSizeEnvironment = {
    isStandalone,
    screen,
    storage: {
      getItem: (key) => stored.get(key) ?? null,
      setItem: (key, value) => void stored.set(key, value),
    },
    resizeTo: (width, height) => calls.push(`resize ${width}x${height}`),
    moveTo: (x, y) => calls.push(`move ${x},${y}`),
  };
  return { env, calls, stored };
}
const large = windowEnvironment({ availWidth: 2560, availHeight: 1400 });
assert.equal(applyInitialWindowSize(large.env), true);
assert.deepEqual(large.calls, ["move 320,160", "resize 1920x1080"]);
assert.ok(large.stored.has(INITIAL_WINDOW_SIZE_STORAGE_KEY));
assert.equal(applyInitialWindowSize(large.env), false, "only first launch");
assert.equal(large.calls.length, 2);

// Changing the target size applies it once more, even after an earlier size.
const previous = windowEnvironment({ availWidth: 2560, availHeight: 1400 });
previous.stored.set(INITIAL_WINDOW_SIZE_STORAGE_KEY, "applied");
assert.equal(applyInitialWindowSize(previous.env), true);
assert.equal(previous.stored.get(INITIAL_WINDOW_SIZE_STORAGE_KEY), "1920x1080");

const small = windowEnvironment({
  availWidth: 1440,
  availHeight: 760,
  availLeft: 1920,
  availTop: 25,
});
applyInitialWindowSize(small.env);
assert.deepEqual(small.calls, ["move 1920,25", "resize 1440x760"]);

const tab = windowEnvironment({ availWidth: 2560, availHeight: 1400 }, false);
assert.equal(applyInitialWindowSize(tab.env), false, "browser tabs untouched");
assert.deepEqual(tab.calls, []);
assert.equal(tab.stored.size, 0);

// Title bar follows the top bar colour; missing tags and empty colours are ignored.
const meta = { content: "#ffffff" };
assert.equal(setTitleBarColor(meta, "rgb(29, 29, 29)"), true);
assert.equal(meta.content, "rgb(29, 29, 29)");
assert.equal(setTitleBarColor(meta, "rgb(29, 29, 29)"), false);
assert.equal(setTitleBarColor(meta, ""), false);
assert.equal(setTitleBarColor(null, "rgb(0, 0, 0)"), false);

// Header wiring: the button uses the requested icons and sits before the appearance toggle.
const button = readFileSync(
  new URL("../src/components/AppStatusButton.tsx", import.meta.url),
  "utf8",
);
for (const icon of ["Cloud", "CloudStateInProgress", "MediaOffline"]) {
  assert.match(
    button,
    new RegExp(`from "@react-spectrum/s2/icons/${icon}"`),
    `${icon} icon import`,
  );
}
assert.match(button, /isQuiet/);
const topBar = readFileSync(
  new URL("../src/components/TopBar.tsx", import.meta.url),
  "utf8",
);
const buttonIndex = topBar.indexOf("<AppStatusButton />");
const toggleIndex = topBar.indexOf('aria-label="Dark app appearance"');
assert.ok(
  buttonIndex > 0 && buttonIndex < toggleIndex,
  "AppStatusButton renders before the appearance toggle",
);
assert.match(
  topBar,
  /setTitleBarColor\(/,
  "top bar syncs the title bar colour",
);

// Installed-app detection: standalone display mode, or iOS's navigator.standalone.
const media = (matches: boolean) => () => ({ matches });
assert.equal(isInstalledApp({ matchMedia: media(true), navigator: {} }), true);
assert.equal(
  isInstalledApp({ matchMedia: media(false), navigator: { standalone: true } }),
  true,
);
assert.equal(
  isInstalledApp({ matchMedia: media(false), navigator: {} }),
  false,
);

// Browser detection picks the right manual steps.
const userAgents: Record<string, string> = {
  chrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  edge: "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Edg/126.0",
  safari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  firefox:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:127.0) Gecko/20100101 Firefox/127.0",
};
assert.equal(installBrowser(userAgents.chrome), "other");
assert.equal(installBrowser(userAgents.edge), "other");
assert.equal(installBrowser(userAgents.safari), "safari");
assert.equal(installBrowser(userAgents.firefox), "firefox");
assert.match(INSTALL_STEPS.safari, /Add to Dock/);

// `#install` is removed, keeping the path and query; other hashes are left alone.
function fakeHistory() {
  const urls: string[] = [];
  return {
    urls,
    history: {
      state: { keep: true },
      replaceState: (
        _state: unknown,
        _title: string,
        url?: string | URL | null,
      ) => void urls.push(String(url)),
    },
  };
}
const hashed = fakeHistory();
assert.equal(
  consumeInstallHash(
    { hash: "#install", pathname: "/studio/", search: "?mode=dark" },
    hashed.history,
  ),
  true,
);
assert.deepEqual(hashed.urls, ["/studio/?mode=dark"]);
const other = fakeHistory();
assert.equal(
  consumeInstallHash(
    { hash: "#other", pathname: "/", search: "" },
    other.history,
  ),
  false,
);
assert.deepEqual(other.urls, []);

// The native prompt is used once; installing hides the button and closes the dialog.
const installStore = createAppStatusStore(true);
let prompts = 0;
const promptEvent = {
  prompt: async () => void prompts++,
} as InstallPromptEvent;
assert.equal(installStore.promptInstall(), false, "no prompt captured yet");
installStore.setInstallPrompt(promptEvent);
installStore.openInstallDialog();
assert.equal(installStore.getSnapshot().canPromptInstall, true);
assert.equal(installStore.promptInstall(), true);
assert.equal(installStore.promptInstall(), false, "each prompt is single use");
assert.equal(prompts, 1);
assert.equal(installStore.getSnapshot().installDialogOpen, false);
installStore.setInstallPrompt(promptEvent);
installStore.openInstallDialog();
installStore.setInstalled(true);
assert.deepEqual(
  {
    canPromptInstall: installStore.getSnapshot().canPromptInstall,
    isInstalled: installStore.getSnapshot().isInstalled,
    installDialogOpen: installStore.getSnapshot().installDialogOpen,
  },
  { canPromptInstall: false, isInstalled: true, installDialogOpen: false },
);
assert.equal(
  installStore.promptInstall(),
  false,
  "installing clears the prompt",
);

// Startup: captures the prompt without showing it, reacts to install, handles `#install`.
function installEnvironment(hash: string, standalone = false) {
  const listeners = new Map<string, (event: Event) => void>();
  const urls: string[] = [];
  const env: InstallEnvironment = {
    addEventListener: (type, listener) => void listeners.set(type, listener),
    matchMedia: () => ({ matches: standalone }),
    navigator: {},
    location: { hash, pathname: "/", search: "" },
    history: {
      state: null,
      replaceState: (_state, _title, url) => void urls.push(String(url)),
    },
  };
  return { env, listeners, urls, store: createAppStatusStore(true) };
}
const linked = installEnvironment("#install");
initializeInstall(linked.env, linked.store);
assert.equal(linked.store.getSnapshot().installDialogOpen, true);
assert.deepEqual(linked.urls, ["/"]);
let prevented = false;
linked.listeners.get("beforeinstallprompt")?.({
  preventDefault: () => (prevented = true),
  prompt: async () => {},
} as unknown as Event);
assert.equal(prevented, true, "browser's own banner is held back");
assert.equal(linked.store.getSnapshot().canPromptInstall, true);
linked.listeners.get("appinstalled")?.(new Event("appinstalled"));
assert.equal(linked.store.getSnapshot().isInstalled, true);
assert.equal(linked.store.getSnapshot().installDialogOpen, false);

const plain = installEnvironment("");
initializeInstall(plain.env, plain.store);
assert.equal(
  plain.store.getSnapshot().installDialogOpen,
  false,
  "never opens by itself",
);
plain.env.location.hash = "#install";
plain.listeners.get("hashchange")?.(new Event("hashchange"));
assert.equal(
  plain.store.getSnapshot().installDialogOpen,
  true,
  "#install added to an open page",
);
assert.deepEqual(plain.urls, ["/"]);

const insideApp = installEnvironment("#install", true);
initializeInstall(insideApp.env, insideApp.store);
assert.equal(insideApp.store.getSnapshot().isInstalled, true);
assert.equal(insideApp.store.getSnapshot().installDialogOpen, false);
assert.deepEqual(insideApp.urls, ["/"], "hash still removed inside the app");

// Header order: Install, then status, then appearance; the button hides once installed.
const installIndex = topBar.indexOf("<InstallAppButton />");
assert.ok(
  installIndex > 0 && installIndex < buttonIndex,
  "InstallAppButton renders before AppStatusButton",
);
const installButton = readFileSync(
  new URL("../src/components/InstallAppButton.tsx", import.meta.url),
  "utf8",
);
assert.match(installButton, /!isInstalled &&/);
assert.match(installButton, /isQuiet/);

console.log("app-status checks passed");
