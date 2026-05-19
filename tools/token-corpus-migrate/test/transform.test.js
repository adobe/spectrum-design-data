/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import {
  alignmentNameForKey,
  classifyToken,
  colorNameForKey,
  fontFamilyNameForKey,
  fontSizeNameForKey,
  fontStyleNameForKey,
  fontWeightNameForKey,
  iconColorNameForKey,
  letterSpacingNameForKey,
  lineHeightMultiplierNameForKey,
  lineHeightNameForKey,
  transformFile,
} from "../src/transform.js";

const COLOR_SCHEMA = "https://example.com/schemas/token-types/color.json";
const COLOR_SET_SCHEMA =
  "https://example.com/schemas/token-types/color-set.json";
const FONT_FAMILY_SCHEMA =
  "https://example.com/schemas/token-types/font-family.json";
const FONT_STYLE_SCHEMA =
  "https://example.com/schemas/token-types/font-style.json";
const FONT_WEIGHT_SCHEMA =
  "https://example.com/schemas/token-types/font-weight.json";
const SCALE_SET_SCHEMA =
  "https://example.com/schemas/token-types/scale-set.json";
const ALIAS_SCHEMA = "https://example.com/schemas/token-types/alias.json";

// ── colorNameForKey ───────────────────────────────────────────────────────────

test("colorNameForKey: ramp token returns colorFamily + scaleIndex", (t) => {
  const name = colorNameForKey("blue-100");
  t.deepEqual(name, {
    property: "color",
    colorFamily: "blue",
    scaleIndex: 100,
  });
});

test("colorNameForKey: high ramp value", (t) => {
  const name = colorNameForKey("gray-1600");
  t.deepEqual(name, {
    property: "color",
    colorFamily: "gray",
    scaleIndex: 1600,
  });
});

test("colorNameForKey: bare family id (black)", (t) => {
  t.deepEqual(colorNameForKey("black"), {
    property: "color",
    colorFamily: "black",
  });
});

test("colorNameForKey: bare family id (white)", (t) => {
  t.deepEqual(colorNameForKey("white"), {
    property: "color",
    colorFamily: "white",
  });
});

test("colorNameForKey: transparent-black", (t) => {
  t.deepEqual(colorNameForKey("transparent-black"), {
    property: "color",
    colorFamily: "transparent-black",
  });
});

test("colorNameForKey: transparent-white", (t) => {
  t.deepEqual(colorNameForKey("transparent-white"), {
    property: "color",
    colorFamily: "transparent-white",
  });
});

test("colorNameForKey: static ramp token", (t) => {
  const name = colorNameForKey("static-blue-600");
  t.deepEqual(name, {
    property: "color",
    colorFamily: "static-blue",
    scaleIndex: 600,
  });
});

test("colorNameForKey: unknown key returns null", (t) => {
  t.is(colorNameForKey("gradient-stop-1-avatar"), null);
});

test("colorNameForKey: unknown family in ramp returns null", (t) => {
  t.is(colorNameForKey("mystery-100"), null);
});

// ── fontWeightNameForKey ──────────────────────────────────────────────────────

test("fontWeightNameForKey: known weight", (t) => {
  t.deepEqual(fontWeightNameForKey("bold-font-weight"), {
    property: "font-weight",
    weight: "bold",
  });
});

test("fontWeightNameForKey: black weight", (t) => {
  t.deepEqual(fontWeightNameForKey("black-font-weight"), {
    property: "font-weight",
    weight: "black",
  });
});

test("fontWeightNameForKey: extra-bold weight", (t) => {
  t.deepEqual(fontWeightNameForKey("extra-bold-font-weight"), {
    property: "font-weight",
    weight: "extra-bold",
  });
});

test("fontWeightNameForKey: unknown weight returns null", (t) => {
  t.is(fontWeightNameForKey("semibold-font-weight"), null);
});

test("fontWeightNameForKey: non-weight key returns null", (t) => {
  t.is(fontWeightNameForKey("body-cjk-emphasized-font-weight"), null);
});

// ── classifyToken ─────────────────────────────────────────────────────────────

test("classifyToken: color ramp token gets name", (t) => {
  const token = { $schema: COLOR_SCHEMA, uuid: "abc", value: "#fff" };
  const result = classifyToken("blue-100", token);
  t.deepEqual(result, {
    name: { property: "color", colorFamily: "blue", scaleIndex: 100 },
  });
});

test("classifyToken: color-set token gets name", (t) => {
  const token = { $schema: COLOR_SET_SCHEMA, uuid: "abc" };
  const result = classifyToken("red-400", token);
  t.deepEqual(result, {
    name: { property: "color", colorFamily: "red", scaleIndex: 400 },
  });
});

test("classifyToken: token already has name is skipped", (t) => {
  const token = {
    $schema: COLOR_SCHEMA,
    name: { property: "color", colorFamily: "blue", scaleIndex: 100 },
    uuid: "abc",
    value: "#fff",
  };
  t.is(classifyToken("blue-100", token), null);
});

test("classifyToken: alias token is out of scope (null)", (t) => {
  const token = { $schema: ALIAS_SCHEMA, uuid: "abc", value: "{blue-100}" };
  t.is(classifyToken("body-color", token), null);
});

test("classifyToken: color token with unclassifiable key returns name:null", (t) => {
  const token = { $schema: COLOR_SCHEMA, uuid: "abc", value: "0" };
  const result = classifyToken("gradient-stop-1-avatar", token);
  t.deepEqual(result, { name: null });
});

test("classifyToken: font-weight canonical token gets name", (t) => {
  const token = { $schema: FONT_WEIGHT_SCHEMA, uuid: "abc", value: "bold" };
  const result = classifyToken("bold-font-weight", token);
  t.deepEqual(result, { name: { property: "font-weight", weight: "bold" } });
});

test("classifyToken: font-weight alias is out of scope (null)", (t) => {
  const token = {
    $schema: ALIAS_SCHEMA,
    uuid: "abc",
    value: "{bold-font-weight}",
  };
  t.is(classifyToken("body-cjk-strong-font-weight", token), null);
});

test("classifyToken: manual override applied", (t) => {
  const token = { $schema: COLOR_SCHEMA, uuid: "abc", value: "#000" };
  const overrides = {
    "my-special-token": { name: { property: "color", colorFamily: "gray" } },
  };
  const result = classifyToken("my-special-token", token, overrides);
  t.deepEqual(result, { name: { property: "color", colorFamily: "gray" } });
});

// ── transformFile ─────────────────────────────────────────────────────────────

test("transformFile: injects name into color tokens, leaves others untouched", (t) => {
  const tokens = {
    "blue-100": { $schema: COLOR_SCHEMA, uuid: "a", value: "#fff" },
    "body-font": { $schema: ALIAS_SCHEMA, uuid: "b", value: "{sans-serif}" },
    "bold-font-weight": {
      $schema: FONT_WEIGHT_SCHEMA,
      uuid: "c",
      value: "bold",
    },
  };
  const { transformed, classified, unclassified, skipped } =
    transformFile(tokens);
  t.is(classified, 2);
  t.is(skipped, 1);
  t.is(unclassified.length, 0);
  t.deepEqual(transformed["blue-100"].name, {
    property: "color",
    colorFamily: "blue",
    scaleIndex: 100,
  });
  t.deepEqual(transformed["bold-font-weight"].name, {
    property: "font-weight",
    weight: "bold",
  });
  t.false("name" in transformed["body-font"]);
});

test("transformFile: unclassifiable in-scope token reported, not modified", (t) => {
  const tokens = {
    "gradient-stop-1-avatar": { $schema: COLOR_SCHEMA, uuid: "a", value: "0" },
  };
  const { unclassified, transformed } = transformFile(tokens);
  t.is(unclassified.length, 1);
  t.is(unclassified[0], "gradient-stop-1-avatar");
  t.false("name" in transformed["gradient-stop-1-avatar"]);
});

test("transformFile: override is applied via transformFile", (t) => {
  const tokens = {
    "gradient-stop-1-avatar": { $schema: COLOR_SCHEMA, uuid: "a", value: "0" },
  };
  const overrides = {
    "gradient-stop-1-avatar": {
      name: { property: "color", colorFamily: "gray" },
    },
  };
  const { transformed, classified, unclassified } = transformFile(
    tokens,
    overrides,
  );
  t.is(classified, 1);
  t.is(unclassified.length, 0);
  t.deepEqual(transformed["gradient-stop-1-avatar"].name, {
    property: "color",
    colorFamily: "gray",
  });
});

// ── fontFamilyNameForKey ──────────────────────────────────────────────────────

test("fontFamilyNameForKey: sans-serif", (t) => {
  t.deepEqual(fontFamilyNameForKey("sans-serif-font-family"), {
    property: "font-family",
    family: "sans-serif",
  });
});

test("fontFamilyNameForKey: serif", (t) => {
  t.deepEqual(fontFamilyNameForKey("serif-font-family"), {
    property: "font-family",
    family: "serif",
  });
});

test("fontFamilyNameForKey: cjk", (t) => {
  t.deepEqual(fontFamilyNameForKey("cjk-font-family"), {
    property: "font-family",
    family: "cjk",
  });
});

test("fontFamilyNameForKey: code", (t) => {
  t.deepEqual(fontFamilyNameForKey("code-font-family"), {
    property: "font-family",
    family: "code",
  });
});

test("fontFamilyNameForKey: unknown family returns null", (t) => {
  t.is(fontFamilyNameForKey("monospace-font-family"), null);
});

test("fontFamilyNameForKey: non-family key returns null", (t) => {
  t.is(fontFamilyNameForKey("body-font-size"), null);
});

// ── fontStyleNameForKey ───────────────────────────────────────────────────────

test("fontStyleNameForKey: italic via key prefix", (t) => {
  t.deepEqual(fontStyleNameForKey("italic-font-style", { value: "italic" }), {
    property: "font-style",
    style: "italic",
  });
});

test("fontStyleNameForKey: default key falls back to token value (normal)", (t) => {
  t.deepEqual(fontStyleNameForKey("default-font-style", { value: "normal" }), {
    property: "font-style",
    style: "normal",
  });
});

test("fontStyleNameForKey: oblique via key prefix", (t) => {
  t.deepEqual(fontStyleNameForKey("oblique-font-style", { value: "oblique" }), {
    property: "font-style",
    style: "oblique",
  });
});

test("fontStyleNameForKey: unknown key and unknown value returns null", (t) => {
  t.is(fontStyleNameForKey("mystery-font-style", { value: "condensed" }), null);
});

test("fontStyleNameForKey: non-style key returns null", (t) => {
  t.is(fontStyleNameForKey("bold-font-weight", {}), null);
});

// ── fontSizeNameForKey ────────────────────────────────────────────────────────

test("fontSizeNameForKey: font-size-100", (t) => {
  t.deepEqual(fontSizeNameForKey("font-size-100"), {
    property: "font-size",
    scaleIndex: 100,
  });
});

test("fontSizeNameForKey: font-size-1500", (t) => {
  t.deepEqual(fontSizeNameForKey("font-size-1500"), {
    property: "font-size",
    scaleIndex: 1500,
  });
});

test("fontSizeNameForKey: non-numeric suffix returns null", (t) => {
  t.is(fontSizeNameForKey("font-size-foo"), null);
});

test("fontSizeNameForKey: line-height key returns null", (t) => {
  t.is(fontSizeNameForKey("line-height-font-size-100"), null);
});

// ── lineHeightNameForKey ──────────────────────────────────────────────────────

test("lineHeightNameForKey: line-height-font-size-75", (t) => {
  t.deepEqual(lineHeightNameForKey("line-height-font-size-75"), {
    property: "line-height",
    scaleIndex: 75,
  });
});

test("lineHeightNameForKey: line-height-font-size-900", (t) => {
  t.deepEqual(lineHeightNameForKey("line-height-font-size-900"), {
    property: "line-height",
    scaleIndex: 900,
  });
});

test("lineHeightNameForKey: plain font-size key returns null", (t) => {
  t.is(lineHeightNameForKey("font-size-100"), null);
});

test("lineHeightNameForKey: non-match returns null", (t) => {
  t.is(lineHeightNameForKey("body-line-height"), null);
});

// ── classifyToken (new schema types) ─────────────────────────────────────────

test("classifyToken: font-family token gets name", (t) => {
  const token = {
    $schema: FONT_FAMILY_SCHEMA,
    uuid: "abc",
    value: "Adobe Clean",
  };
  t.deepEqual(classifyToken("sans-serif-font-family", token), {
    name: { property: "font-family", family: "sans-serif" },
  });
});

test("classifyToken: font-style italic token gets name", (t) => {
  const token = { $schema: FONT_STYLE_SCHEMA, uuid: "abc", value: "italic" };
  t.deepEqual(classifyToken("italic-font-style", token), {
    name: { property: "font-style", style: "italic" },
  });
});

test("classifyToken: font-style default token gets name with style: normal", (t) => {
  const token = { $schema: FONT_STYLE_SCHEMA, uuid: "abc", value: "normal" };
  t.deepEqual(classifyToken("default-font-style", token), {
    name: { property: "font-style", style: "normal" },
  });
});

test("classifyToken: scale-set font-size token gets name", (t) => {
  const token = { $schema: SCALE_SET_SCHEMA, uuid: "abc" };
  t.deepEqual(classifyToken("font-size-100", token), {
    name: { property: "font-size", scaleIndex: 100 },
  });
});

test("classifyToken: scale-set line-height token gets name", (t) => {
  const token = { $schema: SCALE_SET_SCHEMA, uuid: "abc" };
  t.deepEqual(classifyToken("line-height-font-size-100", token), {
    name: { property: "line-height", scaleIndex: 100 },
  });
});

test("classifyToken: other scale-set tokens are out of scope (null)", (t) => {
  const token = { $schema: SCALE_SET_SCHEMA, uuid: "abc" };
  // A layout token keyed as a scale-set — not in scope
  t.is(classifyToken("spacing-100", token), null);
});

// ── transformFile (typography round) ─────────────────────────────────────────

test("transformFile: injects name into typography canonical tokens", (t) => {
  const tokens = {
    "sans-serif-font-family": {
      $schema: FONT_FAMILY_SCHEMA,
      uuid: "a",
      value: "Adobe Clean",
    },
    "italic-font-style": {
      $schema: FONT_STYLE_SCHEMA,
      uuid: "b",
      value: "italic",
    },
    "default-font-style": {
      $schema: FONT_STYLE_SCHEMA,
      uuid: "c",
      value: "normal",
    },
    "font-size-100": { $schema: SCALE_SET_SCHEMA, uuid: "d" },
    "line-height-font-size-100": { $schema: SCALE_SET_SCHEMA, uuid: "e" },
    "body-font-size": {
      $schema: ALIAS_SCHEMA,
      uuid: "f",
      value: "{font-size-100}",
    },
  };
  const { transformed, classified, skipped } = transformFile(tokens);
  t.is(classified, 5);
  t.is(skipped, 1); // alias
  t.deepEqual(transformed["sans-serif-font-family"].name, {
    property: "font-family",
    family: "sans-serif",
  });
  t.deepEqual(transformed["italic-font-style"].name, {
    property: "font-style",
    style: "italic",
  });
  t.deepEqual(transformed["default-font-style"].name, {
    property: "font-style",
    style: "normal",
  });
  t.deepEqual(transformed["font-size-100"].name, {
    property: "font-size",
    scaleIndex: 100,
  });
  t.deepEqual(transformed["line-height-font-size-100"].name, {
    property: "line-height",
    scaleIndex: 100,
  });
  t.false("name" in transformed["body-font-size"]);
});

// ── iconColorNameForKey ───────────────────────────────────────────────────────

test("iconColorNameForKey: background token", (t) => {
  t.deepEqual(iconColorNameForKey("icon-color-blue-background"), {
    property: "icon-color",
    colorFamily: "blue",
    object: "background",
  });
});

test("iconColorNameForKey: primary-default (no state field)", (t) => {
  t.deepEqual(iconColorNameForKey("icon-color-cinnamon-primary-default"), {
    property: "icon-color",
    colorFamily: "cinnamon",
    variant: "primary",
  });
});

test("iconColorNameForKey: primary-hover", (t) => {
  t.deepEqual(iconColorNameForKey("icon-color-cinnamon-primary-hover"), {
    property: "icon-color",
    colorFamily: "cinnamon",
    variant: "primary",
    state: "hover",
  });
});

test("iconColorNameForKey: primary-down", (t) => {
  t.deepEqual(iconColorNameForKey("icon-color-cinnamon-primary-down"), {
    property: "icon-color",
    colorFamily: "cinnamon",
    variant: "primary",
    state: "down",
  });
});

test("iconColorNameForKey: bare primary (no state suffix)", (t) => {
  t.deepEqual(iconColorNameForKey("icon-color-blue-primary"), {
    property: "icon-color",
    colorFamily: "blue",
    variant: "primary",
  });
});

test("iconColorNameForKey: unknown family returns null", (t) => {
  t.is(iconColorNameForKey("icon-color-bogus-background"), null);
});

test("iconColorNameForKey: semantic alias (no family segment) returns null", (t) => {
  t.is(iconColorNameForKey("icon-color-inverse"), null);
});

test("iconColorNameForKey: non-icon key returns null", (t) => {
  t.is(iconColorNameForKey("blue-100"), null);
});

// ── classifyToken (icon-color) ────────────────────────────────────────────────

test("classifyToken: color-set icon-color-background routes to icon classifier", (t) => {
  const token = { $schema: COLOR_SET_SCHEMA, uuid: "abc" };
  t.deepEqual(classifyToken("icon-color-blue-background", token), {
    name: {
      property: "icon-color",
      colorFamily: "blue",
      object: "background",
    },
  });
});

test("classifyToken: color-set icon-color-primary-hover routes to icon classifier", (t) => {
  const token = { $schema: COLOR_SET_SCHEMA, uuid: "abc" };
  t.deepEqual(classifyToken("icon-color-blue-primary-hover", token), {
    name: {
      property: "icon-color",
      colorFamily: "blue",
      variant: "primary",
      state: "hover",
    },
  });
});

test("classifyToken: alias icon-color-blue-background is out of scope (SPEC-042: colorFamily not allowed on alias schema)", (t) => {
  const token = { $schema: ALIAS_SCHEMA, uuid: "abc", value: "{blue-200}" };
  t.is(classifyToken("icon-color-blue-background", token), null);
});

test("classifyToken: alias icon-color-inverse is out of scope (null)", (t) => {
  const token = { $schema: ALIAS_SCHEMA, uuid: "abc", value: "{gray-50}" };
  t.is(classifyToken("icon-color-inverse", token), null);
});

test("classifyToken: non-icon alias is out of scope (null)", (t) => {
  const token = { $schema: ALIAS_SCHEMA, uuid: "abc", value: "{blue-100}" };
  t.is(classifyToken("body-color", token), null);
});

// ── transformFile (icons round) ───────────────────────────────────────────────

test("transformFile: injects names on color-set icon tokens; alias tokens are out of scope", (t) => {
  const tokens = {
    "icon-color-blue-background": { $schema: COLOR_SET_SCHEMA, uuid: "a" },
    "icon-color-blue-primary-default": { $schema: COLOR_SET_SCHEMA, uuid: "b" },
    "icon-color-blue-primary-hover": { $schema: COLOR_SET_SCHEMA, uuid: "c" },
    "icon-color-cinnamon-primary-default": {
      $schema: ALIAS_SCHEMA,
      uuid: "d",
      value: "{cinnamon-800}",
    },
    "icon-color-inverse": {
      $schema: ALIAS_SCHEMA,
      uuid: "e",
      value: "{gray-50}",
    },
  };
  const { transformed, classified, unclassified, skipped } =
    transformFile(tokens);
  t.is(classified, 3);
  t.is(skipped, 2); // alias tokens — colorFamily not allowed on alias.json (SPEC-042)
  t.deepEqual(unclassified, []);
  t.deepEqual(transformed["icon-color-blue-background"].name, {
    property: "icon-color",
    colorFamily: "blue",
    object: "background",
  });
  t.deepEqual(transformed["icon-color-blue-primary-default"].name, {
    property: "icon-color",
    colorFamily: "blue",
    variant: "primary",
  });
  t.deepEqual(transformed["icon-color-blue-primary-hover"].name, {
    property: "icon-color",
    colorFamily: "blue",
    variant: "primary",
    state: "hover",
  });
  t.false("name" in transformed["icon-color-cinnamon-primary-default"]);
  t.false("name" in transformed["icon-color-inverse"]);
});

// ── alignmentNameForKey ───────────────────────────────────────────────────────

test("alignmentNameForKey: start", (t) => {
  t.deepEqual(alignmentNameForKey("text-align-start"), {
    property: "text-align",
    alignment: "start",
  });
});

test("alignmentNameForKey: center", (t) => {
  t.deepEqual(alignmentNameForKey("text-align-center"), {
    property: "text-align",
    alignment: "center",
  });
});

test("alignmentNameForKey: end", (t) => {
  t.deepEqual(alignmentNameForKey("text-align-end"), {
    property: "text-align",
    alignment: "end",
  });
});

test("alignmentNameForKey: unregistered value returns null", (t) => {
  t.is(alignmentNameForKey("text-align-justify"), null);
});

test("alignmentNameForKey: non-alignment key returns null", (t) => {
  t.is(alignmentNameForKey("body-color"), null);
});

// ── lineHeightMultiplierNameForKey ────────────────────────────────────────────

test("lineHeightMultiplierNameForKey: line-height-100", (t) => {
  t.deepEqual(lineHeightMultiplierNameForKey("line-height-100"), {
    property: "line-height",
    scaleIndex: 100,
  });
});

test("lineHeightMultiplierNameForKey: line-height-200", (t) => {
  t.deepEqual(lineHeightMultiplierNameForKey("line-height-200"), {
    property: "line-height",
    scaleIndex: 200,
  });
});

test("lineHeightMultiplierNameForKey: cjk-line-height deferred (SPEC-042: family not allowed on multiplier.json)", (t) => {
  t.is(lineHeightMultiplierNameForKey("cjk-line-height-100"), null);
  t.is(lineHeightMultiplierNameForKey("cjk-line-height-200"), null);
});

test("lineHeightMultiplierNameForKey: margin multiplier is out of scope", (t) => {
  t.is(lineHeightMultiplierNameForKey("body-margin-multiplier"), null);
});

test("lineHeightMultiplierNameForKey: scale-set line-height key returns null", (t) => {
  t.is(lineHeightMultiplierNameForKey("line-height-font-size-100"), null);
});

// ── letterSpacingNameForKey ───────────────────────────────────────────────────

test("letterSpacingNameForKey: bare letter-spacing", (t) => {
  t.deepEqual(letterSpacingNameForKey("letter-spacing"), {
    property: "letter-spacing",
  });
});

test("letterSpacingNameForKey: semantic detail-letter-spacing returns null", (t) => {
  t.is(letterSpacingNameForKey("detail-letter-spacing"), null);
});

test("letterSpacingNameForKey: unrelated key returns null", (t) => {
  t.is(letterSpacingNameForKey("font-size-100"), null);
});

// ── classifyToken (alignment / multiplier / dimension) ────────────────────────

const ALIGNMENT_SCHEMA_URL =
  "https://example.com/schemas/token-types/alignment.json";
const DIMENSION_SCHEMA_URL =
  "https://example.com/schemas/token-types/dimension.json";
const MULTIPLIER_SCHEMA_URL =
  "https://example.com/schemas/token-types/multiplier.json";

test("classifyToken: alignment token classifies", (t) => {
  const token = { $schema: ALIGNMENT_SCHEMA_URL, uuid: "abc", value: "start" };
  t.deepEqual(classifyToken("text-align-start", token), {
    name: { property: "text-align", alignment: "start" },
  });
});

test("classifyToken: alignment token with unknown value is in-scope but unclassified", (t) => {
  const token = {
    $schema: ALIGNMENT_SCHEMA_URL,
    uuid: "abc",
    value: "justify",
  };
  t.deepEqual(classifyToken("text-align-justify", token), { name: null });
});

test("classifyToken: line-height multiplier is out of scope (SPEC-006: collides with scale-set line-height-font-size-N)", (t) => {
  const token = { $schema: MULTIPLIER_SCHEMA_URL, uuid: "abc", value: 1.3 };
  t.is(classifyToken("line-height-100", token), null);
});

test("classifyToken: cjk-line-height multiplier is out of scope (SPEC-042: family not allowed on multiplier.json)", (t) => {
  const token = { $schema: MULTIPLIER_SCHEMA_URL, uuid: "abc", value: 1.5 };
  t.is(classifyToken("cjk-line-height-100", token), null);
});

test("classifyToken: margin multiplier is out of scope (null)", (t) => {
  const token = {
    $schema: MULTIPLIER_SCHEMA_URL,
    uuid: "abc",
    value: 0.75,
  };
  t.is(classifyToken("body-margin-multiplier", token), null);
});

test("classifyToken: bare letter-spacing dimension classifies", (t) => {
  const token = { $schema: DIMENSION_SCHEMA_URL, uuid: "abc", value: "0em" };
  t.deepEqual(classifyToken("letter-spacing", token), {
    name: { property: "letter-spacing" },
  });
});

test("classifyToken: detail-letter-spacing dimension is out of scope (null)", (t) => {
  const token = {
    $schema: DIMENSION_SCHEMA_URL,
    uuid: "abc",
    value: "0.06em",
  };
  t.is(classifyToken("detail-letter-spacing", token), null);
});

// ── transformFile (typography stragglers round) ───────────────────────────────

test("transformFile: classifies text-align, line-height multipliers, and letter-spacing; leaves semantic stragglers untouched", (t) => {
  const tokens = {
    "text-align-start": {
      $schema: ALIGNMENT_SCHEMA_URL,
      uuid: "a",
      value: "start",
    },
    "text-align-center": {
      $schema: ALIGNMENT_SCHEMA_URL,
      uuid: "b",
      value: "center",
    },
    "text-align-end": {
      $schema: ALIGNMENT_SCHEMA_URL,
      uuid: "c",
      value: "end",
    },
    "line-height-100": {
      $schema: MULTIPLIER_SCHEMA_URL,
      uuid: "d",
      value: 1.3,
    },
    "cjk-line-height-100": {
      $schema: MULTIPLIER_SCHEMA_URL,
      uuid: "f",
      value: 1.5,
    },
    "letter-spacing": {
      $schema: DIMENSION_SCHEMA_URL,
      uuid: "h",
      value: "0em",
    },
    "body-margin-multiplier": {
      $schema: MULTIPLIER_SCHEMA_URL,
      uuid: "i",
      value: 0.75,
    },
    "detail-letter-spacing": {
      $schema: DIMENSION_SCHEMA_URL,
      uuid: "j",
      value: "0.06em",
    },
  };
  const { transformed, classified, unclassified, skipped } =
    transformFile(tokens);
  t.is(classified, 4);
  t.is(skipped, 4); // line-height-100 + cjk-line-height-100 + body-margin-multiplier + detail-letter-spacing
  t.deepEqual(unclassified, []);
  t.deepEqual(transformed["text-align-start"].name, {
    property: "text-align",
    alignment: "start",
  });
  t.deepEqual(transformed["text-align-center"].name, {
    property: "text-align",
    alignment: "center",
  });
  t.deepEqual(transformed["text-align-end"].name, {
    property: "text-align",
    alignment: "end",
  });
  t.false("name" in transformed["line-height-100"]);
  t.false("name" in transformed["cjk-line-height-100"]);
  t.deepEqual(transformed["letter-spacing"].name, {
    property: "letter-spacing",
  });
  t.false("name" in transformed["body-margin-multiplier"]);
  t.false("name" in transformed["detail-letter-spacing"]);
});
