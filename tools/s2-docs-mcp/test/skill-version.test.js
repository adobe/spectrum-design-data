// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Asserts that the skill SKILL.md metadata.version matches the package.json
 * version, so a changeset bump fails CI until the frontmatter is updated.
 */

import test from "ava";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/** Parse `metadata.version` from a SKILL.md file's YAML frontmatter. */
function parseSkillVersion(skillPath) {
  const content = readFileSync(skillPath, "utf-8");
  // Extract content between the first two --- delimiters
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`No YAML frontmatter found in ${skillPath}`);
  const frontmatter = match[1];
  // Extract metadata.version — expects the form: `  version: "x.y.z"`
  const versionMatch = frontmatter.match(
    /^\s*version:\s*["']?([^"'\r\n]+)["']?\s*$/m,
  );
  if (!versionMatch) {
    throw new Error(
      `metadata.version not found in frontmatter of ${skillPath}`,
    );
  }
  return versionMatch[1].trim();
}

test("SKILL.md metadata.version matches package.json version", (t) => {
  const skillPath = join(root, "skills", "s2-docs", "SKILL.md");
  const pkgPath = join(root, "package.json");

  const skillVersion = parseSkillVersion(skillPath);
  const { version: pkgVersion } = JSON.parse(readFileSync(pkgPath, "utf-8"));

  t.is(
    skillVersion,
    pkgVersion,
    `SKILL.md metadata.version "${skillVersion}" must match package.json version "${pkgVersion}". ` +
      `Update skills/s2-docs/SKILL.md when bumping the package version.`,
  );
});
