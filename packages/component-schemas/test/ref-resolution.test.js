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
import { getSchemaBySlug, resolveRefs } from "../index.js";

test("resolveRefs should resolve $ref in allOf arrays", (t) => {
  const schema = {
    definitions: {
      baseCard: {
        type: "object",
        properties: {
          size: { type: "string", enum: ["s", "m", "l"] },
          state: { type: "string", enum: ["default", "hover"] },
        },
      },
    },
    oneOf: [
      {
        allOf: [
          { $ref: "#/definitions/baseCard" },
          {
            properties: {
              variant: { const: "test" },
              title: { type: "string" },
            },
          },
        ],
      },
    ],
  };

  const resolved = resolveRefs(schema);

  t.true(Array.isArray(resolved.oneOf));
  t.is(resolved.oneOf.length, 1);

  const variant = resolved.oneOf[0];
  t.truthy(variant.properties);
  t.truthy(variant.properties.size);
  t.truthy(variant.properties.state);
  t.truthy(variant.properties.variant);
  t.truthy(variant.properties.title);

  // Should not have allOf anymore
  t.falsy(variant.allOf);
});

test("resolveRefs should preserve oneOf structure", (t) => {
  const schema = {
    definitions: {
      baseCard: {
        type: "object",
        properties: {
          size: { type: "string" },
        },
      },
    },
    oneOf: [
      {
        allOf: [
          { $ref: "#/definitions/baseCard" },
          { properties: { variant: { const: "test1" } } },
        ],
      },
      {
        allOf: [
          { $ref: "#/definitions/baseCard" },
          { properties: { variant: { const: "test2" } } },
        ],
      },
    ],
  };

  const resolved = resolveRefs(schema);

  t.true(Array.isArray(resolved.oneOf));
  t.is(resolved.oneOf.length, 2);
  t.is(resolved.oneOf[0].properties.variant.const, "test1");
  t.is(resolved.oneOf[1].properties.variant.const, "test2");
});

test("getSchemaBySlug should return resolved refs for cards", async (t) => {
  const cardsSchema = await getSchemaBySlug("cards");

  t.truthy(cardsSchema);
  t.true(Array.isArray(cardsSchema.oneOf));

  // Find horizontal variant
  const horizontalVariant = cardsSchema.oneOf.find(
    (variant) => variant.properties?.variant?.const === "horizontal",
  );

  t.truthy(horizontalVariant);
  t.truthy(horizontalVariant.properties);

  // Should have baseCard properties directly
  t.truthy(horizontalVariant.properties.size);
  t.truthy(horizontalVariant.properties.state);
  t.truthy(horizontalVariant.properties.isSelected);
  t.truthy(horizontalVariant.properties.isQuiet);
  t.truthy(horizontalVariant.properties.isDisabled);
  t.truthy(horizontalVariant.properties.hideCheckbox);
  t.truthy(horizontalVariant.properties.actionLabel);
  t.truthy(horizontalVariant.properties.metadata);

  // Should have variant-specific properties
  t.truthy(horizontalVariant.properties.title);
  t.truthy(horizontalVariant.properties.thumbnail);
  t.truthy(horizontalVariant.properties.details);

  // Should not have allOf anymore
  t.falsy(horizontalVariant.allOf);
});

test("getSchemaBySlug should return resolved refs for gallery cards", async (t) => {
  const cardsSchema = await getSchemaBySlug("cards");

  // Find gallery variant
  const galleryVariant = cardsSchema.oneOf.find(
    (variant) => variant.properties?.variant?.const === "gallery",
  );

  t.truthy(galleryVariant);
  t.truthy(galleryVariant.properties);

  // Should have baseCard properties directly
  t.truthy(galleryVariant.properties.size);
  t.truthy(galleryVariant.properties.state);
  t.truthy(galleryVariant.properties.isSelected);

  // Should have variant-specific properties
  t.truthy(galleryVariant.properties.images);
  t.truthy(Array.isArray(galleryVariant.required));
  t.true(galleryVariant.required.includes("images"));

  // Should not have allOf anymore
  t.falsy(galleryVariant.allOf);
});

test("resolveRefs should handle nested allOf structures", (t) => {
  const schema = {
    definitions: {
      base: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
      },
    },
    allOf: [
      { $ref: "#/definitions/base" },
      {
        properties: {
          name: { type: "string" },
        },
      },
    ],
  };

  const resolved = resolveRefs(schema);

  t.truthy(resolved.properties);
  t.truthy(resolved.properties.id);
  t.truthy(resolved.properties.name);
  t.falsy(resolved.allOf);
});

test("resolveRefs should not mutate original schema", (t) => {
  const originalSchema = {
    definitions: {
      base: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
      },
    },
    allOf: [
      { $ref: "#/definitions/base" },
      { properties: { name: { type: "string" } } },
    ],
  };

  const resolved = resolveRefs(originalSchema);

  // Original should still have allOf
  t.truthy(originalSchema.allOf);
  t.is(originalSchema.allOf.length, 2);

  // Resolved should not have allOf
  t.falsy(resolved.allOf);
});
