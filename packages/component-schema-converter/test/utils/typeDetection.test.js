/*
Copyright 2025 Adobe. All rights reserved.
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
  isSizeEnum,
  isStateEnum,
  isIconRef,
  isColorRef,
  detectOptionType,
  isValidHexColor,
  getValidSizeValues,
  getStateKeywords,
} from "../../src/utils/typeDetection.js";

// isSizeEnum tests
test("isSizeEnum detects valid size arrays", (t) => {
  t.true(isSizeEnum(["s", "m", "l"]));
  t.true(isSizeEnum(["xs", "s", "m", "l", "xl"]));
  t.true(isSizeEnum(["s", "m", "l", "xl", "xxl"]));
  t.true(isSizeEnum(["xs", "s", "m", "l", "xl", "xxl", "xxxl"]));
});

test("isSizeEnum rejects non-size arrays", (t) => {
  t.false(isSizeEnum(["small", "medium", "large"]));
  t.false(isSizeEnum(["s", "m", "large"])); // Mixed valid/invalid
  t.false(isSizeEnum(["enabled", "disabled"]));
  t.false(isSizeEnum([])); // Empty array
  t.false(isSizeEnum(null));
  t.false(isSizeEnum(undefined));
  t.false(isSizeEnum("not an array"));
});

// isStateEnum tests
test("isStateEnum detects valid state arrays", (t) => {
  t.true(isStateEnum(["default", "hover", "focus"]));
  t.true(isStateEnum(["keyboard focus", "down"]));
  t.true(isStateEnum(["hover", "active"]));
  t.true(isStateEnum(["disabled", "default"]));
  t.true(isStateEnum(["pressed", "selected"]));
});

test("isStateEnum rejects non-state arrays", (t) => {
  // Note: "disabled" contains the keyword "disabled" so it's considered a state
  // We're testing that pure on/off or enable patterns without state keywords return false
  t.false(isStateEnum(["on", "off"]));
  t.false(isStateEnum(["accent", "primary"])); // Variants, not states
  t.false(isStateEnum(["enabled"])); // Just "enabled" without state keywords
  t.false(isStateEnum([])); // Empty array
  t.false(isStateEnum(null));
  t.false(isStateEnum(undefined));
});

// isIconRef tests
test("isIconRef detects workflow icon references", (t) => {
  t.true(
    isIconRef(
      "https://opensource.adobe.com/spectrum-design-data/schemas/types/workflow-icon.json",
    ),
  );
  t.true(isIconRef("workflow-icon.json"));
  t.true(isIconRef("/path/to/workflow-icon.json"));
});

test("isIconRef rejects non-icon references", (t) => {
  t.false(
    isIconRef(
      "https://opensource.adobe.com/spectrum-design-data/schemas/types/hex-color.json",
    ),
  );
  t.false(isIconRef("hex-color.json"));
  t.false(isIconRef(""));
  t.false(isIconRef(null));
  t.false(isIconRef(undefined));
});

// isColorRef tests
test("isColorRef detects hex color references", (t) => {
  t.true(
    isColorRef(
      "https://opensource.adobe.com/spectrum-design-data/schemas/types/hex-color.json",
    ),
  );
  t.true(isColorRef("hex-color.json"));
  t.true(isColorRef("/path/to/hex-color.json"));
});

test("isColorRef rejects non-color references", (t) => {
  t.false(
    isColorRef(
      "https://opensource.adobe.com/spectrum-design-data/schemas/types/workflow-icon.json",
    ),
  );
  t.false(isColorRef("workflow-icon.json"));
  t.false(isColorRef(""));
  t.false(isColorRef(null));
  t.false(isColorRef(undefined));
});

// detectOptionType tests
test("detectOptionType detects boolean type", (t) => {
  t.is(detectOptionType({ type: "boolean" }), "boolean");
});

test("detectOptionType detects string type", (t) => {
  t.is(detectOptionType({ type: "string" }), "string");
});

test("detectOptionType detects dimension type", (t) => {
  t.is(detectOptionType({ type: "number" }), "dimension");
});

test("detectOptionType detects size enum", (t) => {
  t.is(
    detectOptionType({ type: "string", enum: ["s", "m", "l", "xl"] }),
    "size",
  );
});

test("detectOptionType detects state enum", (t) => {
  t.is(
    detectOptionType({
      type: "string",
      enum: ["default", "hover", "focus", "keyboard focus"],
    }),
    "state",
  );
});

test("detectOptionType detects local enum", (t) => {
  t.is(
    detectOptionType({
      type: "string",
      enum: ["accent", "negative", "primary", "secondary"],
    }),
    "localEnum",
  );
});

test("detectOptionType detects icon ref", (t) => {
  t.is(
    detectOptionType({
      $ref: "https://opensource.adobe.com/spectrum-design-data/schemas/types/workflow-icon.json",
    }),
    "icon",
  );
});

test("detectOptionType detects color ref", (t) => {
  t.is(
    detectOptionType({
      $ref: "https://opensource.adobe.com/spectrum-design-data/schemas/types/hex-color.json",
    }),
    "color",
  );
});

test("detectOptionType defaults to string for unknown", (t) => {
  t.is(detectOptionType({}), "string");
  t.is(detectOptionType(null), "string");
  t.is(detectOptionType(undefined), "string");
});

// isValidHexColor tests
test("isValidHexColor validates 6-digit hex colors", (t) => {
  t.true(isValidHexColor("#FFFFFF"));
  t.true(isValidHexColor("#000000"));
  t.true(isValidHexColor("#FF5733"));
  t.true(isValidHexColor("#abcdef"));
  t.true(isValidHexColor("#ABCDEF"));
});

test("isValidHexColor validates 3-digit hex colors", (t) => {
  t.true(isValidHexColor("#FFF"));
  t.true(isValidHexColor("#000"));
  t.true(isValidHexColor("#F57"));
  t.true(isValidHexColor("#abc"));
  t.true(isValidHexColor("#ABC"));
});

test("isValidHexColor rejects invalid hex colors", (t) => {
  t.false(isValidHexColor("FFFFFF")); // Missing #
  t.false(isValidHexColor("#GGGGGG")); // Invalid characters
  t.false(isValidHexColor("#FF")); // Too short
  t.false(isValidHexColor("#FFFFFFF")); // Too long
  t.false(isValidHexColor("white")); // Named color
  t.false(isValidHexColor("rgb(255, 255, 255)")); // RGB format
  t.false(isValidHexColor(""));
  t.false(isValidHexColor(null));
  t.false(isValidHexColor(undefined));
  t.false(isValidHexColor(123));
});

// Helper function tests
test("getValidSizeValues returns all valid sizes", (t) => {
  const sizes = getValidSizeValues();
  t.true(Array.isArray(sizes));
  t.true(sizes.includes("xs"));
  t.true(sizes.includes("s"));
  t.true(sizes.includes("m"));
  t.true(sizes.includes("l"));
  t.true(sizes.includes("xl"));
  t.true(sizes.includes("xxl"));
  t.true(sizes.includes("xxxl"));
  t.is(sizes.length, 7);
});

test("getStateKeywords returns all state keywords", (t) => {
  const keywords = getStateKeywords();
  t.true(Array.isArray(keywords));
  t.true(keywords.includes("hover"));
  t.true(keywords.includes("focus"));
  t.true(keywords.includes("default"));
  t.true(keywords.length > 5);
});
