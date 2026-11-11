// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { jsonFiles, referenceRecords } from "../scripts/design-data-loader";
import {
  compareDesignData,
  type AnalysisInput,
} from "../src/features/design-data/comparison";

const relationship = {
  uuid: "fe4518c4-6032-49e3-987d-1fd0f5401496",
  scope: {
    component: "button",
    part: "label",
    property: "color",
    options: {
      isQuiet: false,
      variant: ["accent", "negative"],
      state: ["hover", "keyboard-focus"],
    },
  },
  $ref: "55d5d575-e286-48bb-8c76-3d484bc69b6b",
};
const fixtures = {
  "tokens/example.tokens.json": [
    {
      uuid: relationship.$ref,
      conceptId: "e09a25b6-9f8a-4b79-97a3-8ff0ac83e9fb",
      name: {
        anatomy: "focus-indicator",
        property: "gap",
        legacyKey: "focus-ring-gap",
      },
      value: 2,
    },
  ],
  "relationships/button.json": [relationship],
  "components/button.json": {
    name: "button",
    constraints: [
      {
        when: { isQuiet: true },
        require: { variant: ["secondary"] },
        severity: "error",
      },
    ],
    anatomyReview: { status: "reviewed" },
    anatomy: [{ name: "focus-indicator", presentIn: ["keyboard-focus"] }],
  },
  "visuals/button.json": {
    component: "button",
    root: { direction: "row" },
    parts: [],
  },
  "icons/ui.json": {
    set: "ui",
    icons: { checkmark: { viewBox: "0 0 16 16", paths: [{ d: "M1 8L6 13" }] } },
  },
  "changelog/button.json": {
    component: "button",
    baseline: "3.7.0",
    releases: [{ version: "3.9.3", changes: [] }],
  },
};

const directory = await mkdtemp(
  join(tmpdir(), "studio-reference-collections-"),
);
try {
  for (const [source, value] of Object.entries(fixtures)) {
    const path = join(directory, source);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, JSON.stringify(value));
  }
  const files = await jsonFiles(directory);
  assert.deepEqual(
    files.map((path) => relative(directory, path)).sort(),
    Object.keys(fixtures).sort(),
  );
  const records = Object.entries(fixtures).flatMap(([source, value]) =>
    referenceRecords(source, value),
  );
  const relation = records.find((row) => row.category === "relationships")!;
  assert.equal(relation.identity, relationship.uuid);
  assert.equal(relation.id, `relationships/button.json#${relationship.uuid}`);
  assert.equal(relation.reference, relationship.$ref);
  assert.deepEqual(relation.value, relationship);
  assert.deepEqual(
    records.find((row) => row.category === "components")?.value,
    fixtures["components/button.json"],
  );
  const token = records.find((row) => row.category === "tokens")!;
  assert.equal(token.structuredName?.anatomy, "focus-indicator");
  assert.equal(token.structuredName?.legacyKey, "focus-ring-gap");
  const reference: AnalysisInput = {
    source: {
      kind: "reference",
      root: directory,
      hash: "fixture",
      revision: "fixture",
      dirty: false,
      version: "fixture",
      validator: "unavailable",
    },
    records,
    categories: [...new Set(records.map((row) => row.category))],
    schemas: [],
    errors: [],
    limitations: ["New reference capabilities are not authored by Studio."],
    inventoryStatus: "complete",
  };
  const app: AnalysisInput = {
    ...reference,
    source: { ...reference.source, kind: "defaults" },
    records: [token],
    categories: ["tokens"],
  };
  const report = compareDesignData(app, reference);
  assert.equal(report.coverage!.allTokens.counts.concepts.reference, 1);
  assert.equal(report.coverage!.allTokens.counts.rows.reference, 1);
  assert.equal(report.coverage!.allTokens.counts.rows.represented, 1);
  for (const category of ["visuals", "icons", "changelog", "relationships"]) {
    const group = report.coverage!.categories.find(
      (row) => row.id === `category:${category}`,
    )!;
    assert.equal(group.counts.rows.reference, 1);
    assert.equal(group.counts.rows.app, 0);
  }
  assert.deepEqual(reference.errors, []);
  assert.deepEqual(app.records, [token]);
} finally {
  await rm(directory, { recursive: true, force: true });
}
console.log(
  "New reference collections retain metadata and stable identities without changing token counts or authored data.",
);
