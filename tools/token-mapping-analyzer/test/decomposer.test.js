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
import { decompose, serialize } from "../src/decomposer.js";

let registry;
test.before(() => {
  registry = loadRegistries();
});

test("decomposes simple variant-object-property-state token", (t) => {
  // "background-color" is a registered 2-seg compound property term, so
  // "accent-background-color-default" would collapse to property:background-color.
  // Use "content" (object registry, no compound overlap) to test the full split.
  const result = decompose(
    "accent-content-color-default",
    {},
    registry,
    "test",
  );
  t.is(result.nameObject.variant, "accent");
  t.is(result.nameObject.object, "content");
  t.is(result.nameObject.property, "color");
  t.is(result.nameObject.state, "default");
  t.is(result.confidence, "HIGH");
  t.true(result.roundtrips);
});

test("decomposes component token with metadata", (t) => {
  const result = decompose(
    "checkbox-control-size-small",
    { component: "checkbox" },
    registry,
    "test",
  );
  t.is(result.nameObject.component, "checkbox");
  t.is(result.nameObject.anatomy, "control");
  t.is(result.nameObject.size, "s");
  t.truthy(result.nameObject.property);
});

test("does not flag scaleIndex as gap when field is declared", (t) => {
  const result = decompose("spacing-100", {}, registry, "test");
  t.is(result.nameObject.scaleIndex, "100");
  const scaleGap = result.gaps.find((g) => g.type === "numeric-scale-index");
  t.falsy(scaleGap);
});

test("flags scaleIndex as gap when field is not declared", (t) => {
  const registryWithoutScaleIndex = {
    ...registry,
    allFields: new Map(),
  };
  const result = decompose(
    "spacing-100",
    {},
    registryWithoutScaleIndex,
    "test",
  );
  t.is(result.nameObject.scaleIndex, "100");
  const scaleGap = result.gaps.find((g) => g.type === "numeric-scale-index");
  t.truthy(scaleGap);
});

test("detects spacing-between pattern", (t) => {
  const result = decompose(
    "field-top-to-alert-icon-small",
    {},
    registry,
    "test",
  );
  const spacingGap = result.gaps.find((g) => g.type === "spacing-between");
  t.truthy(spacingGap);
});

test("classifies typography weight terms as gaps", (t) => {
  const result = decompose(
    "body-cjk-emphasized-font-weight",
    { component: "body" },
    registry,
    "test",
  );
  // "emphasized" is unregistered → typography-weight gap
  const weightGap = result.gaps.find((g) => g.type === "typography-weight");
  t.truthy(weightGap);
  // "cjk" is registered in the family registry → matched as family, not a gap
  t.is(result.nameObject.family, "cjk");
});

test("matches key-focus as keyboard-focus state", (t) => {
  const result = decompose(
    "accent-content-color-key-focus",
    {},
    registry,
    "test",
  );
  t.is(result.nameObject.state, "keyboard-focus");
});

test("serializes name object in spec order", (t) => {
  const nameObj = {
    variant: "accent",
    component: "button",
    object: "background",
    property: "color",
    state: "hover",
  };
  t.is(serialize(nameObj), "accent-button-background-color-hover");
});

test("handles structure-property-size pattern", (t) => {
  const result = decompose("accessory-gap-medium", {}, registry, "test");
  t.is(result.nameObject.structure, "accessory");
  t.is(result.nameObject.property, "gap");
  t.is(result.nameObject.size, "m");
});

test("processes all tokens without errors", (t) => {
  // Just verify the tool can process a known token without throwing
  const result = decompose(
    "accent-background-color-hover",
    {},
    registry,
    "test",
  );
  t.truthy(result);
  t.truthy(result.confidence);
  t.truthy(result.nameObject);
});

// ── colorFamily / colorRole promotion regression tests ───────────────────────

test("promotes variant hue → colorFamily for palette ramp tokens (scaleIndex + no component)", (t) => {
  // "blue" would match variant (priority) before colorFamily (Infinity).
  // Phase 4.5 promotes it because scaleIndex is present and there is no component.
  const result = decompose("blue-700", {}, registry, "test");
  t.is(result.nameObject.colorFamily, "blue");
  t.is(result.nameObject.variant, undefined);
  t.is(result.nameObject.scaleIndex, "700");
  t.true(result.roundtrips);
});

test("promotes variant hue + retains colorRole for component color tokens", (t) => {
  // "blue" wins variant priority over colorFamily; "primary" goes to colorRole
  // since variant is already taken. Phase 4.5 promotes blue → colorFamily.
  const result = decompose(
    "icon-color-blue-primary-default",
    { component: "icon" },
    registry,
    "test",
  );
  t.is(result.nameObject.colorFamily, "blue");
  t.is(result.nameObject.colorRole, "primary");
  t.is(result.nameObject.variant, undefined);
  t.is(result.nameObject.property, "color");
  t.is(result.confidence, "HIGH");
  t.true(result.roundtrips);
});

test("promotes variant hue + object role for component color tokens (background role)", (t) => {
  // "blue" → variant → promoted to colorFamily. "background" → object (priority)
  // → promoted to colorRole alongside the hue promotion.
  const result = decompose(
    "icon-color-blue-background",
    { component: "icon" },
    registry,
    "test",
  );
  t.is(result.nameObject.colorFamily, "blue");
  t.is(result.nameObject.colorRole, "background");
  t.is(result.nameObject.variant, undefined);
  t.is(result.nameObject.object, undefined);
  t.is(result.confidence, "HIGH");
  t.true(result.roundtrips);
});

test("does not promote non-color tokens: variant/object unaffected when property is not color", (t) => {
  // "accent" is not in colorFamily registry; "content" is not in colorRole registry.
  // No promotion should occur even though property === "color".
  const result = decompose(
    "accent-content-color-default",
    {},
    registry,
    "test",
  );
  t.is(result.nameObject.variant, "accent");
  t.is(result.nameObject.object, "content");
  t.is(result.nameObject.colorFamily, undefined);
  t.is(result.nameObject.colorRole, undefined);
});
