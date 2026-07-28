// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { loadRegistries } from "../src/registry-index.js";
import { analyzeProperty } from "../src/property-atomicity.js";

let registry;
test.before(() => {
  registry = loadRegistries();
});

test("atomic: plain registered property term", (t) => {
  const result = analyzeProperty("color", registry);
  t.true(result.atomic);
  t.false(result.fused);
});

test("atomic: compound CSS property short-circuits before structural scan", (t) => {
  const result = analyzeProperty("font-size", registry);
  t.true(result.atomic);
  t.false(result.fused);
});

test("fused: background-color roundtrips cleanly (registered legacy alias) but still fuses surface + property (spectrum-design-data-284 example)", (t) => {
  const result = analyzeProperty("background-color", registry);
  t.false(result.atomic);
  t.true(result.fused);
  // "background" is a registered id in both object.json (surface) and
  // color-roles.json -- either match is a legitimate structural collision,
  // so assert the union rather than a specific field.
  t.true(!!result.fields.object || !!result.fields.colorRole);
  t.is(result.bucket, "surface-colorRole");
});

test("fused: icon-color-informative fuses anatomy + colorRole (spectrum-design-data-284 primary example)", (t) => {
  const result = analyzeProperty("icon-color-informative", registry);
  t.true(result.fused);
  t.deepEqual(result.fields.anatomy, ["icon"]);
  t.deepEqual(result.fields.colorRole, ["informative"]);
  // colorRole present -> surface-colorRole bucket takes priority over anatomy-only "other"
  t.is(result.bucket, "surface-colorRole");
});

test("fused: edge-to-content-default-large fuses object + size, but routes to position-size-state (284.2) since it's a layout token, not color/typography", (t) => {
  const result = analyzeProperty("edge-to-content-default-large", registry);
  t.true(result.fused);
  t.truthy(result.fields.object);
  t.truthy(result.fields.size);
  t.is(result.bucket, "position-size-state");
});

test("fused: two state segments classify as compound-state", (t) => {
  const result = analyzeProperty("selected-hover", registry);
  t.true(result.fused);
  t.is(result.fields.state.length, 2);
  t.is(result.bucket, "compound-state");
});

test("fused: state + emphasis classifies as compound-state", (t) => {
  const result = analyzeProperty("emphasized-hover", registry);
  t.true(result.fused);
  t.truthy(result.fields.state);
  t.truthy(result.fields.emphasis);
  t.is(result.bucket, "compound-state");
});

test("unclassified: unregistered property with no structural collision", (t) => {
  const result = analyzeProperty("totally-unregistered-property-xyz", registry);
  t.false(result.atomic);
  t.false(result.fused);
  t.is(result.bucket, "unclassified");
});
