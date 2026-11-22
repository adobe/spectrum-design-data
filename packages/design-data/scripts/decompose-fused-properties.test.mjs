// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import assert from "node:assert/strict";
import { test } from "node:test";
import { hasStructure, plan, planFile } from "./decompose-fused-properties.mjs";

const component = {
  name: "field",
  anatomy: [{ name: "container" }, { name: "field" }, { name: "value" }],
  options: {
    size: { type: "string", values: [{ value: "s" }, { value: "m" }] },
    labelPosition: {
      type: "string",
      values: [{ value: "top" }, { value: "side" }],
    },
  },
};
const terms = new Set([
  "height",
  "space-between",
  "minimum-width",
  "size",
  "color",
  "padding-vertical",
]);
const tokens = new Map([
  ["t-m", { name: { property: "height", size: "m" } }],
  ["t-xl", { name: { property: "height", size: "xl" } }],
]);
const ctx = {
  component,
  tokens,
  terms,
  attributes: new Set(["background", "border", "shadow"]),
  file: "field.json",
  used: new Set(),
};
const rec = (scope, over = {}) => ({
  scope: { component: "field", part: "field", ...scope },
  context: "Height",
  contextRole: ["height"],
  $ref: "t-m",
  uuid: "u1",
  ...over,
});

test("hasStructure matches the status check", () => {
  assert.ok(hasStructure("component-edge-to-text-100"));
  assert.ok(hasStructure("line-height-100"));
  assert.ok(hasStructure("field-height", ["field"]));
  assert.ok(!hasStructure("space-between"));
});

test("size suffix becomes a pin and the name base the property", () => {
  const r = plan(rec({ property: "component-height-100" }), ctx);
  assert.equal(r.status, "mechanical");
  assert.equal(r.next[0].scope.property, "height");
  assert.deepEqual(r.next[0].scope.options, { size: "m" });
  assert.equal(r.next[0].uuid, "u1");
});

test("a token size that disagrees is judgement", () => {
  const r = plan(
    rec({ property: "component-height-100" }, { $ref: "t-xl" }),
    ctx,
  );
  assert.equal(r.status, "judgement");
});

test("a script-specific token is judgement, never pinned by size", () => {
  const withScript = new Map([
    [
      "cjk",
      {
        name: {
          script: "cjk",
          property: "line-height-100",
          legacyKey: "cjk-line-height-100",
        },
      },
    ],
  ]);
  const r = plan(rec({ property: "line-height-100" }, { $ref: "cjk" }), {
    ...ctx,
    tokens: withScript,
  });
  assert.equal(r.status, "judgement");
  assert.equal(r.rule, "script token");
  assert.match(r.notes[0], /^cjk-line-height-100:/);
});

test("a cjk legacyKey without a script field is still a script token", () => {
  const legacy = new Map([
    ["cjk", { name: { property: "line-height-100", legacyKey: "cjk-x" } }],
  ]);
  const r = plan(rec({ property: "line-height-100" }, { $ref: "cjk" }), {
    ...ctx,
    tokens: legacy,
  });
  assert.equal(r.rule, "script token");
});

test("an undeclared size is dropped, except -50 which is judgement", () => {
  const r200 = plan(
    rec({ property: "component-height-200" }, { $ref: "x" }),
    ctx,
  );
  assert.equal(r200.status, "mechanical");
  assert.equal(r200.next[0].scope.options, undefined);
  assert.equal(
    plan(rec({ property: "component-height-50" }, { $ref: "x" }), ctx).status,
    "judgement",
  );
});

test("a generic edge splits into two axis records with distinct uuids", () => {
  const r = plan(
    rec(
      {
        property: "component-edge-to-text-100",
        between: { from: "edge", to: "value" },
      },
      {
        context: "Spacing (start/end edge to value)",
        contextRole: ["spacing"],
      },
    ),
    ctx,
  );
  assert.equal(r.status, "mechanical");
  assert.deepEqual(
    r.next.map((n) => n.scope.between),
    [
      { from: "start-edge", to: "value" },
      { from: "value", to: "end-edge" },
    ],
  );
  assert.ok(r.next.every((n) => n.scope.property === "space-between"));
  assert.equal(r.next[0].uuid, "u1");
  assert.notEqual(r.next[1].uuid, "u1");
});

test("an edge without an axis in the context is judgement", () => {
  const r = plan(
    rec(
      { property: "space-between", between: { from: "edge", to: "value" } },
      { context: "Spacing" },
    ),
    ctx,
  );
  assert.equal(r.status, "judgement");
});

test("a name modifier needs the option on the component", () => {
  const between = { from: "field", to: "value" };
  const ok = plan(
    rec(
      { property: "side-gap-to-value", between },
      { contextRole: ["spacing"] },
    ),
    ctx,
  );
  assert.equal(ok.next[0].scope.options.labelPosition, "side");
  const refused = plan(
    rec(
      { property: "quiet-gap-to-value", between },
      { contextRole: ["spacing"] },
    ),
    ctx,
  );
  assert.equal(refused.status, "judgement");
});

test("the context keyword picks the constraint", () => {
  const r = plan(
    rec(
      { property: "workflow-icon-size-100", part: "value" },
      { context: "Prefix min-width", contextRole: ["value"] },
    ),
    ctx,
  );
  assert.equal(r.next[0].scope.property, "minimum-width");
});

test("color gets an attribute; background and border is reported; held names are untouched", () => {
  const color = (context, scope = {}) =>
    rec({ property: "color", ...scope }, { context, contextRole: undefined });
  assert.equal(
    plan(color("Background"), ctx).next[0].scope.attribute,
    "background",
  );
  assert.equal(plan(color("Border"), ctx).next[0].scope.attribute, "border");
  const split = plan(color("Background and border"), ctx);
  assert.equal(split.status, "mechanical");
  assert.deepEqual(
    split.next.map((n) => n.scope.attribute),
    ["background", "border"],
  );
  assert.equal(split.next[0].uuid, "u1");
  assert.notEqual(split.next[1].uuid, "u1");
  assert.equal(split.next[1].$ref, split.next[0].$ref);
  assert.equal(plan(color("Alert icon"), ctx).status, "ok");
  assert.equal(
    plan(color("Border", { attribute: "border" }), ctx).status,
    "ok",
  );
  assert.equal(plan(rec({ property: "border-color" }), ctx).status, "held");
});

test("deprecated, legacyKey and own-value records are skipped", () => {
  const records = [
    rec(
      { property: "component-height-100" },
      { lifecycle: { deprecatedIn: "1" } },
    ),
    rec({ property: "component-height-100" }, { legacyKey: "k" }),
    rec({ property: "component-height-100" }, { $ref: undefined, value: 1 }),
  ];
  const res = planFile(records, "field", {
    components: new Map([["field", component]]),
    tokens,
    terms,
    attributes: ctx.attributes,
  });
  assert.deepEqual(
    res.map((r) => r.status),
    ["deprecated", "skipped", "skipped"],
  );
});

test("records that become duplicates are noted", () => {
  const a = rec({ property: "component-height-100" }, { uuid: "a" });
  const b = rec({ property: "component-height-100" }, { uuid: "b" });
  const res = planFile([a, b], "field", {
    components: new Map([["field", component]]),
    tokens,
    terms,
    attributes: ctx.attributes,
  });
  assert.ok(res[1].notes.some((n) => n.startsWith("duplicate")));
});

test("records that tie on identity get a size pin from the token, one per size", () => {
  const sizes = new Map([
    ["a", { name: { size: "s" } }],
    ["b", { name: { size: "m" } }],
    ["c", { name: { size: "m", script: "cjk" } }],
  ]);
  const between = { from: "top-edge", to: "value" };
  const base = {
    components: new Map([["field", component]]),
    tokens: sizes,
    terms,
    attributes: ctx.attributes,
  };
  const mk = (uuid, $ref) =>
    rec({ property: "space-between", between }, { uuid, $ref });
  const res = planFile([mk("1", "a"), mk("2", "b")], "field", base);
  assert.deepEqual(
    res.map((r) => r.next[0].scope.options),
    [{ size: "s" }, { size: "m" }],
  );
  assert.equal(res[0].rule, "size from token");
  // a script token, or two records of one size (a desktop/mobile pair), stays unpinned
  assert.equal(
    planFile([mk("1", "a"), mk("2", "c")], "field", base)[0].status,
    "ok",
  );
  assert.equal(
    planFile([mk("1", "b"), mk("2", "b")], "field", base)[0].status,
    "ok",
  );
  // no between and nothing decomposed: left alone
  const plain = (u, r) => rec({ property: "width" }, { uuid: u, $ref: r });
  assert.equal(
    planFile([plain("1", "a"), plain("2", "b")], "field", base)[0].status,
    "ok",
  );
});

test("an edge without axis words takes its axis from the token's padding property", () => {
  const padding = new Map([
    ["h", { name: { property: "padding-horizontal" } }],
    ["x", { name: { property: "height" } }],
  ]);
  const edge = (context, $ref) =>
    plan(
      rec(
        { property: "space-between", between: { from: "edge", to: "value" } },
        { context, $ref },
      ),
      { ...ctx, tokens: padding },
    );
  assert.deepEqual(
    edge("Spacing (edge to tag group)", "h").next.map((n) => n.scope.between),
    [
      { from: "start-edge", to: "value" },
      { from: "value", to: "end-edge" },
    ],
  );
  assert.equal(
    edge("Spacing (top edge to icon)", "x").next[0].scope.between.from,
    "top-edge",
  );
  assert.equal(edge("Spacing (edge to tag group)", "x").status, "judgement");
});

test("an icon role agrees with the size property", () => {
  const sizeToken = new Map([["i", { name: { property: "size", size: "m" } }]]);
  const r = plan(
    rec(
      { property: "workflow-icon-size-100", part: "value" },
      { context: "Icon", contextRole: ["icon"], $ref: "i" },
    ),
    { ...ctx, tokens: sizeToken },
  );
  assert.equal(r.next[0].scope.property, "size");
});

test("a size word suffix is a size, extra-large included", () => {
  const sized = {
    ...component,
    options: {
      size: {
        type: "string",
        values: ["s", "m", "l", "xl"].map((value) => ({ value })),
      },
    },
  };
  const between = { from: "field-label", to: "field" };
  const r = (property) =>
    plan(rec({ property, between }, { contextRole: ["spacing"], $ref: "x" }), {
      ...ctx,
      component: sized,
    });
  assert.deepEqual(r("to-component-small").next[0].scope.options, {
    size: "s",
  });
  assert.deepEqual(r("to-component-extra-large").next[0].scope.options, {
    size: "xl",
  });
});

test("a $ref to a typography composite makes the property type-style", () => {
  const composite = {
    $schema:
      "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/typography.json",
    name: { property: "typography", size: "m" },
  };
  const c = { ...ctx, tokens: new Map([...tokens, ["c-m", composite]]) };
  const r = plan(
    rec({ property: "typography" }, { $ref: "c-m", contextRole: undefined }),
    c,
  );
  assert.equal(r.status, "mechanical");
  assert.equal(r.next[0].scope.property, "type-style");
  assert.equal(r.next[0].uuid, "u1");
  assert.equal(r.next[0].$ref, "c-m");
  assert.equal(
    plan(rec({ property: "type-style" }, { $ref: "c-m" }), c).status,
    "ok",
  );
  assert.equal(
    plan(rec({ property: "typography" }, { $ref: "c-m", legacyKey: "k" }), c)
      .status,
    "ok",
  );
  // A token that is not a composite keeps the old rules.
  assert.equal(plan(rec({ property: "height" }), c).status, "ok");
});
