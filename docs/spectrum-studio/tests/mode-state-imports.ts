// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const state = new URL("../src/features/modes/state.ts", import.meta.url).href;
const document = new URL(
  "../src/features/modes/documentState.ts",
  import.meta.url,
).href;
for (const path of [
  "../src/features/scales/foundationState.ts",
  "../src/features/logic/scaleTypeLibrary.ts",
  "../src/features/modes/selection.ts",
]) {
  const first = new URL(path, import.meta.url).href;
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      `await import(${JSON.stringify(first)});
const operations = await import(${JSON.stringify(state)});
const document = await import(${JSON.stringify(document)});
if (operations.modeSetsAtom !== document.modeSetsAtom)
  throw new Error('Public mode operations must retain the stored atom identity.');`,
    ],
    { encoding: "utf8", timeout: 30_000 },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${path}\n${result.stderr}`);
}
console.log(
  "Foundation-first mode imports preserve initialization and atom identity.",
);
