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
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { HandlebarsFormatter } from "../src/lib/formatterHandlebars.js";
import Handlebars from "handlebars";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test data for token diff results
const mockTokenDiffResult = {
  renamed: {
    "old-token-name": {
      "old-name": "old-token-name",
      "new-name": "new-token-name",
    },
  },
  deprecated: {
    "deprecated-token": {
      deprecated_comment: "This token is deprecated",
    },
  },
  reverted: {
    "reverted-token": {},
  },
  added: {
    "new-token": {
      $schema:
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/color.json",
      value: "#ff0000",
    },
  },
  deleted: {
    "deleted-token": {},
  },
  updated: {
    added: {
      "token-with-added-property": {
        path: "sets.light.value",
        "new-value": "#ffffff",
      },
    },
    deleted: {
      "token-with-deleted-property": {
        path: "sets.dark.value",
        "original-value": "#000000",
      },
    },
    updated: {
      "token-with-updated-property": {
        path: "sets.light.value",
        "original-value": "#ff0000",
        "new-value": "#00ff00",
      },
    },
    renamed: {
      "token-with-renamed-property": {
        sets: {
          light: {
            path: "sets.light.value",
            "original-value": "#ff0000",
            "new-value": "#00ff00",
          },
        },
      },
    },
  },
};

const mockOptions = {
  oldTokenBranch: "main",
  newTokenBranch: "feature",
  oldTokenVersion: "1.0.0",
  newTokenVersion: "1.1.0",
};

// Helper to create a temporary template file
const createTempTemplate = (content) => {
  const tempPath = path.join(__dirname, "temp-template.hbs");
  fs.writeFileSync(tempPath, content);
  return tempPath;
};

// Clean up temporary files
const cleanupTempFiles = () => {
  const tempPath = path.join(__dirname, "temp-template.hbs");
  if (fs.existsSync(tempPath)) {
    fs.unlinkSync(tempPath);
  }
};

test.afterEach(() => {
  cleanupTempFiles();
});

test("HandlebarsFormatter constructor - default options", (t) => {
  const formatter = new HandlebarsFormatter();

  t.truthy(formatter.templateDir);
  t.is(formatter.template, "markdown");
  t.is(formatter.compiledTemplate, null);
});

test("HandlebarsFormatter constructor - custom options", (t) => {
  const customOptions = {
    templateDir: "/custom/path",
    template: "custom",
  };

  const formatter = new HandlebarsFormatter(customOptions);

  t.is(formatter.templateDir, "/custom/path");
  t.is(formatter.template, "custom");
});

test("HandlebarsFormatter registerHelpers - registers all helpers", (t) => {
  const formatter = new HandlebarsFormatter();

  // Test that helpers are registered
  t.truthy(Handlebars.helpers.repeat);
  t.truthy(Handlebars.helpers.hasKeys);
  t.truthy(Handlebars.helpers.objectKeys);
  t.truthy(Handlebars.helpers.objectValues);
  t.truthy(Handlebars.helpers.objectEntries);
  t.truthy(Handlebars.helpers.ifEquals);
  t.truthy(Handlebars.helpers.cleanSchemaUrl);
  t.truthy(Handlebars.helpers.cleanPath);
  t.truthy(Handlebars.helpers.lastPathPart);
  t.truthy(Handlebars.helpers.formatDate);
  t.truthy(Handlebars.helpers.totalTokens);
  t.truthy(Handlebars.helpers.totalUpdatedTokens);
});

test("HandlebarsFormatter helper - repeat", (t) => {
  const formatter = new HandlebarsFormatter();
  const result = Handlebars.helpers.repeat("abc", 3);

  t.is(result.toString(), "abcabcabc");
});

test("HandlebarsFormatter helper - hasKeys", (t) => {
  const formatter = new HandlebarsFormatter();

  t.true(Handlebars.helpers.hasKeys({ a: 1, b: 2 }));
  t.false(Handlebars.helpers.hasKeys({}));
});

test("HandlebarsFormatter helper - objectKeys", (t) => {
  const formatter = new HandlebarsFormatter();
  const result = Handlebars.helpers.objectKeys({ a: 1, b: 2 });

  t.deepEqual(result, ["a", "b"]);
});

test("HandlebarsFormatter helper - objectValues", (t) => {
  const formatter = new HandlebarsFormatter();
  const result = Handlebars.helpers.objectValues({ a: 1, b: 2 });

  t.deepEqual(result, [1, 2]);
});

test("HandlebarsFormatter helper - objectEntries", (t) => {
  const formatter = new HandlebarsFormatter();
  const result = Handlebars.helpers.objectEntries({ a: 1, b: 2 });

  t.deepEqual(result, [
    { key: "a", value: 1 },
    { key: "b", value: 2 },
  ]);
});

test("HandlebarsFormatter helper - ifEquals", (t) => {
  const formatter = new HandlebarsFormatter();

  // Test the helper by compiling and executing a template
  const templateSource =
    "{{#ifEquals arg1 arg2}}equal{{else}}not equal{{/ifEquals}}";
  const template = Handlebars.compile(templateSource);

  t.is(template({ arg1: "a", arg2: "a" }), "equal");
  t.is(template({ arg1: "a", arg2: "b" }), "not equal");
  t.is(template({ arg1: 1, arg2: "1" }), "equal"); // loose equality
});

test("HandlebarsFormatter helper - cleanSchemaUrl", (t) => {
  const formatter = new HandlebarsFormatter();
  const url =
    "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/color.json";
  const result = Handlebars.helpers.cleanSchemaUrl(url);

  t.is(result, "color.json");
});

test("HandlebarsFormatter helper - cleanPath", (t) => {
  const formatter = new HandlebarsFormatter();
  const result = Handlebars.helpers.cleanPath("sets.light.value$");

  t.is(result, "light.value");
});

test("HandlebarsFormatter helper - lastPathPart", (t) => {
  const formatter = new HandlebarsFormatter();
  const result = Handlebars.helpers.lastPathPart("path/to/file.json");

  t.is(result, "file.json");
});

test("HandlebarsFormatter helper - formatDate", (t) => {
  const formatter = new HandlebarsFormatter();
  const date = new Date("2023-01-01T00:00:00.000Z");
  const result = Handlebars.helpers.formatDate(date);

  t.truthy(result);
  t.true(typeof result === "string");
});

test("HandlebarsFormatter helper - totalTokens", (t) => {
  const formatter = new HandlebarsFormatter();
  const result = Handlebars.helpers.totalTokens(mockTokenDiffResult);

  // 1 renamed + 1 deprecated + 1 reverted + 1 added + 1 deleted + 1 updated.added + 1 updated.deleted + 1 updated.updated + 1 updated.renamed
  t.is(result, 9);
});

test("HandlebarsFormatter helper - totalUpdatedTokens", (t) => {
  const formatter = new HandlebarsFormatter();
  const result = Handlebars.helpers.totalUpdatedTokens(
    mockTokenDiffResult.updated,
  );

  // 1 added + 1 deleted + 1 updated + 1 renamed
  t.is(result, 4);
});

test("HandlebarsFormatter loadTemplate - loads existing template", (t) => {
  const formatter = new HandlebarsFormatter();
  const template = formatter.loadTemplate("markdown");

  t.is(typeof template, "function");
});

test("HandlebarsFormatter loadTemplate - throws error for non-existent template", (t) => {
  const formatter = new HandlebarsFormatter();

  t.throws(
    () => {
      formatter.loadTemplate("non-existent");
    },
    { message: /Template not found/ },
  );
});

test("HandlebarsFormatter getTemplate - loads and caches template", (t) => {
  const formatter = new HandlebarsFormatter();
  const template1 = formatter.getTemplate();
  const template2 = formatter.getTemplate();

  t.is(typeof template1, "function");
  t.is(template1, template2); // Should be cached
});

test("HandlebarsFormatter setTemplateString - sets custom template", (t) => {
  const formatter = new HandlebarsFormatter();
  const templateString = "Hello {{name}}!";

  formatter.setTemplateString(templateString);

  t.is(typeof formatter.compiledTemplate, "function");
  t.is(formatter.compiledTemplate({ name: "World" }), "Hello World!");
});

test("HandlebarsFormatter processNestedChanges - processes simple change", (t) => {
  const formatter = new HandlebarsFormatter();
  const tokenData = {
    path: "sets.light.value",
    "original-value": "#ff0000",
    "new-value": "#00ff00",
  };

  const result = formatter.processNestedChanges(tokenData);

  t.is(result.length, 1);
  t.is(result[0].path, "sets.light.value");
  t.is(result[0].originalValue, "#ff0000");
  t.is(result[0].newValue, "#00ff00");
  t.is(result[0].type, "updated");
});

test("HandlebarsFormatter processNestedChanges - processes nested changes", (t) => {
  const formatter = new HandlebarsFormatter();
  const tokenData = {
    sets: {
      light: {
        path: "sets.light.value",
        "original-value": "#ff0000",
        "new-value": "#00ff00",
      },
      dark: {
        path: "sets.dark.value",
        "new-value": "#000000",
      },
    },
  };

  const result = formatter.processNestedChanges(tokenData);

  t.is(result.length, 2);
  t.is(result[0].path, "sets.light.value");
  t.is(result[0].type, "updated");
  t.is(result[1].path, "sets.dark.value");
  t.is(result[1].type, "added");
});

test("HandlebarsFormatter processNestedChanges - processes schema change", (t) => {
  const formatter = new HandlebarsFormatter();
  const tokenData = {
    path: "sets.light.$schema",
    "original-value": "old-schema.json",
    "new-value": "new-schema.json",
  };

  const result = formatter.processNestedChanges(tokenData);

  t.is(result.length, 1);
  t.is(result[0].type, "schema");
});

test("HandlebarsFormatter prepareTemplateData - transforms data correctly", (t) => {
  const formatter = new HandlebarsFormatter();
  const templateData = formatter.prepareTemplateData(
    mockTokenDiffResult,
    mockOptions,
  );

  t.truthy(templateData.timestamp);
  t.is(templateData.result, mockTokenDiffResult);
  t.is(templateData.options, mockOptions);

  // Check transformed arrays
  t.is(templateData.renamed.length, 1);
  t.is(templateData.renamed[0].name, "old-token-name");
  t.is(templateData.renamed[0].oldName, "old-token-name");

  t.is(templateData.deprecated.length, 1);
  t.is(templateData.deprecated[0].name, "deprecated-token");
  t.is(templateData.deprecated[0].comment, "This token is deprecated");

  t.is(templateData.added.length, 1);
  t.is(templateData.added[0].name, "new-token");

  t.is(templateData.updated.added.length, 1);
  t.is(templateData.updated.added[0].name, "token-with-added-property");
  t.truthy(templateData.updated.added[0].changes);
});

test("HandlebarsFormatter log setter - handles text cleaning", (t) => {
  const formatter = new HandlebarsFormatter();
  const mockLog = [];

  formatter.log = (input) => {
    mockLog.push(input);
  };

  formatter.log(
    "Test with $ and https://opensource.adobe.com/spectrum-tokens/schemas/token-types/color.json",
  );

  t.is(mockLog[0], "Test with  and color.json");
});

test("HandlebarsFormatter printReport - generates report successfully", (t) => {
  const formatter = new HandlebarsFormatter();
  const output = [];

  const outputFunction = (text) => {
    output.push(text);
  };

  // Use a simple template that doesn't use complex helpers
  formatter.setTemplateString("Report: {{totalTokens result}} tokens changed");

  const result = formatter.printReport(
    mockTokenDiffResult,
    outputFunction,
    mockOptions,
  );

  t.true(result);
  t.true(output.length > 0);
  t.true(output[0].includes("Report: 9 tokens changed"));
});

test("HandlebarsFormatter printReport - handles template errors", (t) => {
  const formatter = new HandlebarsFormatter();
  const output = [];

  const outputFunction = (text) => {
    output.push(text);
  };

  // Force an error by setting an invalid template
  formatter.compiledTemplate = () => {
    throw new Error("Template error");
  };

  const result = formatter.printReport(
    mockTokenDiffResult,
    outputFunction,
    mockOptions,
  );

  t.false(result);
});

test("HandlebarsFormatter printReport - with custom template", (t) => {
  const formatter = new HandlebarsFormatter();
  const output = [];

  const outputFunction = (text) => {
    output.push(text);
  };

  formatter.setTemplateString("Total: {{totalTokens result}}");

  const result = formatter.printReport(
    mockTokenDiffResult,
    outputFunction,
    mockOptions,
  );

  t.true(result);
  t.is(output[0], "Total: 9");
});

test("HandlebarsFormatter integration - full template rendering", (t) => {
  const formatter = new HandlebarsFormatter();
  const output = [];

  const outputFunction = (text) => {
    output.push(text);
  };

  // Use a comprehensive but safe template
  const integrationTemplate = `
# Token Changes Report

{{#if renamed}}
## Renamed ({{renamed.length}})
{{#each renamed}}
- {{oldName}} → {{name}}
{{/each}}
{{/if}}

{{#if deprecated}}
## Deprecated ({{deprecated.length}})
{{#each deprecated}}
- {{name}}{{#if comment}}: {{comment}}{{/if}}
{{/each}}
{{/if}}

{{#if added}}
## Added ({{added.length}})
{{#each added}}
- {{name}}
{{/each}}
{{/if}}

Total: {{totalTokens result}} tokens
  `;

  formatter.setTemplateString(integrationTemplate);

  const result = formatter.printReport(
    mockTokenDiffResult,
    outputFunction,
    mockOptions,
  );

  t.true(result);

  const fullOutput = output.join("");

  // Check that various sections are present
  t.true(fullOutput.includes("Token Changes Report"));
  t.true(fullOutput.includes("Renamed"));
  t.true(fullOutput.includes("Deprecated"));
  t.true(fullOutput.includes("Added"));
  t.true(fullOutput.includes("Total: 9 tokens"));
});

test("HandlebarsFormatter with JSON template", (t) => {
  const formatter = new HandlebarsFormatter();
  const output = [];

  const outputFunction = (text) => {
    output.push(text);
  };

  // Use a simple JSON template
  const jsonTemplate = `{
  "totalTokens": {{totalTokens result}},
  "renamed": {{renamed.length}},
  "deprecated": {{deprecated.length}},
  "added": {{added.length}},
  "deleted": {{deleted.length}}
}`;

  formatter.setTemplateString(jsonTemplate);

  const result = formatter.printReport(
    mockTokenDiffResult,
    outputFunction,
    mockOptions,
  );

  t.true(result);

  const fullOutput = output.join("");

  // Should be valid JSON
  t.notThrows(() => {
    const parsed = JSON.parse(fullOutput);
    t.is(parsed.totalTokens, 9);
    t.is(parsed.renamed, 1);
    t.is(parsed.deprecated, 1);
    t.is(parsed.added, 1);
    t.is(parsed.deleted, 1);
  });
});

test("HandlebarsFormatter with plain template", (t) => {
  const formatter = new HandlebarsFormatter();
  const output = [];

  const outputFunction = (text) => {
    output.push(text);
  };

  // Use a plain text template
  const plainTemplate = `
Token Changes: {{totalTokens result}}

{{#if renamed}}
Renamed: {{renamed.length}}
{{#each renamed}}
{{oldName}} -> {{name}}
{{/each}}
{{/if}}

{{#if added}}
Added: {{added.length}}
{{#each added}}
{{name}}
{{/each}}
{{/if}}
  `;

  formatter.setTemplateString(plainTemplate);

  const result = formatter.printReport(
    mockTokenDiffResult,
    outputFunction,
    mockOptions,
  );

  t.true(result);

  const fullOutput = output.join("");

  // Plain template should not contain HTML tags
  t.false(fullOutput.includes("<code>"));
  t.false(fullOutput.includes("<strong>"));
  t.false(fullOutput.includes("<details>"));
  t.true(fullOutput.includes("Token Changes: 9"));
});
