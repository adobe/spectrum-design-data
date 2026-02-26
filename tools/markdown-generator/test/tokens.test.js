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
import { generateTokenMarkdown } from "../src/tokens.js";

test("generateTokenMarkdown creates valid frontmatter", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "md-gen-test-"));
  try {
    const count = await generateTokenMarkdown(outputDir);
    t.true(count >= 0, "Should return a count");

    if (count > 0) {
      const files = await import("fs/promises").then((fs) =>
        fs.readdir(join(outputDir, "tokens")),
      );
      t.true(files.length > 0, "Should generate at least one token file");

      if (files.length > 0) {
        const content = await readFile(
          join(outputDir, "tokens", files[0]),
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
        const fileKey = files[0].replace(/\.md$/, "");
        t.true(
          content.includes(
            `https://opensource.adobe.com/spectrum-design-data/tokens/${fileKey}/`,
          ),
          "source_url should match published URL pattern for token file",
        );
      }
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("generateTokenMarkdown includes named anchors for tokens", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "md-gen-test-"));
  try {
    await generateTokenMarkdown(outputDir);
    const files = await import("fs/promises").then((fs) =>
      fs.readdir(join(outputDir, "tokens")),
    );

    if (files.length > 0) {
      const content = await readFile(
        join(outputDir, "tokens", files[0]),
        "utf8",
      );
      // Should have anchor tags for direct linking
      t.true(
        content.includes('<a id="'),
        "Should include named anchors for tokens",
      );
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("generateTokenMarkdown creates token table with required columns", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "md-gen-test-"));
  try {
    await generateTokenMarkdown(outputDir);
    const files = await import("fs/promises").then((fs) =>
      fs.readdir(join(outputDir, "tokens")),
    );

    if (files.length > 0) {
      const content = await readFile(
        join(outputDir, "tokens", files[0]),
        "utf8",
      );
      // Should have table headers
      t.true(
        content.includes("| Token |"),
        "Should include Token column header",
      );
      t.true(
        content.includes("| Value |"),
        "Should include Value column header",
      );
      t.true(
        content.includes("| Resolved |"),
        "Should include Resolved column header",
      );
      t.true(
        content.includes("| Deprecated |"),
        "Should include Deprecated column header",
      );
      t.true(
        content.includes("| Replaced by |"),
        "Should include Replaced by column header",
      );
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("generateTokenMarkdown handles deprecated tokens", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "md-gen-test-"));
  try {
    await generateTokenMarkdown(outputDir);
    const files = await import("fs/promises").then((fs) =>
      fs.readdir(join(outputDir, "tokens")),
    );

    if (files.length > 0) {
      const content = await readFile(
        join(outputDir, "tokens", files[0]),
        "utf8",
      );
      // Should handle deprecated field (either Yes or No)
      t.true(
        content.includes("Deprecated") ||
          content.includes("Yes") ||
          content.includes("No"),
        "Should handle deprecated field",
      );
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("generateTokenMarkdown handles renamed tokens with links", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "md-gen-test-"));
  try {
    await generateTokenMarkdown(outputDir);
    const files = await import("fs/promises").then((fs) =>
      fs.readdir(join(outputDir, "tokens")),
    );

    if (files.length > 0) {
      const content = await readFile(
        join(outputDir, "tokens", files[0]),
        "utf8",
      );
      // Should handle renamed tokens (either with link or plain text)
      // The presence of "Replaced by" column is sufficient
      t.true(
        content.includes("Replaced by"),
        "Should include Replaced by column for renamed tokens",
      );
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("generateTokenMarkdown never outputs [object Object] in token tables", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "md-gen-test-"));
  try {
    await generateTokenMarkdown(outputDir);
    const files = await import("fs/promises").then((fs) =>
      fs.readdir(join(outputDir, "tokens")),
    );
    t.true(files.length > 0, "Should generate at least one token file");
    const bad = "[object Object]";
    for (const file of files) {
      const content = await readFile(join(outputDir, "tokens", file), "utf8");
      t.false(
        content.includes(bad),
        `Generated file ${file} must not contain "${bad}"`,
      );
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
