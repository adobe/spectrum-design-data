/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 **************************************************************************/

import test from "ava";
import { validateComponentJSON, validateJSONString } from "./jsonValidator.js";

// Valid component data tests
test("validateComponentJSON - should validate minimal valid component", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [],
  };
  const result = validateComponentJSON(data);
  t.true(result.valid);
  t.is(result.errors.length, 0);
});

test("validateComponentJSON - should validate component with string option", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [
      {
        title: "label",
        type: "string",
        required: false,
      },
    ],
  };
  const result = validateComponentJSON(data);
  t.true(result.valid);
  t.is(result.errors.length, 0);
});

test("validateComponentJSON - should validate component with boolean option", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [
      {
        title: "isDisabled",
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    ],
  };
  const result = validateComponentJSON(data);
  t.true(result.valid);
  t.is(result.errors.length, 0);
});

test("validateComponentJSON - should validate component with size option", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [
      {
        title: "size",
        type: "size",
        required: false,
        defaultValue: "m",
        items: ["s", "m", "l", "xl"],
      },
    ],
  };
  const result = validateComponentJSON(data);
  t.true(result.valid);
  t.is(result.errors.length, 0);
});

test("validateComponentJSON - should validate component with localEnum option", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [
      {
        title: "variant",
        type: "localEnum",
        required: false,
        items: ["primary", "secondary", "negative"],
      },
    ],
  };
  const result = validateComponentJSON(data);
  t.true(result.valid);
  t.is(result.errors.length, 0);
});

test("validateComponentJSON - should validate component with systemEnum option", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [
      {
        title: "icon",
        type: "systemEnum",
        required: false,
        items: ["Add", "Edit", "Delete"],
      },
    ],
  };
  const result = validateComponentJSON(data);
  t.true(result.valid);
  t.is(result.errors.length, 0);
});

test("validateComponentJSON - should validate component with icon option", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [
      {
        title: "icon",
        type: "icon",
        required: false,
        defaultValue: "Add",
      },
    ],
  };
  const result = validateComponentJSON(data);
  t.true(result.valid);
  t.is(result.errors.length, 0);
});

test("validateComponentJSON - should validate component with color option", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [
      {
        title: "backgroundColor",
        type: "color",
        required: false,
        defaultValue: "#FF0000",
      },
    ],
  };
  const result = validateComponentJSON(data);
  t.true(result.valid);
  t.is(result.errors.length, 0);
});

test("validateComponentJSON - should validate component with state option", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [
      {
        title: "state",
        type: "state",
        required: false,
        defaultValue: "default",
        items: ["default", "hover", "focus", "active"],
      },
    ],
  };
  const result = validateComponentJSON(data);
  t.true(result.valid);
  t.is(result.errors.length, 0);
});

test("validateComponentJSON - should validate component with description fields", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [
      {
        title: "label",
        type: "string",
        required: false,
        description: "The button label text",
      },
    ],
  };
  const result = validateComponentJSON(data);
  t.true(result.valid);
  t.is(result.errors.length, 0);
});

// Invalid component data - Missing required fields
test("validateComponentJSON - should fail when title is missing", (t) => {
  const data = {
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [],
  };
  const result = validateComponentJSON(data);
  t.false(result.valid);
  t.true(result.errors.length > 0);
  t.true(result.errors.some((e) => e.message.includes("title")));
});

test("validateComponentJSON - should fail when meta is missing", (t) => {
  const data = {
    title: "Button",
    options: [],
  };
  const result = validateComponentJSON(data);
  t.false(result.valid);
  t.true(result.errors.length > 0);
  t.true(result.errors.some((e) => e.message.includes("meta")));
});

test("validateComponentJSON - should allow component without options array", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
  };
  const result = validateComponentJSON(data);
  t.true(result.valid);
  t.is(result.errors.length, 0);
});

test("validateComponentJSON - should fail when category is missing", (t) => {
  const data = {
    title: "Button",
    meta: {
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [],
  };
  const result = validateComponentJSON(data);
  t.false(result.valid);
  t.true(result.errors.length > 0);
});

test("validateComponentJSON - should fail when documentationUrl is missing", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
    },
    options: [],
  };
  const result = validateComponentJSON(data);
  t.false(result.valid);
  t.true(result.errors.length > 0);
});

// Invalid component data - Invalid metadata
test("validateComponentJSON - should fail with invalid category", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "invalid-category",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [],
  };
  const result = validateComponentJSON(data);
  t.false(result.valid);
  t.true(result.errors.length > 0);
});

test("validateComponentJSON - should fail with invalid URL format", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "not-a-valid-url",
    },
    options: [],
  };
  const result = validateComponentJSON(data);
  t.false(result.valid);
  t.true(result.errors.length > 0);
});

test("validateComponentJSON - should allow any https URL", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://example.com/button/",
    },
    options: [],
  };
  const result = validateComponentJSON(data);
  t.true(result.valid);
  t.is(result.errors.length, 0);
});

// Invalid option configurations
test("validateComponentJSON - should fail when option is missing title", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [
      {
        type: "string",
        required: false,
      },
    ],
  };
  const result = validateComponentJSON(data);
  t.false(result.valid);
  t.true(result.errors.length > 0);
});

test("validateComponentJSON - should fail when option is missing type", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [
      {
        title: "label",
        required: false,
      },
    ],
  };
  const result = validateComponentJSON(data);
  t.false(result.valid);
  t.true(result.errors.length > 0);
});

test("validateComponentJSON - should allow option without required field", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [
      {
        title: "label",
        type: "string",
      },
    ],
  };
  const result = validateComponentJSON(data);
  t.true(result.valid);
  t.is(result.errors.length, 0);
});

// Edge cases
test("validateComponentJSON - should fail with null data", (t) => {
  const result = validateComponentJSON(null);
  t.false(result.valid);
  t.is(result.errors.length, 1);
  t.true(result.errors[0].message.includes("null or undefined"));
});

test("validateComponentJSON - should fail with undefined data", (t) => {
  const result = validateComponentJSON(undefined);
  t.false(result.valid);
  t.is(result.errors.length, 1);
  t.true(result.errors[0].message.includes("null or undefined"));
});

test("validateComponentJSON - should validate component with empty options array", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [],
  };
  const result = validateComponentJSON(data);
  t.true(result.valid);
  t.is(result.errors.length, 0);
});

test("validateComponentJSON - should validate component with many options", (t) => {
  const options = Array.from({ length: 50 }, (_, i) => ({
    title: `option${i}`,
    type: "string",
    required: false,
  }));
  const data = {
    title: "ComplexComponent",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/complex/",
    },
    options,
  };
  const result = validateComponentJSON(data);
  t.true(result.valid);
  t.is(result.errors.length, 0);
});

// Error formatting
test("validateComponentJSON - should format path correctly", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
    },
    options: [],
  };
  const result = validateComponentJSON(data);
  t.false(result.valid);
  t.true(result.errors.length > 0);
  result.errors.forEach((error) => {
    t.false(error.path.includes("/"));
  });
});

test("validateComponentJSON - should include keyword in errors", (t) => {
  const data = {
    title: "Button",
    meta: {
      category: "actions",
    },
    options: [],
  };
  const result = validateComponentJSON(data);
  t.false(result.valid);
  result.errors.forEach((error) => {
    t.truthy(error.keyword);
    t.is(typeof error.keyword, "string");
  });
});

// validateJSONString tests
test("validateJSONString - should parse and validate valid JSON string", (t) => {
  const jsonString = JSON.stringify({
    title: "Button",
    meta: {
      category: "actions",
      documentationUrl: "https://spectrum.adobe.com/page/button/",
    },
    options: [],
  });
  const result = validateJSONString(jsonString);
  t.true(result.valid);
  t.is(result.errors.length, 0);
  t.truthy(result.data);
  t.is(result.data?.title, "Button");
});

test("validateJSONString - should fail with invalid JSON string", (t) => {
  const jsonString = "{invalid json}";
  const result = validateJSONString(jsonString);
  t.false(result.valid);
  t.is(result.errors.length, 1);
  t.is(result.errors[0].keyword, "parse");
  t.true(result.errors[0].message.includes("JSON parse error"));
});

test("validateJSONString - should fail with valid JSON but invalid schema", (t) => {
  const jsonString = JSON.stringify({
    title: "Button",
  });
  const result = validateJSONString(jsonString);
  t.false(result.valid);
  t.true(result.errors.length > 0);
});

test("validateJSONString - should handle empty string", (t) => {
  const result = validateJSONString("");
  t.false(result.valid);
  t.is(result.errors.length, 1);
  t.is(result.errors[0].keyword, "parse");
});
