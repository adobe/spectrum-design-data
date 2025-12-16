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
import { regenerateTokenName } from "../src/name-regenerator.js";

test("regenerateTokenName - spacing pattern", async (t) => {
  const nameStructure = {
    category: "spacing",
    property: "spacing",
    spaceBetween: {
      from: "text",
      to: "visual",
    },
    index: "50",
  };

  const result = await regenerateTokenName(nameStructure);
  t.is(result, "text-to-visual-50");
});

test("regenerateTokenName - component property", async (t) => {
  const nameStructure = {
    category: "component-property",
    component: "workflow-icon",
    property: "size",
    index: "50",
  };

  const result = await regenerateTokenName(nameStructure);
  t.is(result, "workflow-icon-size-50");
});

test("regenerateTokenName - generic property", async (t) => {
  const nameStructure = {
    category: "generic-property",
    property: "corner-radius",
    index: "75",
  };

  const result = await regenerateTokenName(nameStructure);
  t.is(result, "corner-radius-75");
});

test("regenerateTokenName - special category returns property", async (t) => {
  const nameStructure = {
    category: "special",
    property: "android-elevation",
  };

  const result = await regenerateTokenName(nameStructure);
  t.is(result, "android-elevation");
});

test("regenerateTokenName - unknown category returns raw", async (t) => {
  const nameStructure = {
    category: "unknown",
    raw: "some-unknown-token",
  };

  const result = await regenerateTokenName(nameStructure);
  t.is(result, "some-unknown-token");
});
