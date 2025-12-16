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
import { parseTokenName } from "../src/parser.js";

test("parseTokenName - spacing pattern (text-to-visual-50)", (t) => {
  const tokenData = {
    uuid: "abc-123",
    value: "8px",
    $schema: "https://test.com/schema.json",
  };

  const result = parseTokenName("text-to-visual-50", tokenData);

  t.is(result.id, "abc-123");
  t.is(result.name.original, "text-to-visual-50");
  t.is(result.name.structure.category, "spacing");
  t.is(result.name.structure.property, "spacing");
  t.is(result.name.structure.spaceBetween.from, "text");
  t.is(result.name.structure.spaceBetween.to, "visual");
  t.is(result.name.structure.index, "50");
  t.is(result.name.semanticComplexity, 2);
});

test("parseTokenName - component property (workflow-icon-size-50)", (t) => {
  const tokenData = {
    uuid: "def-456",
    value: "14px",
    $schema: "https://test.com/schema.json",
  };

  const result = parseTokenName("workflow-icon-size-50", tokenData);

  t.is(result.id, "def-456");
  t.is(result.name.original, "workflow-icon-size-50");
  t.is(result.name.structure.category, "component-property");
  t.is(result.name.structure.component, "workflow-icon");
  t.is(result.name.structure.property, "size");
  t.is(result.name.structure.index, "50");
  t.is(result.name.semanticComplexity, 2);
});

test("parseTokenName - generic property (spacing-100)", (t) => {
  const tokenData = {
    uuid: "ghi-789",
    value: "8px",
    $schema: "https://test.com/schema.json",
  };

  const result = parseTokenName("spacing-100", tokenData);

  t.is(result.id, "ghi-789");
  t.is(result.name.original, "spacing-100");
  t.is(result.name.structure.category, "generic-property");
  t.is(result.name.structure.property, "spacing");
  t.is(result.name.structure.index, "100");
  t.is(result.name.semanticComplexity, 1);
});

test("parseTokenName - compound generic property (corner-radius-75)", (t) => {
  const tokenData = {
    uuid: "jkl-012",
    value: "3px",
    $schema: "https://test.com/schema.json",
  };

  const result = parseTokenName("corner-radius-75", tokenData);

  t.is(result.id, "jkl-012");
  t.is(result.name.original, "corner-radius-75");
  t.is(result.name.structure.category, "generic-property");
  t.is(result.name.structure.property, "corner-radius");
  t.is(result.name.structure.index, "75");
  t.is(result.name.semanticComplexity, 1);
});

test("parseTokenName - special case (android-elevation)", (t) => {
  const tokenData = {
    uuid: "mno-345",
    value: "2dp",
    $schema: "https://test.com/schema.json",
  };

  const result = parseTokenName("android-elevation", tokenData);

  t.is(result.id, "mno-345");
  t.is(result.name.original, "android-elevation");
  t.is(result.name.structure.category, "special");
  t.is(result.name.structure.property, "android-elevation");
  t.is(result.name.semanticComplexity, 1);
});
