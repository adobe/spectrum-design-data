// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  designDataCopyFreshness,
  designDataCopyPaths,
  exportDifferences,
  practiceCopySummary,
  serializeTokenFile,
  topLevelArrayItems,
} from "../scripts/designDataCopy";
import { practiceCopyMessage } from "../src/features/design-data/practiceCopy";

// Moving a token keeps its exact text: splitting and rejoining every live
// token file reproduces it byte for byte.
const live = designDataCopyPaths();
const tokenDir = join(live.source, "tokens");
const tokenFiles = readdirSync(tokenDir).filter((file) =>
  file.endsWith(".tokens.json"),
);
assert.ok(tokenFiles.length > 0);
for (const file of tokenFiles) {
  const text = readFileSync(join(tokenDir, file), "utf8");
  const items = topLevelArrayItems(text);
  assert.equal(serializeTokenFile(items), text, `${file} round-trips`);
  assert.deepEqual(
    items.map((item) => JSON.parse(item)),
    JSON.parse(text),
    `${file} items parse to the original tokens`,
  );
}

assert.deepEqual(topLevelArrayItems('[{"a": "}{"}, {"b": [1]}]'), [
  '{"a": "}{"}',
  '{"b": [1]}',
]);
assert.equal(serializeTokenFile([]), "[]\n");
assert.throws(() => topLevelArrayItems('{"a": 1}'), /JSON arrays/);
assert.throws(() => topLevelArrayItems('["text"]'), /only objects/);
assert.throws(() => topLevelArrayItems("[[1]]"), /only objects/);
assert.throws(() => topLevelArrayItems('[{"a": 1}'), /not balanced/);

// Export records are matched by uuid, whatever order the SDK lists them in.
const a = { uuid: "a", value: 1 };
const b = { uuid: "b", value: 2 };
assert.deepEqual(
  exportDifferences(JSON.stringify([a, b]), JSON.stringify([b, a])),
  [],
);
assert.deepEqual(
  exportDifferences(
    JSON.stringify([a, b]),
    JSON.stringify([{ ...a, value: 3 }, { uuid: "c" }]),
  ),
  ["a", "b", "c"],
);

// Freshness: missing, then current, then a refresh once the source changes.
const temp = mkdtempSync(join(tmpdir(), "studio-design-data-copy-"));
try {
  const paths = {
    ...designDataCopyPaths(temp, join(temp, "studio")),
    source: join(temp, "source"),
  };
  const write = (path: string, text: string) => {
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, text);
  };
  const hash = (text: string) =>
    createHash("sha256").update(text).digest("hex");
  write(join(paths.source, "dataset.json"), "{}\n");
  write(join(paths.source, "tokens/a.tokens.json"), "[]\n");
  write(join(paths.source, "changelog/ignored.json"), "{}\n");

  assert.equal(designDataCopyFreshness(paths).status, "missing");

  write(join(paths.copy, "dataset.json"), "{}\n");
  write(
    paths.record,
    JSON.stringify({
      commit: "abc123",
      files: {
        "dataset.json": hash("{}\n"),
        "tokens/a.tokens.json": hash("[]\n"),
        "tokens/gone.tokens.json": hash("[]\n"),
      },
    }),
  );
  write(join(paths.source, "tokens/gone.tokens.json"), "[]\n");
  assert.deepEqual(designDataCopyFreshness(paths), {
    status: "current",
    recordedCommit: "abc123",
    changed: [],
    added: [],
    removed: [],
  });

  write(join(paths.source, "tokens/a.tokens.json"), '[{"uuid": "x"}]\n');
  write(join(paths.source, "tokens/new.tokens.json"), "[]\n");
  rmSync(join(paths.source, "tokens/gone.tokens.json"));
  assert.deepEqual(designDataCopyFreshness(paths), {
    status: "refresh-available",
    recordedCommit: "abc123",
    changed: ["tokens/a.tokens.json"],
    added: ["tokens/new.tokens.json"],
    removed: ["tokens/gone.tokens.json"],
  });
  const behind = practiceCopySummary(paths);
  assert.deepEqual(behind, {
    status: "refresh-available",
    recordedCommit: "abc123",
    changedFiles: 3,
  });
  assert.match(
    practiceCopyMessage(behind) ?? "",
    /3 design-data files have changed .*commit abc123.*pnpm data:snapshot/,
  );

  // A broken record is reported, never thrown at the Analysis view.
  write(paths.record, "not json");
  const broken = practiceCopySummary(paths);
  assert.equal(broken.status, "unavailable");
  assert.match(practiceCopyMessage(broken) ?? "", /could not be checked: /);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

assert.equal(practiceCopyMessage(undefined), undefined);
assert.match(
  practiceCopyMessage({
    status: "current",
    recordedCommit: "e2379a2e5f",
    changedFiles: 0,
  }) ?? "",
  /^The practice copy .* matches .*commit e2379a2\)\.$/,
);
assert.match(
  practiceCopyMessage({ status: "refresh-available", changedFiles: 1 }, true) ??
    "",
  /^When this build was made, .*1 design-data file has changed/,
);
assert.match(
  practiceCopyMessage({ status: "missing", changedFiles: 0 }) ?? "",
  /was not found/,
);

console.log("Design-data practice copy keeps token text and tracks freshness.");
