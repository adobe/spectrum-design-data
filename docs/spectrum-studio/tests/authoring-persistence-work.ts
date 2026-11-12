// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { decodeAuthoringStorage } from "../src/features/edit-session/authoringStorageCodec";
import {
  advance,
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  captureAuthoringRecord,
  cleanup,
  count,
  enterEditModeAtom,
  prepareAuthoringRecord,
  prepareAuthoringResult,
  read,
  requests,
  serializeAuthoringRecord,
  storage,
  store,
  updateExample,
  workingIcon,
} from "./helpers/authoringPersistence";

try {
  const initial = captureAuthoringRecord(store.get);
  const prepared = prepareAuthoringResult(initial);
  assert.equal(JSON.stringify(prepared.record), JSON.stringify(initial));
  assert.equal(prepared.serialized, serializeAuthoringRecord(prepared.record));
  assert.equal(prepared.componentContrastWitness, null);
  assert.equal(prepared.componentColorWitness, null);
  assert.equal(prepared.stylePublicationsChanged, false);
  assert.equal(prepared.browserTokenEditsChanged, false);
  assert.equal(prepared.savedChanged, false);
  assert.throws(
    () => prepareAuthoringRecord({ ...initial, version: 13 }),
    /unsupported format/,
  );
  store.set(enterEditModeAtom);
  for (const icon of ["Add", "Checkmark", "Close", "Edit", "Alert"])
    updateExample(icon);
  await advance(199);
  assert.equal(requests.length, 0);
  assert.equal(count(), 0);
  await advance(1);
  assert.equal(requests.length, 1);
  assert.equal(workingIcon(requests[0].record), "Alert");
  requests[0].resolve(prepareAuthoringRecord(requests[0].record));
  await advance();
  assert.equal(count(), 1);
  const firstStored = read();
  assert.equal(firstStored.version, AUTHORING_RECORD_VERSION);
  const persisted = JSON.parse(
    decodeAuthoringStorage(storage.getItem(AUTHORING_STORAGE_KEY)!),
  );
  assert.equal(persisted.working.structures.schemaVersion, 1);
  assert.equal(persisted.saved.structures.schemaVersion, 1);
  assert.equal(workingIcon(firstStored), "Alert");
  assert.deepEqual(firstStored.saved, initial.saved);
  const firstBytes = storage.getItem(AUTHORING_STORAGE_KEY);

  updateExample("Info");
  await advance(200);
  const obsolete = requests.at(-1)!;
  updateExample("More");
  assert.equal(obsolete.signal.aborted, true);
  obsolete.resolve(prepared.record);
  await advance();
  assert.equal(count(), 1);
  assert.equal(storage.getItem(AUTHORING_STORAGE_KEY), firstBytes);
  await advance(200);
  assert.equal(workingIcon(requests.at(-1)!.record), "More");
} finally {
  cleanup();
}
console.log(
  "Scheduled persistence: exact prepared records, coalescing, full validated reload and obsolete completion rejection passed.",
);
