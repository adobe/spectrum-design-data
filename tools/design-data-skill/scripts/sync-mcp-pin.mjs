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
 * Keeps the plugin's pinned @adobe/design-data-mcp version (.mcp.json and the
 * docs that quote it) and the plugin.json version in step with the workspace packages after `changeset version`.
 * Run from the package root via `moon run design-data-skill:sync-pin`.
 */

import { readFileSync, writeFileSync } from "fs";

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + "\n");

const mcpVersion = readJson("../design-data-mcp/package.json").version;
const skillVersion = readJson("package.json").version;

// .mcp.json is the source of the pin; the docs quote the same exact version.
for (const file of [".mcp.json", "skills/design-data/SKILL.md", "README.md"]) {
  const text = readFileSync(file, "utf8");
  writeFileSync(
    file,
    text.replace(
      /@adobe\/design-data-mcp@\d+\.\d+\.\d+/g,
      `@adobe/design-data-mcp@${mcpVersion}`,
    ),
  );
}

const plugin = readJson(".claude-plugin/plugin.json");
plugin.version = skillVersion;
writeJson(".claude-plugin/plugin.json", plugin);

console.log(
  `design-data plugin: mcp pin ${mcpVersion}, version ${skillVersion}`,
);
