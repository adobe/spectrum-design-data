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
 * The plugin must be self-contained: its bundled MCP config is pinned to the
 * released @adobe/design-data-mcp, the skill names tools the server really exposes,
 * and the packed artifact ships everything and links to nothing outside itself.
 */

import test from "ava";
import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const repo = join(root, "..", "..");
const read = (...p) => readFileSync(join(root, ...p), "utf-8");
const json = (...p) => JSON.parse(read(...p));

const mcpVersion = JSON.parse(
  readFileSync(join(repo, "tools", "design-data-mcp", "package.json"), "utf-8"),
).version;
const server = json(".mcp.json").mcpServers["design-data"];
const skill = read("skills", "design-data", "SKILL.md");

test(".mcp.json runs the MCP server pinned to the workspace version", (t) => {
  t.is(server.command, "npx");
  t.deepEqual(server.args, ["-y", `@adobe/design-data-mcp@${mcpVersion}`]);
});

test("documented MCP pins match .mcp.json", (t) => {
  for (const doc of [read("README.md"), skill]) {
    const pins = doc.match(/@adobe\/design-data-mcp@[^\s"`]+/g) ?? [];
    t.true(pins.length > 0);
    for (const pin of pins) t.is(pin, `@adobe/design-data-mcp@${mcpVersion}`);
  }
});

test("plugin.json name and version match the skill and package", (t) => {
  const plugin = json(".claude-plugin", "plugin.json");
  t.is(plugin.name, "spectrum-design-data");
  t.regex(skill, /^name: design-data$/m);
  t.is(plugin.version, json("package.json").version);
});

test("root marketplace entry points at this plugin and does not claim a CLI", (t) => {
  const entry = json(
    "..",
    "..",
    ".claude-plugin",
    "marketplace.json",
  ).plugins.find((p) => p.name === "spectrum-design-data");
  t.is(entry.source, "./tools/design-data-skill");
  t.notRegex(entry.description, /\bCLI\b|zero config/i);
});

test("SKILL.md allowed-tools and docs name exactly the tools the MCP server defines", (t) => {
  const src = readFileSync(
    join(repo, "tools", "design-data-mcp", "src", "tools", "design-data.js"),
    "utf-8",
  );
  const defined = [...src.matchAll(/^\s+name: "(design-data-[a-z-]+)"/gm)].map(
    (m) => m[1],
  );
  t.true(defined.length > 0);
  const allowed = skill
    .match(/^allowed-tools: (.*)$/m)[1]
    .split(", ")
    .map((n) =>
      n.replace("mcp__plugin_spectrum-design-data_design-data__", ""),
    );
  t.deepEqual([...allowed].sort(), [...defined].sort());
  for (const name of defined)
    t.true(
      skill.includes(`### \`${name}\``) || skill.includes(`\`${name}\``),
      name,
    );
});

test("packed artifact ships the plugin files and has no relative links out of it", (t) => {
  const [{ files }] = JSON.parse(
    execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
      cwd: root,
      encoding: "utf-8",
    }),
  );
  const paths = files.map((f) => f.path);
  for (const required of [
    ".mcp.json",
    ".claude-plugin/plugin.json",
    "skills/design-data/SKILL.md",
    "README.md",
  ]) {
    t.true(paths.includes(required), `${required} missing from pack`);
  }
  t.true(files.every((f) => f.size < 1024 * 1024));
  for (const doc of ["README.md", "skills/design-data/SKILL.md"]) {
    t.notRegex(readFileSync(join(root, doc), "utf-8"), /\]\(\.\.?\//, doc);
  }
});
