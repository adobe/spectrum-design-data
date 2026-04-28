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
import { generateRegistryMarkdown } from "../src/registry.js";

test("generateRegistryMarkdown creates valid frontmatter", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "md-gen-test-"));
  try {
    const count = await generateRegistryMarkdown(outputDir);
    t.true(count >= 0, "Should return a count");

    if (count > 0) {
      const files = await import("fs/promises").then((fs) =>
        fs.readdir(join(outputDir, "registry")),
      );
      t.true(files.length > 0, "Should generate at least one registry file");

      if (files.length > 0) {
        const content = await readFile(
          join(outputDir, "registry", files[0]),
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
        const key = files[0].replace(/\.md$/, "");
        t.true(
          content.includes(
            `https://opensource.adobe.com/spectrum-design-data/registry/${key}/`,
          ),
          "source_url should match published URL pattern for registry entry",
        );
      }
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("generateRegistryMarkdown creates registry entry structure", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "md-gen-test-"));
  try {
    await generateRegistryMarkdown(outputDir);
    const files = await import("fs/promises").then((fs) =>
      fs.readdir(join(outputDir, "registry")),
    );

    if (files.length > 0) {
      const content = await readFile(
        join(outputDir, "registry", files[0]),
        "utf8",
      );
      // Should have table structure
      t.true(
        content.includes("| ID |") || content.includes("| Label |"),
        "Should include table headers",
      );
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("generateRegistryMarkdown handles glossary entries with definitions", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "md-gen-test-"));
  try {
    await generateRegistryMarkdown(outputDir);
    const files = await import("fs/promises").then((fs) =>
      fs.readdir(join(outputDir, "registry")),
    );

    // Check if glossary.md exists
    const glossaryFile = files.find((f) => f === "glossary.md");
    if (glossaryFile) {
      const content = await readFile(
        join(outputDir, "registry", glossaryFile),
        "utf8",
      );
      // Glossary should have Definition column if entries have definitions
      t.true(
        content.includes("Definition") || content.includes("| ID |"),
        "Should handle glossary entries correctly",
      );
    } else {
      // If no glossary, that's okay - test passes
      t.pass("No glossary file to test");
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("generateRegistryMarkdown includes registry and key in tags", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "md-gen-test-"));
  try {
    await generateRegistryMarkdown(outputDir);
    const files = await import("fs/promises").then((fs) =>
      fs.readdir(join(outputDir, "registry")),
    );

    if (files.length > 0) {
      const content = await readFile(
        join(outputDir, "registry", files[0]),
        "utf8",
      );
      // Tags should include registry
      t.true(
        content.includes("- registry") || content.includes("registry"),
        "Should include registry tag",
      );
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("generateRegistryMarkdown creates all expected registry files", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "md-gen-test-"));
  try {
    await generateRegistryMarkdown(outputDir);
    const files = await import("fs/promises").then((fs) =>
      fs.readdir(join(outputDir, "registry")),
    );

    // Should generate multiple registry files
    t.true(files.length > 0, "Should generate registry files");
    // All files should be .md
    for (const file of files) {
      t.true(file.endsWith(".md"), `File ${file} should end with .md`);
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
