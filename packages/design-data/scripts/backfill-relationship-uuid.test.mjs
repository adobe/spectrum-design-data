// Copyright 2026 Adobe. All rights reserved.

import assert from "node:assert/strict";
import test from "node:test";
import { backfill, uuidV5 } from "./backfill-relationship-uuid.mjs";

test("uuidV5 matches the RFC 4122 DNS example", () => {
  assert.equal(
    uuidV5("www.example.com", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"),
    "2ed6657d-e927-568b-95e1-2665a8aea6a2",
  );
});

test("backfill keeps existing uuids, is deterministic and separates duplicates", () => {
  const make = () => [
    { scope: { component: "a", property: "p" }, $ref: "x", context: "C" },
    { scope: { component: "a", property: "p" }, $ref: "x", context: "C" },
    { scope: { component: "a", property: "q" }, $ref: "y", uuid: "keep" },
  ];
  const one = make();
  const two = make();
  assert.equal(backfill(one, "a.json"), 2);
  backfill(two, "a.json");
  assert.deepEqual(one, two);
  assert.notEqual(one[0].uuid, one[1].uuid);
  assert.equal(one[2].uuid, "keep");
  assert.equal(backfill(one, "a.json"), 0);
});
