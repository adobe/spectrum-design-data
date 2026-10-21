// Copyright 2026 Adobe. All rights reserved.

import { readFileSync, readdirSync } from "node:fs";
import test from "ava";
import { Dataset } from "../pkg/node/design_data_wasm.js";

test("legacyOutput returns plain by-file maps and reconstructs aliases and sets", (t) => {
  const ds = Dataset.fromTokens([
    { name: { property: "target" }, value: "#fff", uuid: "target-id" },
    { name: { property: "alias" }, $ref: "target-id" },
    { name: { property: "overlay", colorScheme: "light" }, value: "0.4" },
    { name: { property: "overlay", colorScheme: "dark" }, value: "0.6" },
    { name: { property: "target", contrast: "high" }, value: "#000" },
  ]);
  try {
    const output = ds.legacyOutput();
    t.is(Object.getPrototypeOf(output), Object.prototype);
    t.deepEqual(Object.keys(output), ["input.json"]);
    t.is(output["input.json"].target.value, "#fff");
    t.is(output["input.json"].alias.value, "{target}");
    t.is(output["input.json"].overlay.sets.light.value, "0.4");
    t.is(output["input.json"].overlay.sets.dark.value, "0.6");
  } finally {
    ds.free();
  }
});

test("legacyOutput returns an empty object for an empty dataset", (t) => {
  const ds = Dataset.fromTokens([]);
  try {
    t.deepEqual(ds.legacyOutput(), {});
  } finally {
    ds.free();
  }
});

test("embedded legacyOutput includes every named CTR without adding graph tokens", (t) => {
  const ds = Dataset.embedded();
  const relationships = new URL(
    "../../../packages/design-data/relationships/",
    import.meta.url,
  );
  try {
    const count = ds.tokenCount();
    const output = ds.legacyOutput();
    for (const filename of readdirSync(relationships).filter((name) =>
      name.endsWith(".json"),
    )) {
      const rows = JSON.parse(
        readFileSync(new URL(filename, relationships), "utf8"),
      );
      for (const row of rows.filter((row) => row.legacyKey)) {
        t.truthy(
          output[filename]?.[row.legacyKey],
          `${filename}: ${row.legacyKey}`,
        );
      }
    }
    t.is(
      output["picker.json"]["picker-border-width"].value,
      "{border-width-100}",
    );
    t.is(ds.tokenCount(), count);
    t.deepEqual(ds.legacyOutput(), output);
  } finally {
    ds.free();
  }
});
