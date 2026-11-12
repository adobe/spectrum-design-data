// Copyright 2026 Adobe. All rights reserved.
import test from "ava";
import { ValueResolver } from "../pkg/node/design_data_wasm.js";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const records = [
  {
    id: "alias",
    source: "tokens/test.json",
    raw: { uuid: "alias", $ref: "concept" },
  },
  {
    id: "light",
    source: "tokens/test.json",
    raw: {
      uuid: "light",
      conceptId: "concept",
      name: { colorScheme: "light" },
      value: { value: 8, unit: "px" },
    },
  },
  {
    id: "dark",
    source: "tokens/test.json",
    raw: {
      uuid: "dark",
      conceptId: "concept",
      name: { colorScheme: "dark" },
      value: { value: 12, unit: "px" },
    },
  },
  {
    id: "cycle",
    source: "tokens/test.json",
    raw: { uuid: "cycle", $ref: "cycle" },
  },
  {
    id: "missing",
    source: "tokens/test.json",
    raw: { uuid: "missing", $ref: "absent" },
  },
  {
    id: "duplicate-a",
    source: "tokens/test.json",
    raw: { uuid: "duplicate", value: 1 },
  },
  {
    id: "duplicate-b",
    source: "tokens/test.json",
    raw: { uuid: "duplicate", value: 2 },
  },
];

test("batch resolution preserves identities, contexts, structured values and issues across repeated queries", (t) => {
  const resolver = new ValueResolver({
    records,
    modeSets: [
      { name: "colorScheme", modes: ["light", "dark"], default: "light" },
    ],
  });

  try {
    const resolve = (id, context = {}) =>
      resolver.resolveValues([{ id, context }])[0];
    t.deepEqual(resolve("alias", { colorScheme: "dark" }), {
      id: "alias",
      selectedId: "alias",
      label: null,
      context: { colorScheme: "dark" },
      value: { value: 12, unit: "px" },
      chain: ["alias", "dark"],
      issue: null,
    });

    t.deepEqual(resolve("alias", { colorScheme: "light" }).value, {
      value: 8,
      unit: "px",
    });
    for (const id of ["cycle", "missing", "duplicate-a"]) {
      t.is(resolve(id).value, null);
      t.is(typeof resolve(id).issue, "string");
    }
    const selected = resolver.resolveValues([
      { id: "dark", selectConcept: true, context: { colorScheme: "light" } },
    ])[0];
    t.is(selected.selectedId, "light");
    t.is(selected.context.colorScheme, "light");
    t.is(resolve("alias").issue, "Context is missing a required mode axis.");
  } finally {
    resolver.free();
  }
});

test("batch binding returns exactly the native CLI contract", (t) => {
  const modeSets = [
    { name: "colorScheme", modes: ["light", "dark"], default: "light" },
  ];
  const queries = records.flatMap((record) =>
    ["light", "dark"].map((colorScheme) => ({
      id: record.id,
      context: { colorScheme },
      selectConcept: true,
    })),
  );
  const native = spawnSync(
    fileURLToPath(new URL("../../target/debug/design-data", import.meta.url)),
    ["resolve-values"],
    {
      input: JSON.stringify({ records, modeSets, queries }),
      encoding: "utf8",
      timeout: 10000,
    },
  );
  t.is(native.status, 0, native.error?.message ?? native.stderr);
  const resolver = new ValueResolver({ records, modeSets });
  try {
    t.deepEqual(resolver.resolveValues(queries), JSON.parse(native.stdout));
  } finally {
    resolver.free();
  }
});
