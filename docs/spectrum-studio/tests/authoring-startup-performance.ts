// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";
import { createStore } from "jotai";
import LZString from "lz-string";
import type { EditSessionSnapshot } from "../src/features/edit-session/state";

// The check runner stops heavy checks above 1 GiB; collect garbage between steps
// so each one starts from a clean heap and its timing excludes earlier garbage.
setFlagsFromString("--expose-gc");
const collectGarbage = runInNewContext("gc") as () => void;

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  writes = 0;
  get length() {
    return this.data.size;
  }
  clear() {
    throw new Error("Broad storage clearing is prohibited.");
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.writes++;
    this.data.set(key, value);
  }
}
const storage = new MemoryStorage();
const events = new EventTarget();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: storage,
    sessionStorage: new MemoryStorage(),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  },
});
// Background work never answers here, so only main-thread startup work is timed.
Object.defineProperty(globalThis, "Worker", {
  configurable: true,
  value: class IdleWorker {
    onmessage = null;
    onerror = null;
    onmessageerror = null;
    postMessage() {}
    terminate() {}
  },
});

const time = (work: () => void) => {
  const start = performance.now();
  work();
  return performance.now() - start;
};
const ms = (value: number) => `${Math.round(value)} ms`;
const report = (line: string) => {
  const { heapUsed, rss } = process.memoryUsage();
  const mb = (bytes: number) => `${Math.round(bytes / 2 ** 20)} MB`;
  console.log(`${line} [heap ${mb(heapUsed)}, RSS ${mb(rss)}]`);
};

const session = await import("../src/features/edit-session/state");
const { initializeAuthoringPersistence } =
  await import("../src/features/edit-session/persistence");
const { prepareAuthoringResult } =
  await import("../src/features/edit-session/recordPreparation");
const { AUTHORING_STORAGE_KEY, readAuthoringRecord, serializeAuthoringRecord } =
  await import("../src/features/edit-session/storage");
const { upgradeCanonicalTokenIdentities } =
  await import("../src/features/edit-session/canonicalIdentityUpgrade");
const { tshirtBuildStats } =
  await import("../src/features/design-data/tshirtArtifacts");
const { editModeAtom } = await import("../src/state/view/editMode");
const assertSnapshot: (value: unknown) => asserts value is EditSessionSnapshot =
  session.assertStoredSnapshot;

{
  // Seeds the record Studio stores once a designer enters edit mode with shipped defaults.
  const store = createStore();
  store.set(session.enterEditModeAtom);
  let record!: ReturnType<typeof session.captureAuthoringRecord>;
  const captureMs = time(() => {
    record = session.captureAuthoringRecord(store.get);
  });
  const checkMs = time(() => {
    assertSnapshot(record.working);
    assertSnapshot(record.saved);
  });
  let serialized = "";
  const compressMs = time(() => {
    serialized = serializeAuthoringRecord(record);
  });
  // Mirrors flush(), which runs on page close while a background save is still pending.
  report(
    `Page-close save: ${ms(captureMs + checkMs + compressMs)} (capture with identity checks ${ms(captureMs)}, snapshot checks ${ms(checkMs)}, compression ${ms(compressMs)}); stored record ${(serialized.length / 2 ** 20).toFixed(1)}M characters`,
  );
  storage.setItem(AUTHORING_STORAGE_KEY, serialized);
  collectGarbage();
  let prepared = "";
  const prepareMs = time(() => {
    prepared = prepareAuthoringResult(record).serialized ?? "";
  });
  report(
    `Background save step after each edit, in a worker (prepareAuthoringResult): ${ms(prepareMs)}`,
  );
  assert.equal(prepared, serialized, "Preparing a stored record is stable.");
}
collectGarbage();
{
  let checks = 0;
  let checkMs = 0;
  let identityChecks = 0;
  let identityMs = 0;
  const timedCheck: (value: unknown) => asserts value is EditSessionSnapshot = (
    value,
  ) => {
    const start = performance.now();
    try {
      assertSnapshot(value);
    } finally {
      checks++;
      checkMs += performance.now() - start;
    }
  };
  const timedIdentities = (
    value: EditSessionSnapshot,
    identities: Map<string, string>,
  ) => {
    const start = performance.now();
    try {
      return upgradeCanonicalTokenIdentities(value, identities);
    } finally {
      identityChecks++;
      identityMs += performance.now() - start;
    }
  };
  let restored = false;
  const readMs = time(() => {
    restored = !!readAuthoringRecord(
      timedCheck,
      (value) => value,
      undefined,
      timedIdentities,
    );
  });
  assert.ok(restored, "The stored record is restored.");
  report(
    `Read the stored record: ${ms(readMs)} (${checks} snapshot checks ${ms(checkMs)}, ${identityChecks} identity checks ${ms(identityMs)}, everything else ${ms(readMs - checkMs - identityMs)})`,
  );
}
collectGarbage();
const compress = LZString.compressToUTF16;
let compressions = 0;
(LZString as { compressToUTF16: typeof compress }).compressToUTF16 = (text) => {
  compressions++;
  return compress(text);
};
const startup = (label: string) => {
  const store = createStore();
  const writes = storage.writes;
  const compressed = compressions;
  const before = tshirtBuildStats();
  let dispose = () => {};
  const startupMs = time(() => {
    dispose = initializeAuthoringPersistence(store);
  });
  const after = tshirtBuildStats();
  const rewrites = storage.writes - writes;
  report(
    `${label} (initializeAuthoringPersistence): ${ms(startupMs)}; full builds ${after.full - before.full}, compressions ${compressions - compressed}, record rewrites ${rewrites}`,
  );
  dispose();
  assert.equal(store.get(editModeAtom), true, "Edit mode is restored.");
  // Loose regression limit for now; it tightens once the startup work lands.
  assert.ok(startupMs < 30_000, `Startup took ${ms(startupMs)}.`);
  return compressions - compressed;
};
// Shipped defaults gain one Registry scope on first read, so this load rewrites once.
startup("Startup data load before the first screen");
collectGarbage();
assert.equal(
  startup("Next page load with nothing changed"),
  0,
  "An unchanged stored record is not compressed and written again.",
);
