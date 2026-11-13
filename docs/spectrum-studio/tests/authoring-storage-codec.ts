// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  decodeAuthoringStorage,
  encodeAuthoringStorage,
  storesAuthoringValue,
} from "../src/features/edit-session/authoringStorageCodec";

const value = {
  version: 33,
  isEditing: true,
  working: { colors: ["blue"] },
  saved: { colors: ["red"] },
};
const encoded = encodeAuthoringStorage(value);

assert.ok(
  storesAuthoringValue(encoded, value),
  "Page load skips rewriting a record that is already stored.",
);
assert.ok(
  !storesAuthoringValue(encoded, { ...value, version: 34 }),
  "An upgraded record is written again.",
);
assert.ok(
  !storesAuthoringValue(encoded, { ...value, isEditing: false }),
  "A changed edit-mode flag is written again.",
);
assert.ok(
  !storesAuthoringValue(encoded, { ...value, working: { colors: ["green"] } }),
  "Changed design data is written again.",
);
assert.ok(
  !storesAuthoringValue(decodeAuthoringStorage(encoded), value),
  "A record in the older, uncompressed format is written in the current one.",
);
assert.ok(
  !storesAuthoringValue(
    JSON.stringify({ ...JSON.parse(encoded), encoding: "another-encoding" }),
    value,
  ),
  "A record in an unknown format is replaced.",
);
assert.ok(
  !storesAuthoringValue("{", value),
  "Unreadable stored text is replaced.",
);
