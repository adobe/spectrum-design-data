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
import {
  generateChangesetContent,
  generateChangesetFilename,
} from "../../build/services/changesetGenerator.js";

// Test changeset content generation
test("generateChangesetContent creates changeset for new component", (t) => {
  const content = generateChangesetContent({
    componentTitle: "Button",
    isNewComponent: true,
  });

  t.true(content.includes('"@adobe/spectrum-component-api-schemas": minor'));
  t.true(content.includes("Add Button component schema"));
  t.true(content.includes("---"));
});

test("generateChangesetContent creates changeset for component update", (t) => {
  const content = generateChangesetContent({
    componentTitle: "Button",
    isNewComponent: false,
  });

  t.true(content.includes('"@adobe/spectrum-component-api-schemas": patch'));
  t.true(content.includes("Update Button component schema"));
});

test("generateChangesetContent includes description when provided", (t) => {
  const content = generateChangesetContent({
    componentTitle: "Button",
    isNewComponent: true,
    description: "Added new size options",
  });

  t.true(content.includes("Added new size options"));
});

test("generateChangesetContent handles complex component names", (t) => {
  const content = generateChangesetContent({
    componentTitle: "Action Button",
    isNewComponent: true,
  });

  t.true(content.includes("Add Action Button component schema"));
});

test("generateChangesetContent formats correctly for patch updates", (t) => {
  const content = generateChangesetContent({
    componentTitle: "Checkbox",
    isNewComponent: false,
    description: "Fixed size option values",
  });

  t.true(content.includes('"@adobe/spectrum-component-api-schemas": patch'));
  t.true(content.includes("Update Checkbox component schema"));
  t.true(content.includes("Fixed size option values"));
});

// Test changeset filename generation
test("generateChangesetFilename creates unique filenames", (t) => {
  const filename1 = generateChangesetFilename();
  const filename2 = generateChangesetFilename();

  // Should have .md extension
  t.true(filename1.endsWith(".md"));
  t.true(filename2.endsWith(".md"));

  // Should be different (due to timestamp and random component)
  t.not(filename1, filename2);
});

test("generateChangesetFilename follows naming pattern", (t) => {
  const filename = generateChangesetFilename();

  // Should match pattern: {random}-{timestamp}.md
  const pattern = /^[a-z0-9]+-\d+\.md$/;
  t.true(pattern.test(filename), `Filename ${filename} should match pattern`);
});

test("generateChangesetFilename generates multiple unique names", (t) => {
  const filenames = new Set();
  for (let i = 0; i < 10; i++) {
    filenames.add(generateChangesetFilename());
  }

  // All should be unique
  t.is(filenames.size, 10);
});

// Test changeset format compliance
test("changeset format matches .changeset conventions", (t) => {
  const content = generateChangesetContent({
    componentTitle: "Test Component",
    isNewComponent: true,
    description: "Test description",
  });

  // Should start with frontmatter
  t.true(content.startsWith("---\n"));

  // Should have package name
  t.true(content.includes('"@adobe/spectrum-component-api-schemas"'));

  // Should have version bump type
  t.true(content.includes(": minor") || content.includes(": patch"));

  // Should end frontmatter
  const lines = content.split("\n");
  t.is(lines[0], "---");
  t.is(lines[2], "---");
});

test("changeset minor bump for new components", (t) => {
  const content = generateChangesetContent({
    componentTitle: "New Component",
    isNewComponent: true,
  });

  t.true(content.includes("minor"));
  t.false(content.includes("patch"));
  t.true(content.includes("Add New Component"));
});

test("changeset patch bump for updates", (t) => {
  const content = generateChangesetContent({
    componentTitle: "Existing Component",
    isNewComponent: false,
  });

  t.true(content.includes("patch"));
  t.false(content.includes("minor"));
  t.true(content.includes("Update Existing Component"));
});
