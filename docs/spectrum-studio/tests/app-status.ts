// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  APP_STATUS_MESSAGES,
  getAppStatus,
  pressAppStatus,
  type AppStatus,
} from "../src/features/app-status/status";
import { createAppStatusStore } from "../src/features/app-status/store";

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

console.log("app-status checks passed");
