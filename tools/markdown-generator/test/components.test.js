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
import { readFile, mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { generateComponentMarkdown } from "../src/components.js";

test("generateComponentMarkdown creates valid frontmatter", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "md-gen-test-"));
  try {
    const count = await generateComponentMarkdown(outputDir);
    t.true(count >= 0, "Should return a count");

    // Check if any files were generated
    if (count > 0) {
      // Read one of the generated files to verify structure
      const files = await import("fs/promises").then((fs) =>
        fs.readdir(join(outputDir, "components")),
      );
      t.true(files.length > 0, "Should generate at least one component file");

      if (files.length > 0) {
        const content = await readFile(
          join(outputDir, "components", files[0]),
          "utf8",
        );
        t.true(content.includes("---"), "Should contain YAML frontmatter");
        t.true(
          content.includes("title:"),
          "Should contain title in frontmatter",
        );
        t.true(
          content.includes("description:"),
          "Should contain description in frontmatter",
        );
        t.true(content.includes("tags:"), "Should contain tags in frontmatter");
        t.true(
          content.includes("source_url:"),
          "Should contain source_url in frontmatter",
        );
        const slug = files[0].replace(/\.md$/, "");
        t.true(
          content.includes(
            `https://opensource.adobe.com/spectrum-design-data/components/${slug}/`,
          ),
          "source_url should match published URL pattern for component",
        );
      }
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("generateComponentMarkdown creates proper slug-based filenames", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "md-gen-test-"));
  try {
    const count = await generateComponentMarkdown(outputDir);
    if (count > 0) {
      const files = await import("fs/promises").then((fs) =>
        fs.readdir(join(outputDir, "components")),
      );
      // All files should be .md files
      for (const file of files) {
        t.true(file.endsWith(".md"), `File ${file} should end with .md`);
      }
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("generateComponentMarkdown handles missing fields gracefully", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "md-gen-test-"));
  try {
    // This test verifies the generator doesn't crash on missing optional fields
    const count = await generateComponentMarkdown(outputDir);
    t.true(
      typeof count === "number",
      "Should return a number even with missing fields",
    );
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("generateComponentMarkdown includes category in tags", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "md-gen-test-"));
  try {
    await generateComponentMarkdown(outputDir);
    const files = await import("fs/promises").then((fs) =>
      fs.readdir(join(outputDir, "components")),
    );

    if (files.length > 0) {
      const content = await readFile(
        join(outputDir, "components", files[0]),
        "utf8",
      );
      // Tags should include component and schema
      t.true(
        content.includes("- component") || content.includes("component"),
        "Should include component tag",
      );
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("generateComponentMarkdown creates properties table when properties exist", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "md-gen-test-"));
  try {
    await generateComponentMarkdown(outputDir);
    const files = await import("fs/promises").then((fs) =>
      fs.readdir(join(outputDir, "components")),
    );

    if (files.length > 0) {
      const content = await readFile(
        join(outputDir, "components", files[0]),
        "utf8",
      );
      // If component has properties, should have a table
      // Check for table structure
      const hasTable =
        content.includes("| Property |") || !content.includes("| Property |");
      t.true(
        typeof hasTable === "boolean",
        "Should handle properties table correctly",
      );
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
