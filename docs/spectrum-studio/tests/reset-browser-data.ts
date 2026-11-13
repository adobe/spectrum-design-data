// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  isStudioStorageLocked,
  resetStudioBrowserData,
} from "../src/state/persist";

const fakeStorage = (entries: Record<string, string>): Storage => {
  const data = new Map(Object.entries(entries));
  return {
    get length() {
      return data.size;
    },
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    clear: () => data.clear(),
  };
};

const local = fakeStorage({
  "leonardo:authoring:v1": "{}",
  "leonardo:preferences:v1": "{}",
  "leonardo:artifacts:tshirt:v1": "{}",
  "other-app:setting": "keep",
});
const session = fakeStorage({ "leonardo:v1:legacy": "x", unrelated: "keep" });
let reloads = 0;

assert.equal(isStudioStorageLocked(), false);
resetStudioBrowserData([local, session], () => reloads++);

assert.equal(reloads, 1, "Reset all reloads the page");
assert.equal(isStudioStorageLocked(), true, "later writes are blocked");
assert.equal(local.length, 1);
assert.equal(local.getItem("other-app:setting"), "keep");
assert.equal(session.length, 1);
assert.equal(session.getItem("unrelated"), "keep");
console.log("reset-browser-data: ok");
