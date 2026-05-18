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
  classifyToken,
  colorNameForKey,
  fontFamilyNameForKey,
  fontSizeNameForKey,
  fontStyleNameForKey,
  fontWeightNameForKey,
  lineHeightNameForKey,
  transformFile,
} from "../src/transform.js";

const COLOR_SCHEMA = "https://example.com/schemas/token-types/color.json";
const COLOR_SET_SCHEMA =
  "https://example.com/schemas/token-types/color-set.json";
const FONT_FAMILY_SCHEMA =
  "https://example.com/schemas/token-types/font-family.json";
const FONT_SIZE_SCHEMA =
  "https://example.com/schemas/token-types/font-size.json";
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
