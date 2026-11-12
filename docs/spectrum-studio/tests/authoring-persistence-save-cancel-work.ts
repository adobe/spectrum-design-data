// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  advance,
  AUTHORING_STORAGE_KEY,
  cancelEditAtom,
  captureAuthoringRecord,
  cleanup,
  enterEditModeAtom,
  read,
  requests,
  saveEditAtom,
  savedIcon,
  storage,
  store,
  updateExample,
  workingIcon,
} from "./helpers/authoringPersistence";

try {
  const initial = captureAuthoringRecord(store.get);
  store.set(enterEditModeAtom);
  updateExample("More");
  await advance(200);
  const beforeSave = requests.at(-1)!;
  store.set(saveEditAtom);
  assert.equal(beforeSave.signal.aborted, true);
  const savedBytes = storage.getItem(AUTHORING_STORAGE_KEY);
  beforeSave.resolve(initial);
  await advance();
  assert.equal(storage.getItem(AUTHORING_STORAGE_KEY), savedBytes);
  const afterSave = read();
  assert.equal(workingIcon(afterSave), "More");
  assert.equal(savedIcon(afterSave), "More");

  updateExample("Search");
  await advance(200);
  const beforeCancel = requests.at(-1)!;
  store.set(cancelEditAtom);
  assert.equal(beforeCancel.signal.aborted, true);
  const cancelledBytes = storage.getItem(AUTHORING_STORAGE_KEY);
  beforeCancel.resolve(initial);
  await advance();
  assert.equal(storage.getItem(AUTHORING_STORAGE_KEY), cancelledBytes);
  const afterCancel = read();
  assert.equal(workingIcon(afterCancel), "More");
  assert.equal(savedIcon(afterCancel), "More");
  assert.equal(afterCancel.isEditing, false);
} finally {
  cleanup();
}
console.log(
  "Scheduled persistence: synchronous Save/Cancel, independent saved/working data, validated reload and late completion rejection passed.",
);
