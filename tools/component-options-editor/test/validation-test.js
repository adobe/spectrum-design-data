/**
 * Validation Test Script
 *
 * Run this in Node.js to test the validation logic:
 * node test/validation-test.js
 */

const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const fs = require("fs");
const path = require("path");

// Load schema
const schemaPath = path.resolve(__dirname, "../component-options.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

console.log("🧪 Validation Test\n");
console.log("Schema loaded:", schema.title);
console.log("");

// Initialize Ajv
const ajv = new Ajv2020({
  allErrors: true,
  verbose: true,
  strict: false,
});
addFormats(ajv);

const validate = ajv.compile(schema);

// Test cases
const testCases = [
  {
    name: "Valid Tree View Data",
    data: {
      title: "Tree view",
      meta: {
        category: "navigation",
        documentationUrl: "https://spectrum.adobe.com/page/tree-view/",
      },
      options: [
        {
          title: "size",
          type: "size",
          defaultValue: "l",
          required: false,
          items: ["s", "m", "l", "xl"],
        },
        {
          title: "state",
          type: "state",
          defaultValue: "default",
          required: false,
          items: ["default", "hover", "down", "keyboard focus"],
        },
      ],
    },
    shouldBeValid: true,
  },
  {
    name: "Invalid Category",
    data: {
      title: "Test",
      meta: {
        category: "test",
        documentationUrl: "https://spectrum.adobe.com/page/test/",
      },
      options: [],
    },
    shouldBeValid: false,
  },
  {
    name: "Invalid State Items (old restrictive schema)",
    data: {
      title: "Test",
      meta: {
        category: "navigation",
        documentationUrl: "https://spectrum.adobe.com/page/test/",
      },
      options: [
        {
          title: "state",
          type: "state",
          defaultValue: "default",
          items: ["default", "hover", "down"],
        },
      ],
    },
    shouldBeValid: true, // Should be valid now that we allow custom strings
  },
];

// Run tests
let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log(`${"=".repeat(60)}`);

  const valid = validate(test.data);
  const passedTest = valid === test.shouldBeValid;

  if (passedTest) {
    passed++;
    console.log(
      `✅ PASS - Expected ${test.shouldBeValid ? "valid" : "invalid"}, got ${valid ? "valid" : "invalid"}`,
    );
  } else {
    failed++;
    console.log(
      `❌ FAIL - Expected ${test.shouldBeValid ? "valid" : "invalid"}, got ${valid ? "valid" : "invalid"}`,
    );
  }

  if (!valid && validate.errors) {
    console.log("\nValidation Errors:");
    validate.errors.forEach((error) => {
      console.log(`  - ${error.instancePath || "root"}: ${error.message}`);
    });
  }
});

console.log(`\n${"=".repeat(60)}`);
console.log("Summary");
console.log(`${"=".repeat(60)}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Total: ${testCases.length}`);

process.exit(failed > 0 ? 1 : 0);
