// Copyright 2026 Adobe. All rights reserved.

import test from "ava";
import {
  classify,
  diffSnapshots,
  propertyChanges,
  sourceOf,
} from "../src/index.js";

const snap = (rels, tokens) => ({
  rels,
  tokens: new Map(tokens.map((t) => [t.uuid, t])),
});
const rel = (ref, context = "Height", property = "p") => ({
  scope: { component: "c", property },
  context,
  $ref: ref,
});

test("propertyChanges ignores key order and reports leaf paths", (t) => {
  t.deepEqual(
    propertyChanges({ a: 1, b: { x: 1, y: 2 } }, { b: { y: 3, x: 1 }, a: 1 }),
    [{ path: "b.y", before: 2, after: 3 }],
  );
});

test("classify covers documentation, API, visual, behavior and metadata", (t) => {
  t.is(classify("lifecycle.deprecatedComment"), "documentation");
  t.is(classify("context"), "documentation");
  t.is(classify("lifecycle.deprecatedIn"), "API");
  t.is(classify("value"), "visual");
  t.is(classify("scope.options"), "behavior");
  t.is(classify("conceptId"), "metadata");
});

test("an alias whose target value moved is an indirect change with its via token", (t) => {
  const rels = [rel("alias")];
  const before = snap(rels, [
    { uuid: "alias", $ref: "base" },
    { uuid: "base", value: "4px" },
  ]);
  const after = snap(rels, [
    { uuid: "alias", $ref: "base" },
    { uuid: "base", value: "6px" },
  ]);
  const entries = diffSnapshots(before, after);
  const indirect = entries.find((e) => e.indirect);
  t.is(indirect.token, "alias");
  t.deepEqual(indirect.via, ["base"]);
  t.is(indirect.after, "6px");
  t.false(entries.find((e) => e.token === "base").indirect);
});

test("a context rename is documentation and a re-pointed binding is visual", (t) => {
  const before = snap(
    [rel("a"), rel("x", "Old", "q")],
    [
      { uuid: "a", value: "1" },
      { uuid: "b", value: "1" },
      { uuid: "x", value: "1" },
    ],
  );
  const after = snap(
    [rel("b"), rel("x", "New", "q")],
    [
      { uuid: "a", value: "1" },
      { uuid: "b", value: "1" },
      { uuid: "x", value: "1" },
    ],
  );
  const entries = diffSnapshots(before, after);
  t.true(
    entries.some((e) => e.class === "documentation" && e.path === "context"),
  );
  t.true(entries.some((e) => e.class === "visual" && e.path === "$ref"));
});

test("sourceOf reads the squash PR number, else falls back to the commit", (t) => {
  t.deepEqual(sourceOf({ sha: "abc", subject: "feat: x (#12)" }).number, 12);
  t.is(sourceOf({ sha: "abc", subject: "fix: no pr" }).type, "commit");
});
