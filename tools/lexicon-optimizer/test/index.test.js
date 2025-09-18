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
import LexiconOptimizer from "../src/index.js";

test("LexiconOptimizer should initialize with empty lexicon", (t) => {
  const optimizer = new LexiconOptimizer();

  t.is(optimizer.lexicon.propertyNames.size, 0);
  t.is(optimizer.lexicon.enumValues.size, 0);
  t.is(optimizer.lexicon.descriptions.size, 0);
  t.is(optimizer.lexicon.categories.size, 0);
  t.is(optimizer.lexicon.stateValues.size, 0);
  t.is(optimizer.lexicon.componentTitles.size, 0);
  t.is(optimizer.lexicon.typeValues.size, 0);
  t.is(optimizer.componentStats.size, 0);
});

test("analyzeSchema should extract terms from a component schema", (t) => {
  const optimizer = new LexiconOptimizer();

  const mockSchema = {
    fileName: "button.json",
    schema: {
      title: "Button",
      description: "Buttons allow users to perform actions",
      meta: {
        category: "actions",
      },
      properties: {
        label: {
          type: "string",
        },
        size: {
          type: "string",
          enum: ["s", "m", "l", "xl"],
          default: "m",
        },
        isDisabled: {
          type: "boolean",
          default: false,
        },
        state: {
          type: "string",
          enum: ["default", "hover", "down"],
          default: "default",
        },
      },
    },
  };

  const stats = optimizer.analyzeSchema(mockSchema);

  // Check lexicon extraction
  t.true(optimizer.lexicon.componentTitles.has("Button"));
  t.true(optimizer.lexicon.categories.has("actions"));
  t.true(optimizer.lexicon.propertyNames.has("label"));
  t.true(optimizer.lexicon.propertyNames.has("size"));
  t.true(optimizer.lexicon.propertyNames.has("isDisabled"));
  t.true(optimizer.lexicon.propertyNames.has("state"));
  t.true(optimizer.lexicon.enumValues.has("s"));
  t.true(optimizer.lexicon.enumValues.has("m"));
  t.true(optimizer.lexicon.enumValues.has("l"));
  t.true(optimizer.lexicon.enumValues.has("xl"));
  t.true(optimizer.lexicon.enumValues.has("false"));
  t.true(optimizer.lexicon.stateValues.has("default"));
  t.true(optimizer.lexicon.stateValues.has("hover"));
  t.true(optimizer.lexicon.stateValues.has("down"));
  t.true(optimizer.lexicon.typeValues.has("string"));
  t.true(optimizer.lexicon.typeValues.has("boolean"));

  // Check component stats
  t.is(stats.totalProperties, 4);
  t.is(stats.enumProperties, 2);
  t.is(stats.booleanProperties, 1);
  t.is(stats.stringProperties, 3);
  t.is(stats.hasState, true);
  t.is(stats.hasSize, true);
  t.is(stats.hasLabel, true);
});

test("extractDescriptionTerms should filter out common words", (t) => {
  const optimizer = new LexiconOptimizer();

  const description =
    "Buttons allow users to perform actions and navigate to other pages";
  optimizer.extractDescriptionTerms(description);

  // Should extract meaningful terms, not common words
  t.true(optimizer.lexicon.descriptions.has("buttons"));
  t.true(optimizer.lexicon.descriptions.has("users"));
  t.true(optimizer.lexicon.descriptions.has("perform"));
  t.true(optimizer.lexicon.descriptions.has("actions"));
  t.true(optimizer.lexicon.descriptions.has("navigate"));
  t.true(optimizer.lexicon.descriptions.has("pages"));

  // Should not include common words
  t.false(optimizer.lexicon.descriptions.has("to"));
  t.false(optimizer.lexicon.descriptions.has("and"));
  t.false(optimizer.lexicon.descriptions.has("other"));
});

test("isCommonWord should correctly identify common words", (t) => {
  const optimizer = new LexiconOptimizer();

  t.true(optimizer.isCommonWord("the"));
  t.true(optimizer.isCommonWord("and"));
  t.true(optimizer.isCommonWord("is"));
  t.false(optimizer.isCommonWord("button"));
  t.false(optimizer.isCommonWord("user"));

  t.false(optimizer.isCommonWord("spectrum"));
  t.false(optimizer.isCommonWord("component"));
  t.false(optimizer.isCommonWord("lexicon"));
});

test("generateReport should create comprehensive report", (t) => {
  const optimizer = new LexiconOptimizer();

  // Add some test data
  optimizer.lexicon.propertyNames.add("label");
  optimizer.lexicon.propertyNames.add("size");
  optimizer.lexicon.enumValues.add("s");
  optimizer.lexicon.enumValues.add("m");
  optimizer.lexicon.categories.add("actions");
  optimizer.lexicon.stateValues.add("default");
  optimizer.lexicon.componentTitles.add("Button");
  optimizer.lexicon.typeValues.add("string");

  optimizer.componentStats.set("button", {
    totalProperties: 2,
    enumProperties: 1,
    booleanProperties: 0,
    stringProperties: 2,
    hasState: true,
    hasSize: true,
    hasLabel: true,
  });

  const report = optimizer.generateReport();

  t.is(report.summary.totalComponents, 1);
  t.is(report.summary.totalPropertyNames, 2);
  t.is(report.summary.totalEnumValues, 2);
  t.is(report.summary.totalCategories, 1);
  t.is(report.summary.totalStateValues, 1);
  t.is(report.summary.totalComponentTitles, 1);
  t.is(report.summary.totalTypeValues, 1);

  t.deepEqual(report.lexicon.propertyNames, ["label", "size"]);
  t.deepEqual(report.lexicon.enumValues, ["m", "s"]);
  t.deepEqual(report.lexicon.categories, ["actions"]);
  t.deepEqual(report.lexicon.stateValues, ["default"]);
  t.deepEqual(report.lexicon.componentTitles, ["Button"]);
  t.deepEqual(report.lexicon.typeValues, ["string"]);

  t.truthy(report.componentStats.button);
  t.is(report.componentStats.button.totalProperties, 2);

  t.truthy(Array.isArray(report.insights));
});

test("exportToFormat should support JSON format", (t) => {
  const optimizer = new LexiconOptimizer();

  // Add test data
  optimizer.lexicon.propertyNames.add("label");
  optimizer.lexicon.enumValues.add("s");
  optimizer.lexicon.categories.add("actions");

  const jsonOutput = optimizer.exportToFormat("json");
  const parsed = JSON.parse(jsonOutput);

  t.truthy(parsed.summary);
  t.truthy(parsed.lexicon);
  t.truthy(parsed.componentStats);
  t.truthy(parsed.insights);
});

test("exportToFormat should support CSV format", (t) => {
  const optimizer = new LexiconOptimizer();

  // Add test data
  optimizer.lexicon.propertyNames.add("label");
  optimizer.lexicon.enumValues.add("s");
  optimizer.lexicon.categories.add("actions");

  const csvOutput = optimizer.exportToFormat("csv");
  const lines = csvOutput.split("\n");

  t.is(lines[0], "Type,Term,Count");
  t.true(lines.some((line) => line.includes("Property Name,label,1")));
  t.true(lines.some((line) => line.includes("Enum Value,s,1")));
  t.true(lines.some((line) => line.includes("Category,actions,1")));
});

test("exportToFormat should support Markdown format", (t) => {
  const optimizer = new LexiconOptimizer();

  // Add test data
  optimizer.lexicon.propertyNames.add("label");
  optimizer.lexicon.enumValues.add("s");
  optimizer.lexicon.categories.add("actions");
  optimizer.componentStats.set("button", {
    totalProperties: 1,
    enumProperties: 0,
    booleanProperties: 0,
    stringProperties: 1,
    hasState: false,
    hasSize: false,
    hasLabel: true,
  });

  const markdownOutput = optimizer.exportToFormat("markdown");

  t.true(markdownOutput.includes("# Lexicon Optimizer Report"));
  t.true(markdownOutput.includes("## Summary"));
  t.true(markdownOutput.includes("## Property Names"));
  t.true(markdownOutput.includes("## Enum Values"));
  t.true(markdownOutput.includes("## Categories"));
  t.true(markdownOutput.includes("## Insights"));
  t.true(markdownOutput.includes("- `label`"));
  t.true(markdownOutput.includes("- `s`"));
  t.true(markdownOutput.includes("- `actions`"));
});

test("exportToFormat should throw error for unsupported format", (t) => {
  const optimizer = new LexiconOptimizer();

  const error = t.throws(() => {
    optimizer.exportToFormat("unsupported");
  });

  t.is(error.message, "Unsupported format: unsupported");
});

test("generateInsights should identify size consistency issues", (t) => {
  const optimizer = new LexiconOptimizer();

  // Add various size values
  optimizer.lexicon.enumValues.add("s");
  optimizer.lexicon.enumValues.add("m");
  optimizer.lexicon.enumValues.add("l");
  optimizer.lexicon.enumValues.add("xl");
  optimizer.lexicon.enumValues.add("xs");
  optimizer.lexicon.enumValues.add("xxl");
  optimizer.lexicon.enumValues.add("other");

  const insights = optimizer.generateInsights();

  const sizeInsight = insights.find(
    (insight) => insight.type === "size_consistency",
  );
  t.truthy(sizeInsight);
  t.true(sizeInsight.message.includes("6 size values"));
  t.true(sizeInsight.recommendation.includes("standardizing size values"));
});

test("generateInsights should identify state consistency issues", (t) => {
  const optimizer = new LexiconOptimizer();

  // Add various state values
  optimizer.lexicon.stateValues.add("default");
  optimizer.lexicon.stateValues.add("hover");
  optimizer.lexicon.stateValues.add("focus");
  optimizer.lexicon.stateValues.add("active");
  optimizer.lexicon.stateValues.add("disabled");

  const insights = optimizer.generateInsights();

  const stateInsight = insights.find(
    (insight) => insight.type === "state_consistency",
  );
  t.truthy(stateInsight);
  t.true(stateInsight.message.includes("5 state values"));
  t.true(stateInsight.recommendation.includes("standardizing state values"));
});

test("generateInsights should identify boolean property patterns", (t) => {
  const optimizer = new LexiconOptimizer();

  // Add boolean property names
  optimizer.lexicon.propertyNames.add("isDisabled");
  optimizer.lexicon.propertyNames.add("isRequired");
  optimizer.lexicon.propertyNames.add("hasIcon");
  optimizer.lexicon.propertyNames.add("showLabel");
  optimizer.lexicon.propertyNames.add("label");

  const insights = optimizer.generateInsights();

  const booleanInsight = insights.find(
    (insight) => insight.type === "boolean_patterns",
  );
  t.truthy(booleanInsight);
  t.true(
    booleanInsight.message.includes(
      "boolean properties following naming patterns",
    ),
  );
  t.true(
    booleanInsight.recommendation.includes(
      "boolean property naming conventions",
    ),
  );
});
