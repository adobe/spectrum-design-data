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
  // "background-color" and "content-color" are registered 2-seg compound
  // property terms, so "accent-{background,content}-color-default" would
  // collapse to property:{background,content}-color. Use "edge" (object
  // registry, no compound overlap) to test the full split.
  const result = decompose("accent-edge-color-default", {}, registry, "test");
  t.is(result.nameObject.variant, "accent");
  t.is(result.nameObject.object, "edge");
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
  t.is(result.nameObject.scaleIndex, 100);
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
  t.is(result.nameObject.scaleIndex, 100);
  const scaleGap = result.gaps.find((g) => g.type === "numeric-scale-index");
  t.truthy(scaleGap);
});

test("decomposes line-height-font-size compound with scale index", (t) => {
  // Regression: "font-size" (2-seg) used to win Phase 2's compound match over
  // "line-height" (2-seg, later in insertion order) before the fused
  // "line-height-font-size" (3-seg) compound existed, leaving line/height
  // unmatched as gaps.
  const result = decompose("line-height-font-size-100", {}, registry, "test");
  t.is(result.nameObject.property, "line-height-font-size");
  t.is(result.nameObject.scaleIndex, 100);
  t.deepEqual(result.gaps, []);
  t.true(result.roundtrips);
});

test("decomposes component-height compound with scale index", (t) => {
  const result = decompose("component-height-100", {}, registry, "test");
  t.is(result.nameObject.property, "component-height");
  t.is(result.nameObject.scaleIndex, 100);
  t.deepEqual(result.gaps, []);
  t.true(result.roundtrips);
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

test("matches typography family and emphasis as real fields, not gaps", (t) => {
  const result = decompose(
    "body-cjk-emphasized-font-weight",
    { component: "body" },
    registry,
    "test",
  );
  t.is(result.nameObject.script, "cjk");
  t.is(result.nameObject.emphasis, "emphasized");
  t.is(result.nameObject.property, "font-weight");
  t.is(result.confidence, "HIGH");
  t.true(result.roundtrips);
  t.deepEqual(result.gaps, []);
});

test("compounds adjacent emphasis terms into one hyphen-joined value", (t) => {
  const result = decompose(
    "cjk-light-strong-font-weight",
    {},
    registry,
    "test",
  );
  t.is(result.nameObject.script, "cjk");
  t.is(result.nameObject.emphasis, "light-strong");
  t.is(result.nameObject.property, "font-weight");
  t.is(result.confidence, "HIGH");
  t.true(result.roundtrips);
});

test("compounds emphasis terms alongside anatomy and script", (t) => {
  const result = decompose(
    "body-cjk-strong-emphasized-font-weight",
    { component: "body" },
    registry,
    "test",
  );
  t.is(result.nameObject.script, "cjk");
  t.is(result.nameObject.emphasis, "strong-emphasized");
  t.is(result.nameObject.property, "font-weight");
  t.true(result.roundtrips);
});

test("assigns weight, not variant, when property already resolved to font-weight", (t) => {
  // "black" is also a registered variant/color-family term; without the
  // typography-property priority boost it would win over weight (weight isn't
  // in fieldPriority) since both matches are single-segment.
  const result = decompose("font-weight-black", {}, registry, "test");
  t.is(result.nameObject.property, "font-weight");
  t.is(result.nameObject.weight, "black");
  t.is(result.nameObject.variant, undefined);
});

test("assigns weight, not size, when property already resolved to font-weight", (t) => {
  // "medium" is a registered alias for size id "m"; without the priority
  // boost it would win over weight for the same reason as "black" above.
  const result = decompose("font-weight-medium", {}, registry, "test");
  t.is(result.nameObject.property, "font-weight");
  t.is(result.nameObject.weight, "medium");
  t.is(result.nameObject.size, undefined);
});

test("assigns style when property already resolved to font-style", (t) => {
  const result = decompose("font-style-italic", {}, registry, "test");
  t.is(result.nameObject.property, "font-style");
  t.is(result.nameObject.style, "italic");
});

test("does not boost weight/style priority for non-typography properties", (t) => {
  // "black" outside a font-weight/font-style property context should still
  // resolve to variant, matching pre-existing color-domain decomposition.
  const result = decompose("black-content-color-default", {}, registry, "test");
  t.is(result.nameObject.variant, "black");
  t.is(result.nameObject.weight, undefined);
});

test("matches a lone family term with no emphasis", (t) => {
  const result = decompose("sans-serif-font-family", {}, registry, "test");
  t.is(result.nameObject.family, "sans-serif");
  t.is(result.nameObject.emphasis, undefined);
  t.is(result.nameObject.property, "font-family");
  t.true(result.roundtrips);
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

test("matches with-stepper as has-stepper qualifier", (t) => {
  const result = decompose(
    "number-field-with-stepper-minimum-width-small",
    {},
    registry,
    "test",
  );
  t.is(result.nameObject.qualifier, "has-stepper");
  t.is(result.nameObject.property, "minimum-width");
  t.is(result.nameObject.size, "s");
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
  t.is(result.nameObject.scaleIndex, 700);
  t.true(result.roundtrips);
  // Property-less but clean roundtrip (0 unmatched segments) — should score
  // HIGH regardless of the missing `property` field (dsi.4.8).
  t.is(result.confidence, "HIGH");
});

test("promotes variant → colorRole for semantic ramp tokens with no scaleIndex", (t) => {
  // dsi.6 review finding: naming.rs's semantic-ramp branch supports the bare
  // "informative-color" shape (no trailing scaleIndex) — the JS promotion
  // must not require scaleIndex to be present, unlike the hue-ramp case above.
  const result = decompose("informative-color", {}, registry, "test");
  t.is(result.nameObject.colorRole, "informative");
  t.is(result.nameObject.variant, undefined);
  t.is(result.nameObject.scaleIndex, undefined);
  t.is(result.nameObject.property, "color");
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
  // "accent" is not in colorFamily registry; "edge" is not in colorRole registry.
  // No promotion should occur even though property === "color".
  const result = decompose("accent-edge-color-default", {}, registry, "test");
  t.is(result.nameObject.variant, "accent");
  t.is(result.nameObject.object, "edge");
  t.is(result.nameObject.colorFamily, undefined);
  t.is(result.nameObject.colorRole, undefined);
});

// ── space-between (gap) endpoint decomposition ───────────────────────────────

test("decomposes space-between gap with two position endpoints", (t) => {
  // Mirrors the naming.rs doc example (naming.rs:237-238).
  const result = decompose(
    "accordion-bottom-to-handle",
    { component: "accordion" },
    registry,
    "test",
  );
  t.is(result.nameObject.property, "space-between");
  t.is(result.nameObject.from, "bottom");
  t.is(result.nameObject.to, "handle");
  t.is(result.confidence, "HIGH");
  t.true(result.roundtrips);
});

test("decomposes space-between gap with a position + generic-anatomy endpoint", (t) => {
  const result = decompose(
    "accordion-top-to-content-area",
    { component: "accordion" },
    registry,
    "test",
  );
  t.is(result.nameObject.property, "space-between");
  t.is(result.nameObject.from, "top");
  t.is(result.nameObject.to, "content-area");
  t.is(result.confidence, "HIGH");
  t.true(result.roundtrips);
});

test("decomposes space-between gap with a compound anatomy+position endpoint", (t) => {
  // "column-header-row-bottom" = declared anatomy part "column-header-row" (table)
  // + registered position "bottom" suffix — mirrors SPEC-047's split-and-retry rule
  // (spec047.rs `endpoint_resolves`) and real tokens like
  // table-column-header-row-bottom-to-text-large.
  const result = decompose(
    "table-column-header-row-bottom-to-text-large",
    { component: "table" },
    registry,
    "test",
  );
  t.is(result.nameObject.property, "space-between");
  t.is(result.nameObject.from, "column-header-row-bottom");
  t.is(result.nameObject.to, "text");
  t.is(result.nameObject.size, "l");
  t.is(result.confidence, "HIGH");
  t.true(result.roundtrips);
});

test("flags low confidence when a space-between endpoint can't fully resolve", (t) => {
  // "field-label-side" is neither a position, a generic anatomy term, nor a
  // slider-declared anatomy part — an escalated triage term (see
  // docs/proposals/012-space-between-decompose.md). The resolver falls back to
  // the largest resolvable prefix ("field-label"), leaving "side" unmatched;
  // that mismatch must surface as non-HIGH confidence / non-roundtripping so
  // apply.js's guards (apply.js:79-104) skip the token instead of mis-migrating it.
  const result = decompose(
    "slider-control-to-field-label-side-medium",
    { component: "slider" },
    registry,
    "test",
  );
  t.false(result.confidence === "HIGH" && result.roundtrips);
});

test("decomposes space-between gap preceded by a non-component field (variant)", (t) => {
  // naming.rs's general shape is {variant?}-{component?}-...-{property}, so a
  // field like variant can precede the gap connective even with no component.
  // Phase 2.5 must shrink the "from" window from the left (not just skip a
  // leading component) or "accent" gets folded into "from" and fails to
  // resolve, silently losing the gap split (regression: it previously fell
  // through with confidence !== HIGH instead of splitting variant/from/to).
  const result = decompose("accent-top-to-bottom", {}, registry, "test");
  t.is(result.nameObject.variant, "accent");
  t.is(result.nameObject.property, "space-between");
  t.is(result.nameObject.from, "top");
  t.is(result.nameObject.to, "bottom");
  t.is(result.confidence, "HIGH");
  t.true(result.roundtrips);
});

test("serialize() reconstructs the -to- connective for a space-between name", (t) => {
  const legacyKey = serialize(
    {
      component: "accordion",
      property: "space-between",
      from: "bottom",
      to: "handle",
      size: "xl",
      state: "hover",
    },
    registry.tokenNameMap,
    registry.serializationOrder,
  );
  t.is(legacyKey, "accordion-bottom-to-handle-extra-large-hover");
});

test("decomposes an icon size-N token and splits the scaleIndex (dsi.6 icon follow-up)", (t) => {
  const result = decompose("add-icon-size-200", {}, registry, "test");
  t.is(result.nameObject.icon, "add");
  t.is(result.nameObject.property, "size");
  t.is(result.nameObject.scaleIndex, 200);
  t.is(result.confidence, "HIGH");
  t.true(result.roundtrips);
});

test("serialize() reconstructs an icon size-N key with state", (t) => {
  const legacyKey = serialize(
    { icon: "checkmark", property: "size", scaleIndex: 75, state: "hover" },
    registry.tokenNameMap,
    registry.serializationOrder,
  );
  t.is(legacyKey, "checkmark-icon-size-75-hover");
});

// "link-out-icon" is also declared as an anatomy term (anatomy-terms.json), the
// same length as the icon's expanded tokenName — without metadata, Phase 3's
// length-then-priority tie-break would resolve it to `anatomy` (icon isn't in
// fieldPriority) instead of `icon`. Passing tokenData.icon (mirrors component
// metadata handling) disambiguates it before that tie-break runs.
test("metadata-provided icon resolves an anatomy/icon tokenName collision (link-out-icon)", (t) => {
  const withoutMetadata = decompose(
    "link-out-icon-size-100",
    {},
    registry,
    "test",
  );
  t.is(withoutMetadata.nameObject.anatomy, "link-out-icon");
  t.is(withoutMetadata.nameObject.icon, undefined);

  const withMetadata = decompose(
    "link-out-icon-size-100",
    { icon: "link-out" },
    registry,
    "test",
  );
  t.is(withMetadata.nameObject.icon, "link-out");
  t.is(withMetadata.nameObject.anatomy, undefined);
  t.is(withMetadata.nameObject.property, "size");
  t.is(withMetadata.nameObject.scaleIndex, 100);
  t.is(withMetadata.confidence, "HIGH");
  t.true(withMetadata.roundtrips);
});
