/*
Copyright 2024 Adobe. All rights reserved.
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
  buildRecommendedProps,
  validateComponentConfig,
  validatePropsWithImprovements,
} from "../../src/utils/component-helpers.js";

test("buildRecommendedProps returns defaults from schema", (t) => {
  const schema = {
    properties: {
      size: { type: "string", default: "m" },
      variant: { type: "string", enum: ["accent", "primary"] },
    },
  };
  const { recommendedProps, schemaProperties } = buildRecommendedProps(schema);
  t.is(recommendedProps.size, "m");
  t.truthy(schemaProperties.size);
});

test("buildRecommendedProps applies variant when valid enum", (t) => {
  const schema = {
    properties: {
      variant: {
        type: "string",
        enum: ["accent", "primary"],
        default: "primary",
      },
    },
  };
  const { recommendedProps } = buildRecommendedProps(schema, "accent");
  t.is(recommendedProps.variant, "accent");
});

test("buildRecommendedProps ignores variant when not in enum", (t) => {
  const schema = {
    properties: {
      variant: {
        type: "string",
        enum: ["accent", "primary"],
        default: "primary",
      },
    },
  };
  const { recommendedProps } = buildRecommendedProps(schema, "invalid");
  t.is(recommendedProps.variant, "primary");
});

test("validateComponentConfig reports missing required", (t) => {
  const schema = { required: ["size"] };
  const result = validateComponentConfig({}, schema);
  t.false(result.valid);
  t.true(result.errors.some((e) => e.includes("size")));
});

test("validateComponentConfig valid when required present", (t) => {
  const schema = { required: ["size"] };
  const result = validateComponentConfig({ size: "m" }, schema);
  t.true(result.valid);
});

test("validatePropsWithImprovements returns improvements for missing required", (t) => {
  const schema = {
    required: ["size"],
    properties: { size: { type: "string", default: "m" } },
  };
  const result = validatePropsWithImprovements({}, schema);
  t.false(result.valid);
  t.is(result.improvements.length, 1);
  t.is(result.improvements[0].type, "missing_required");
});

test("validatePropsWithImprovements returns improvements for unknown property", (t) => {
  const schema = { properties: {} };
  const result = validatePropsWithImprovements({ unknown: 1 }, schema);
  t.true(result.warnings.some((w) => w.includes("Unknown")));
  t.true(result.improvements.some((i) => i.type === "unknown_property"));
});

test("validatePropsWithImprovements returns improvements for type mismatch", (t) => {
  const schema = { properties: { size: { type: "string" } } };
  const result = validatePropsWithImprovements({ size: 123 }, schema);
  t.false(result.valid);
  t.true(result.improvements.some((i) => i.type === "type_mismatch"));
});

test("validatePropsWithImprovements returns improvements for invalid enum", (t) => {
  const schema = {
    properties: { variant: { type: "string", enum: ["a", "b"] } },
  };
  const result = validatePropsWithImprovements({ variant: "c" }, schema);
  t.true(result.improvements.some((i) => i.type === "invalid_enum"));
});
