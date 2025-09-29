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
import { getSchemaBySlug } from "../index.js";
import { createAjvInstance } from "./utils/test-helpers.js";

// Setup Ajv instance and compiled validator once for all tests
let ajv;
let validateCards;

test.before(async () => {
  ajv = await createAjvInstance();
  const cardsSchema = await getSchemaBySlug("cards");
  validateCards = ajv.compile(cardsSchema);
});

test("cards schema should be valid", async (t) => {
  const cardsSchema = await getSchemaBySlug("cards");
  const result = ajv.validateSchema(cardsSchema);

  t.true(
    result,
    `Cards schema validation failed: ${JSON.stringify(ajv.errors, null, 2)}`,
  );
});

test("all card variants should inherit baseCard properties", async (t) => {
  const cardsSchema = await getSchemaBySlug("cards");
  const baseCardProperties = Object.keys(
    cardsSchema.definitions.baseCard.properties,
  );

  // Expected baseCard properties
  const expectedProperties = [
    "size",
    "state",
    "isSelected",
    "isQuiet",
    "isDisabled",
    "hideCheckbox",
    "actionLabel",
    "metadata",
  ];

  t.deepEqual(
    baseCardProperties.sort(),
    expectedProperties.sort(),
    "baseCard should contain all expected properties",
  );
});

test("gallery variant should include baseCard reference", async (t) => {
  const cardsSchema = await getSchemaBySlug("cards");
  const galleryVariant = cardsSchema.oneOf.find(
    (variant) =>
      variant.allOf &&
      variant.allOf.some(
        (item) =>
          item.properties &&
          item.properties.variant &&
          item.properties.variant.const === "gallery",
      ),
  );

  t.truthy(galleryVariant, "Gallery variant should exist");
  t.true(
    Array.isArray(galleryVariant.allOf),
    "Gallery variant should use allOf structure",
  );

  const hasBaseCardRef = galleryVariant.allOf.some(
    (item) => item["$ref"] === "#/definitions/baseCard",
  );

  t.true(hasBaseCardRef, "Gallery variant should reference baseCard");
});

test("all card variants should have consistent structure", async (t) => {
  const cardsSchema = await getSchemaBySlug("cards");
  const variants = cardsSchema.oneOf;

  // All variants should either:
  // 1. Use allOf with baseCard reference, OR
  // 2. Be the gallery variant (which now uses allOf)
  for (const variant of variants) {
    if (variant.allOf) {
      const hasBaseCardRef = variant.allOf.some(
        (item) => item["$ref"] === "#/definitions/baseCard",
      );
      t.true(
        hasBaseCardRef,
        `Variant should reference baseCard: ${JSON.stringify(variant)}`,
      );
    } else {
      // This should only be the old gallery variant structure, which we've fixed
      t.fail(`Variant should use allOf structure: ${JSON.stringify(variant)}`);
    }
  }
});

test("gallery variant should accept baseCard properties", async (t) => {
  // Test that gallery variant accepts baseCard properties
  const galleryCardWithStates = {
    variant: "gallery",
    images: ["image1.jpg", "image2.jpg"],
    state: "hover",
    isSelected: true,
    isQuiet: false,
    isDisabled: false,
    size: "m",
  };

  const valid = validateCards(galleryCardWithStates);
  t.true(
    valid,
    `Gallery card with states should be valid: ${JSON.stringify(validateCards.errors, null, 2)}`,
  );
});

test("gallery variant should reject invalid baseCard properties", async (t) => {
  // Test that gallery variant rejects invalid state values
  const galleryCardWithInvalidState = {
    variant: "gallery",
    images: ["image1.jpg"],
    state: "invalid-state", // This should be invalid
  };

  const valid = validateCards(galleryCardWithInvalidState);
  t.false(valid, "Gallery card with invalid state should be rejected");
});

test("gallery variant should require images property", async (t) => {
  // Test that gallery variant still requires images
  const galleryCardWithoutImages = {
    variant: "gallery",
    state: "hover",
    // Missing required images property
  };

  const valid = validateCards(galleryCardWithoutImages);
  t.false(valid, "Gallery card without images should be rejected");
});

test("all card variants should support same state properties", async (t) => {
  const baseCardProperties = {
    state: "hover",
    isSelected: true,
    isQuiet: false,
    isDisabled: false,
    size: "l",
    hideCheckbox: true,
    actionLabel: "Custom Action",
    metadata: "Additional info",
  };

  // Test each variant with baseCard properties
  const variants = [
    "asset",
    "collection",
    "flex",
    "gallery",
    "horizontal",
    "product",
  ];

  for (const variant of variants) {
    const testCard = {
      variant,
      ...baseCardProperties,
      // Add variant-specific required properties
      ...(variant === "asset" && { image: "test.jpg" }),
      ...(variant === "collection" && { collectionName: "Test Collection" }),
      ...(variant === "gallery" && { images: ["test1.jpg", "test2.jpg"] }),
      ...(variant === "product" && {
        productName: "Test Product",
        price: "$10.00",
        thumbnail: "product.jpg",
      }),
    };

    const valid = validateCards(testCard);
    t.true(
      valid,
      `${variant} variant should accept baseCard properties: ${JSON.stringify(validateCards.errors, null, 2)}`,
    );
  }
});

test("card variants should maintain their specific requirements", async (t) => {
  // Test that each variant still enforces its specific requirements
  const testCases = [
    {
      variant: "asset",
      shouldPass: { variant: "asset", image: "test.jpg" },
      shouldFail: { variant: "asset" }, // Missing required image
    },
    {
      variant: "collection",
      shouldPass: { variant: "collection", collectionName: "Test" },
      shouldFail: { variant: "collection" }, // Missing required collectionName
    },
    {
      variant: "gallery",
      shouldPass: { variant: "gallery", images: ["test.jpg"] },
      shouldFail: { variant: "gallery" }, // Missing required images
    },
    {
      variant: "product",
      shouldPass: {
        variant: "product",
        productName: "Test",
        price: "$10",
        thumbnail: "test.jpg",
      },
      shouldFail: { variant: "product", productName: "Test" }, // Missing required price and thumbnail
    },
  ];

  for (const testCase of testCases) {
    const validPass = validateCards(testCase.shouldPass);
    t.true(
      validPass,
      `${testCase.variant} should accept valid data: ${JSON.stringify(validateCards.errors, null, 2)}`,
    );

    const validFail = validateCards(testCase.shouldFail);
    t.false(validFail, `${testCase.variant} should reject invalid data`);
  }
});
