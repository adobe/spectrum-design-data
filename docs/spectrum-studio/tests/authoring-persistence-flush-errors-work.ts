// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  advance,
  AUTHORING_STORAGE_KEY,
  captureAuthoringRecord,
  cleanup,
  count,
  dispose,
  enterEditModeAtom,
  events,
  persistenceIssuesAtom,
  prepareAuthoringRecord,
  read,
  requests,
  savedIcon,
  storage,
  store,
  updateExample,
  workingIcon,
} from "./helpers/authoringPersistence";

try {
  const initial = captureAuthoringRecord(store.get);
  store.set(enterEditModeAtom);
  updateExample("Settings");
  await advance(200);
  const beforeHide = requests.at(-1)!;
  events.dispatchEvent(new Event("pagehide"));
  assert.equal(beforeHide.signal.aborted, true);
  const afterHideRecord = read();
  assert.equal(workingIcon(afterHideRecord), "Settings");
  assert.equal(savedIcon(afterHideRecord), savedIcon(initial));
  assert.deepEqual(afterHideRecord.saved, initial.saved);
  const afterHideBytes = storage.getItem(AUTHORING_STORAGE_KEY);
  const afterHide = count();
  beforeHide.resolve(initial);
  await advance();
  assert.equal(count(), afterHide);
  assert.equal(storage.getItem(AUTHORING_STORAGE_KEY), afterHideBytes);

  updateExample("Add");
  await advance(200);
  requests.at(-1)!.reject(new Error("Injected validation failure."));
  await advance();
  assert(
    store
      .get(persistenceIssuesAtom)
      .some((issue) => issue.includes("Injected validation failure")),
  );
  assert.equal(storage.getItem(AUTHORING_STORAGE_KEY), afterHideBytes);
  updateExample("Checkmark");
  await advance(200);
  storage.failKey = AUTHORING_STORAGE_KEY;
  const failedWrite = requests.at(-1)!;
  failedWrite.resolve(prepareAuthoringRecord(failedWrite.record));
  await advance();
  assert(
    store
      .get(persistenceIssuesAtom)
      .some((issue) => issue.includes("Injected quota failure")),
  );
  assert.equal(storage.getItem(AUTHORING_STORAGE_KEY), afterHideBytes);
  storage.failKey = undefined;

  updateExample("Close");
  await advance(200);
  const staleFailure = requests.at(-1)!;
  updateExample("Edit");
  staleFailure.reject(new Error("Obsolete validation failure."));
  await advance();
  assert(
    !store
      .get(persistenceIssuesAtom)
      .some((issue) => issue.includes("Obsolete validation failure")),
  );
  await advance(200);
  const beforeDispose = requests.at(-1)!;
  dispose();
  assert.equal(beforeDispose.signal.aborted, true);
  beforeDispose.resolve(initial);
  await advance();
  assert.equal(count(), afterHide);
  assert.equal(storage.getItem(AUTHORING_STORAGE_KEY), afterHideBytes);
} finally {
  cleanup();
}
console.log(
  "Scheduled persistence: pagehide flush, validated reload, validation/quota failures, stale errors and disposal passed.",
);
