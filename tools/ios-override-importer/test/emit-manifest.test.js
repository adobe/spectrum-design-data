// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { emitRow, emitManifest } from "../src/emit-manifest.js";

const FAMILIES = new Set(["blue"]);
const decompose = (slug) =>
  slug === "accent-background-color-default"
    ? { property: "accent-background-color", state: ["default"] }
    : null;

test("true-value-change emits uuid-targeted overrides, one per changed mode", (t) => {
  const row = {
    "Token Name": "accent-background-color-default",
    Aliases: "",
    "Old Value":
      "ColorSet(light: Color(1, 1, 1, 1.0), dark: Color(2, 2, 2, 1.0))",
    "New Value":
      "ColorSet(light: Color(9, 9, 9, 1.0), dark: Color(2, 2, 2, 1.0))",
  };
  const legacyKeyIndex = new Map([
    ["accent-background-color-default::light::::", "uuid-light"],
    ["accent-background-color-default::dark::::", "uuid-dark"],
  ]);
  const result = emitRow(row, {
    decompose,
    colorFamilies: FAMILIES,
    legacyKeyIndex,
  });
  t.deepEqual(result.overrides, [
    { target: "uuid-light", value: "rgba(9, 9, 9, 1.0)" },
  ]);
  t.deepEqual(result.extensionTokens, []);
  t.is(result.unresolved, undefined);
});

test("true-value-change reports a mode as unresolved when no matching foundation uuid exists", (t) => {
  const row = {
    "Token Name": "accent-background-color-default",
    Aliases: "",
    "Old Value":
      "ColorSet(light: Color(1, 1, 1, 1.0), dark: Color(2, 2, 2, 1.0))",
    "New Value":
      "ColorSet(light: Color(9, 9, 9, 1.0), dark: Color(2, 2, 2, 1.0))",
  };
  const result = emitRow(row, {
    decompose,
    colorFamilies: FAMILIES,
    legacyKeyIndex: new Map(),
  });
  t.deepEqual(result.overrides, []);
  t.deepEqual(result.unresolved, ["accent-background-color-default (light)"]);
});

test("net-new emits one extension token per parsed mode", (t) => {
  const row = {
    "Token Name": "accent-background-color-default",
    Aliases: "",
    "Old Value": "Custom token",
    "New Value":
      "ColorSet(light: Color(1, 2, 3, 1.0), dark: Color(4, 5, 6, 1.0), elevated: none, lightIncreased: none, darkIncreased: none, elevatedIncreased: none)",
  };
  const result = emitRow(row, { decompose, colorFamilies: FAMILIES });
  t.deepEqual(result.extensionTokens, [
    {
      name: {
        property: "accent-background-color",
        state: ["default"],
        colorScheme: "light",
      },
      $schema:
        "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
      value: "rgba(1, 2, 3, 1.0)",
    },
    {
      name: {
        property: "accent-background-color",
        state: ["default"],
        colorScheme: "dark",
      },
      $schema:
        "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
      value: "rgba(4, 5, 6, 1.0)",
    },
  ]);
});

test("contrast-addition includes contrast:high in the extension token's name", (t) => {
  const row = {
    "Token Name": "accent-background-color-default",
    Aliases: "",
    "Old Value":
      "ColorSet(light: Color(1, 1, 1, 1.0), dark: Color(2, 2, 2, 1.0), elevated: none, lightIncreased: none, darkIncreased: none, elevatedIncreased: none)",
    "New Value":
      "ColorSet(light: Color(1, 1, 1, 1.0), dark: Color(2, 2, 2, 1.0), elevated: none, lightIncreased: Color(3, 3, 3, 1.0), darkIncreased: none, elevatedIncreased: none)",
  };
  const result = emitRow(row, { decompose, colorFamilies: FAMILIES });
  t.deepEqual(result.extensionTokens, [
    {
      name: {
        property: "accent-background-color",
        state: ["default"],
        colorScheme: "light",
        contrast: "high",
      },
      $schema:
        "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
      value: "rgba(3, 3, 3, 1.0)",
    },
  ]);
});

test("out-of-scope rows emit nothing", (t) => {
  const row = {
    "Old Value": "Custom token",
    "New Value": "Measurement(0.43)",
  };
  const result = emitRow(row, { decompose, colorFamilies: FAMILIES });
  t.deepEqual(result, { overrides: [], extensionTokens: [] });
});

test("font-size row resolves via alias to an override on the mobile scale member", (t) => {
  const row = {
    "Token Name": "action-bar-counter-font-size",
    Aliases: "font-size-100",
    "Old Value": "Scale(FontSize(17.0))",
    "New Value": "FontSize(14.0)",
  };
  const legacyKeyIndex = new Map([
    ["font-size-100::::::mobile", "uuid-font-size-100"],
  ]);
  const result = emitRow(row, { legacyKeyIndex });
  t.deepEqual(result, {
    overrides: [{ target: "uuid-font-size-100", value: "14px" }],
    extensionTokens: [],
  });
});

test("font-size row with no resolvable alias reports unresolved", (t) => {
  const row = {
    "Token Name": "alert-dialog-title-font-size",
    Aliases: "",
    "Old Value": "Scale(FontSize(24.0))",
    "New Value": "Scale(FontSize(20.0))",
  };
  const result = emitRow(row, { legacyKeyIndex: new Map() });
  t.deepEqual(result, {
    overrides: [],
    extensionTokens: [],
    unresolved: ["alert-dialog-title-font-size"],
  });
});

test("unresolved rows report candidates instead of a fragment", (t) => {
  const row = {
    "Token Name": "totally-unknown",
    Aliases: "",
    "Old Value": "Custom token",
    "New Value": "ColorSet(light: Color(1, 1, 1, 1.0), dark: none)",
  };
  const result = emitRow(row, {
    decompose: () => null,
    colorFamilies: FAMILIES,
  });
  t.deepEqual(result, {
    overrides: [],
    extensionTokens: [],
    unresolved: ["totally-unknown"],
  });
});

test("emitManifest merges rows and sorts output deterministically", (t) => {
  const rowA = {
    "Token Name": "blue-200",
    Aliases: "",
    "Old Value": "Custom token",
    "New Value": "ColorSet(light: Color(9, 9, 9, 1.0), dark: none)",
  };
  const rowB = {
    "Token Name": "blue-100",
    Aliases: "",
    "Old Value": "Custom token",
    "New Value": "ColorSet(light: Color(1, 1, 1, 1.0), dark: none)",
  };
  const result = emitManifest([rowA, rowB], {
    decompose: () => null,
    colorFamilies: FAMILIES,
  });
  t.deepEqual(
    result.extensionTokens.map((t) => t.name.scaleIndex),
    [100, 200],
  );
  t.deepEqual(result.unresolved, []);
});
