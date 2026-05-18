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
  fontWeightNameForKey,
  transformFile,
} from "../src/transform.js";

const COLOR_SCHEMA = "https://example.com/schemas/token-types/color.json";
const COLOR_SET_SCHEMA =
  "https://example.com/schemas/token-types/color-set.json";
const FONT_WEIGHT_SCHEMA =
  "https://example.com/schemas/token-types/font-weight.json";
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
