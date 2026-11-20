// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="dom" />
/// <reference types="vite/client" />
import assert from "node:assert/strict";
import { designSystemDefaults } from "../src/data/defaults";
import { upgradeCanonicalTokenIdentities } from "../src/features/edit-session/canonicalIdentityUpgrade";
import type { CanonicalAuthoringDataset } from "../src/features/design-data/model";
import { readStudioDataset, writeStudioData } from "./studioDataFiles";

const { foundations, ...system } = structuredClone(designSystemDefaults.system);
const { color, ...dimensions } = foundations;
const before = { ...system, ...dimensions, colorSystem: color };
const after = upgradeCanonicalTokenIdentities(before);
if (process.argv.includes("--check")) {
  assert.deepEqual(
    after,
    before,
    "Default token identities need reconciliation. Run pnpm identities:defaults.",
  );
  console.log("Default token identities are complete and stable.");
} else {
  const dataset = readStudioDataset() as CanonicalAuthoringDataset;
  dataset.system.browserTokenEdits = after.browserTokenEdits;
  dataset.system.components = after.components;
  dataset.system.aliases = after.aliases;
  dataset.system.taxonomy = after.taxonomy;
  writeStudioData(dataset);
  console.log(
    `Persisted ${Object.keys(after.browserTokenEdits ?? {}).length} default token identities.`,
  );
}
