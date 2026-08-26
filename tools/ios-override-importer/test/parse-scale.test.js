// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { isFontSizeValue, parseFontSize } from "../src/parse-scale.js";

test("isFontSizeValue: true for FontSize(N)", (t) => {
  t.true(isFontSizeValue("FontSize(14.0)"));
});

test("isFontSizeValue: true for Scale(FontSize(N))", (t) => {
  t.true(isFontSizeValue("Scale(FontSize(20.0))"));
});

test("isFontSizeValue: false for ColorSet/Measurement/DynamicTypeSizeSet", (t) => {
  t.false(isFontSizeValue("ColorSet(light: Color(1, 1, 1, 1.0), dark: none)"));
  t.false(isFontSizeValue("Measurement(0.43)"));
  t.false(isFontSizeValue("DynamicTypeSizeSet(xSmall: Measurement(0.43))"));
});

test("parseFontSize: FontSize(14.0) -> 14px", (t) => {
  t.is(parseFontSize("FontSize(14.0)"), "14px");
});

test("parseFontSize: Scale(FontSize(20.0)) -> 20px", (t) => {
  t.is(parseFontSize("Scale(FontSize(20.0))"), "20px");
});

test("parseFontSize: keeps real decimals", (t) => {
  t.is(parseFontSize("FontSize(13.5)"), "13.5px");
});

test("parseFontSize: throws on non-FontSize literal", (t) => {
  t.throws(() => parseFontSize("Measurement(0.43)"));
});
