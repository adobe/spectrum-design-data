// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  decodeAuthoringStorage,
  encodeAuthoringStorage,
} from "../src/features/edit-session/authoringStorageCodec";

const QUOTA = 5 * 1024 * 1024;
class QuotaStorage implements Storage {
  data = new Map<string, string>();
  failWrites = false;
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
    const next = new Map(this.data).set(key, value);
    const bytes = [...next].reduce(
      (total, [name, text]) => total + 2 * (name.length + text.length),
      0,
    );
    if (this.failWrites || bytes > QUOTA)
      throw new DOMException("Storage quota exceeded.", "QuotaExceededError");
    this.data.set(key, value);
  }
}
const localStorage = new QuotaStorage();
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { localStorage, sessionStorage: new QuotaStorage() },
});
try {
  const {
    AUTHORING_RECORD_VERSION,
    AUTHORING_STORAGE_KEY,
    PREFERENCES_STORAGE_KEY,
    blockAuthoringStorage,
    readAuthoringRecord,
    writeAuthoringRecord,
  } = await import("../src/features/edit-session/storage");
  const {
    assertStoredSnapshot,
    authoringSnapshotAtom,
    createDefaultSnapshot,
    editSessionSnapshotAtom,
    resetAllAuthoringAtom,
  } = await import("../src/features/edit-session/state");
  const { encodeStructureSource } =
    await import("../src/features/edit-session/structureSourceCodec");
  const { upgradeStylesSnapshot } =
    await import("../src/features/edit-session/stylesUpgrade");
  const { withStylesVocabulary } =
    await import("../src/features/styles/vocabulary");
  const { buildStyleArtifacts } =
    await import("../src/features/styles/generation");
  const { styleContexts } = await import("../src/features/styles/artifacts");
  const defaults = createDefaultSnapshot();
  const saved = structuredClone(defaults);
  const working = structuredClone(saved);
  working.platforms[0].name = "Keep my unsaved edit";
  working.styles!.recipes[0].appearance.fontWeight = { value: 500 };
  const source = {
    version: AUTHORING_RECORD_VERSION,
    working,
    saved,
    isEditing: true,
    attachments: {},
    savedAttachments: {},
  };
  const portable = {
    ...source,
    working: encodeStructureSource(working),
    saved: encodeStructureSource(saved),
  };
  const plain = JSON.stringify(portable);
  assert(
    plain.length * 2 > QUOTA,
    "The actual shipped data reproduces the quota failure.",
  );
  assert.throws(() => localStorage.setItem(AUTHORING_STORAGE_KEY, plain), {
    name: "QuotaExceededError",
  });
  const encoded = encodeAuthoringStorage(portable);
  assert(
    encoded.length * 2 < QUOTA,
    "Both complete snapshots fit within 5 MiB.",
  );
  assert.deepEqual(
    JSON.parse(decodeAuthoringStorage(encoded)),
    JSON.parse(plain),
  );
  assert.equal(
    decodeAuthoringStorage(plain),
    plain,
    "Old JSON stays readable.",
  );
  assert.throws(
    () => decodeAuthoringStorage('{"encoding":"unknown","snapshots":"bad"}'),
    /unsupported encoding/,
  );
  assert.throws(
    () =>
      decodeAuthoringStorage(
        '{"encoding":"lz-string-utf16-v1","snapshots":""}',
      ),
    /could not be decoded/,
  );
  localStorage.setItem(PREFERENCES_STORAGE_KEY, "preserve appearance");
  localStorage.setItem("another-app", "preserve unrelated storage");
  writeAuthoringRecord(source);
  const loaded = readAuthoringRecord(assertStoredSnapshot);
  assert(loaded);
  assert.deepEqual(loaded.working, working);
  assert.deepEqual(loaded.saved, saved);
  assert.equal(loaded.isEditing, true);

  const legacy = structuredClone(saved);
  legacy.taxonomy!.terms = legacy.taxonomy!.terms.filter(
    (term) => term.id !== "042b4793-1403-4c88-a6e8-e8b993b3c254",
  );
  legacy.taxonomy!.categories.find(
    (category) => category.key === "scaleIndex",
  )!.allowedTokenTiers = ["primitive"];
  const contexts = styleContexts(defaults).slice(0, 1);
  const artifacts = (snapshot: typeof saved) =>
    buildStyleArtifacts(
      snapshot.styles!,
      snapshot.taxonomy!,
      snapshot.rules!,
      snapshot.modeSets,
      contexts,
    );
  const broken = artifacts(legacy);
  assert(broken.issues.some((issue) => issue.message.includes("fontWeight")));
  assert(broken.issues.some((issue) => issue.message.includes("Scale index")));
  const upgraded = upgradeStylesSnapshot(legacy);
  assert.deepEqual(artifacts(upgraded).issues, []);
  assert.deepEqual(
    upgraded.styles,
    legacy.styles,
    "Repair does not reseed Styles or identities.",
  );
  assert.deepEqual(upgraded.structures, legacy.structures);
  assert.equal(withStylesVocabulary(upgraded.taxonomy!), upgraded.taxonomy!);
  assert.deepEqual(upgradeStylesSnapshot(upgraded), upgraded);
  const renamed = structuredClone(defaults.taxonomy!);
  const weightTerm = renamed.terms.find(
    (term) => term.id === "042b4793-1403-4c88-a6e8-e8b993b3c254",
  )!;
  weightTerm.value = "custom-font-weight";
  assert.equal(
    withStylesVocabulary(renamed).terms.find(
      (term) => term.id === weightTerm.id,
    )!.value,
    "custom-font-weight",
    "Compatibility does not overwrite a renamed term or duplicate its identity.",
  );
  localStorage.data.set(
    AUTHORING_STORAGE_KEY,
    JSON.stringify({
      ...source,
      working: encodeStructureSource(legacy),
      saved: encodeStructureSource(legacy),
    }),
  );
  const repaired = readAuthoringRecord(assertStoredSnapshot, (value) => value);
  assert(repaired);
  assert.deepEqual(artifacts(repaired.working).issues, []);
  assert.deepEqual(artifacts(repaired.saved).issues, []);
  assert.deepEqual(repaired.working.styles, legacy.styles);
  assert.deepEqual(repaired.saved.styles, legacy.styles);

  const store = createStore();
  const before = structuredClone(store.get(authoringSnapshotAtom));
  const original = localStorage.getItem(AUTHORING_STORAGE_KEY);
  localStorage.failWrites = true;
  blockAuthoringStorage();
  assert.throws(() => store.set(resetAllAuthoringAtom), {
    name: "QuotaExceededError",
  });
  assert.equal(localStorage.getItem(AUTHORING_STORAGE_KEY), original);
  assert.deepEqual(store.get(authoringSnapshotAtom), before);
  localStorage.failWrites = false;
  store.set(resetAllAuthoringAtom);
  assert.deepEqual(store.get(authoringSnapshotAtom), defaults);
  assert.deepEqual(store.get(editSessionSnapshotAtom), defaults);
  const reset = readAuthoringRecord(assertStoredSnapshot);
  assert(reset);
  assert.deepEqual(reset.working, defaults);
  assert.deepEqual(reset.saved, defaults);
  assert.deepEqual(artifacts(reset.working).issues, []);
  assert.equal(
    localStorage.getItem(PREFERENCES_STORAGE_KEY),
    "preserve appearance",
  );
  assert.equal(
    localStorage.getItem("another-app"),
    "preserve unrelated storage",
  );
  console.log(
    "Real 5 MiB quota, lossless reload, legacy Style vocabulary, and atomic Reset all passed.",
  );
} finally {
  if (previousWindow)
    Object.defineProperty(globalThis, "window", previousWindow);
  else Reflect.deleteProperty(globalThis, "window");
}
