// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  STUDIO_DATA_ENTRY,
  STUDIO_DATA_PARTS,
  composeStudioData,
  serializeStudioDataFile,
  splitStudioData,
} from "../src/data/studioData";
import {
  studioDataFiles,
  studioDataset,
} from "../src/data/studioData.generated";
import {
  readStudioDataFiles,
  readStudioDataset,
} from "../scripts/studioDataFiles";

// The checked-in files rebuild one dataset, and splitting it again gives the same files.
const stored = readStudioDataset();
assert.deepEqual(studioDataset, stored);
const resplit = splitStudioData(stored);
assert.deepEqual(
  [...resplit.keys()].sort(),
  Object.keys(studioDataFiles).sort(),
);
const storedFiles = readStudioDataFiles();
for (const [file, value] of resplit)
  assert.equal(
    serializeStudioDataFile(value),
    serializeStudioDataFile(storedFiles[file]),
    `${file} must round trip.`,
  );
assert.equal(resplit.size, STUDIO_DATA_PARTS.length + 1);

// Key order survives the split, so composing reproduces the original text.
const sample = {
  first: 1,
  system: { foundations: { opacity: { a: 1 }, color: [1, 2] }, last: true },
  rest: "x",
};
const sampleFiles = Object.fromEntries(splitStudioData(sample));
assert.deepEqual(Object.keys(sampleFiles).sort(), [
  "foundations/color.json",
  "foundations/opacity.json",
  STUDIO_DATA_ENTRY,
]);
assert.equal(
  serializeStudioDataFile(composeStudioData(sampleFiles)),
  serializeStudioDataFile(sample),
);

// Broken file sets are reported instead of silently producing partial data.
assert.throws(() => composeStudioData({}), /missing studio\.json/);
assert.throws(
  () =>
    composeStudioData({
      [STUDIO_DATA_ENTRY]: { a: { $file: "gone.json" } },
    }),
  /gone\.json is missing/,
);
assert.throws(
  () =>
    composeStudioData({
      [STUDIO_DATA_ENTRY]: { a: { $file: "x.json" }, b: { $file: "x.json" } },
      "x.json": 1,
    }),
  /referenced more than once/,
);
assert.throws(
  () => composeStudioData({ [STUDIO_DATA_ENTRY]: {}, "orphan.json": 1 }),
  /not referenced: orphan\.json/,
);
assert.throws(
  () => splitStudioData({ value: { $file: "looks-like-a-reference" } }),
  /reserved/,
);

// Reading from disk discovers nested folders.
const directory = mkdtempSync(join(tmpdir(), "studio-data-"));
try {
  mkdirSync(join(directory, "foundations"));
  writeFileSync(
    join(directory, STUDIO_DATA_ENTRY),
    JSON.stringify({
      system: {
        foundations: { opacity: { $file: "foundations/opacity.json" } },
      },
    }),
  );
  writeFileSync(join(directory, "foundations/opacity.json"), "[0.5]");
  assert.deepEqual(readStudioDataset(directory), {
    system: { foundations: { opacity: [0.5] } },
  });
} finally {
  rmSync(directory, { recursive: true, force: true });
}

console.log("Studio data files compose, split and report broken references.");
