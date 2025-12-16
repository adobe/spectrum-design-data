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

test("semanticComplexity - generic property", (t) => {
  const result = parseTokenName("corner-radius-100", {
    uuid: "test-1",
    value: "4px",
    $schema:
      "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json",
  });

  t.is(result.name.semanticComplexity, 1);
  t.is(result.name.structure.property, "corner-radius");
  t.is(result.name.structure.category, "generic-property");
});

test("semanticComplexity - spacing", (t) => {
  const result = parseTokenName("text-to-visual-50", {
    uuid: "test-2",
    value: "5px",
    $schema:
      "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json",
  });

  t.is(result.name.semanticComplexity, 2);
  t.is(result.name.structure.property, "spacing");
  t.is(result.name.structure.category, "spacing");
  t.truthy(result.name.structure.spaceBetween);
});

test("semanticComplexity - component property", (t) => {
  const result = parseTokenName("workflow-icon-size-50", {
    uuid: "test-3",
    value: "14px",
    $schema:
      "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json",
  });

  t.is(result.name.semanticComplexity, 2);
  t.is(result.name.structure.component, "workflow-icon");
  t.is(result.name.structure.property, "size");
  t.is(result.name.structure.category, "component-property");
});

test("semanticComplexity - semantic alias", (t) => {
  const result = parseTokenName("drop-shadow-x", {
    uuid: "test-4",
    value: "{drop-shadow-x-100}",
    $schema:
      "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/alias.json",
  });

  t.is(result.name.semanticComplexity, 2);
  t.is(result.name.structure.property, "drop-shadow-x");
  t.is(result.name.structure.referencedToken, "drop-shadow-x-100");
  t.is(result.name.structure.category, "semantic-alias");
});

test("semanticComplexity - compound generic property", (t) => {
  const result = parseTokenName("corner-radius-75", {
    uuid: "test-5",
    value: "3px",
    $schema:
      "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json",
  });

  t.is(result.name.semanticComplexity, 1);
  t.is(result.name.structure.property, "corner-radius");
  t.is(result.name.structure.category, "generic-property");
});

test("semanticComplexity - special token without complexity", (t) => {
  const result = parseTokenName("android-elevation", {
    uuid: "test-6",
    value: "2dp",
    $schema:
      "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json",
  });

  t.is(result.name.semanticComplexity, 1);
  t.is(result.name.structure.property, "android-elevation");
  t.is(result.name.structure.category, "special");
});

test("semanticComplexity - special token (unknown pattern)", (t) => {
  const result = parseTokenName("some-unknown-pattern-xyz", {
    uuid: "test-7",
    value: "10px",
    $schema:
      "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json",
  });

  // Tokens without numeric index are classified as "special" and have complexity 1 (property field)
  t.is(result.name.semanticComplexity, 1);
  t.is(result.name.structure.category, "special");
  t.is(result.name.structure.property, "some-unknown-pattern-xyz");
});
