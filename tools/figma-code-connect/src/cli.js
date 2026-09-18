// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { McpHttpClient, parseToolJson } from "./mcp.js";
import {
  attachFigmaNodes,
  compactFigmaComponents,
  createMappingPlan,
  loadComponents,
  toMcpMapping,
} from "./plan.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const DEFAULT_COMPONENTS_DIR = resolve(ROOT, "packages/design-data/components");
const DEFAULT_MCP_URL = "http://127.0.0.1:3845/mcp";
const REQUIRED_TOOLS = ["get_code_connect_map", "send_code_connect_mappings"];

function parseArgs(args) {
  const options = {
    apply: false,
    batchSize: 10,
    componentsDir: DEFAULT_COMPONENTS_DIR,
    labels: {},
    mcpUrl: DEFAULT_MCP_URL,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--components-dir") options.componentsDir = resolve(value);
    else if (arg === "--figma-components")
      options.figmaComponents = resolve(value);
    else if (arg === "--mcp-url") options.mcpUrl = value;
    else if (arg === "--batch-size") options.batchSize = Number(value);
    else if (arg === "--label") {
      const labelParts = value.split("=");
      if (labelParts.length !== 2 || !labelParts[0] || !labelParts[1])
        throw new Error("--label must be PLATFORM=LABEL.");
      options.labels[labelParts[0]] = labelParts[1];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
    if (arg !== "--apply") index += 1;
  }
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1) {
    throw new Error("--batch-size must be a positive integer.");
  }
  return options;
}

async function readFigmaComponents(path) {
  return compactFigmaComponents(JSON.parse(await readFile(path, "utf8")));
}

async function enumerateFigmaComponents(options, client, toolNames) {
  if (options.figmaComponents) {
    return readFigmaComponents(options.figmaComponents);
  }
  if (toolNames.has("list_file_components_for_code_connect")) {
    return compactFigmaComponents(
      parseToolJson(
        await client.callTool("list_file_components_for_code_connect"),
      ),
    );
  }
  throw new Error(
    "--apply requires --figma-components PATH. The connected Figma MCP server does not " +
      "currently expose list_file_components_for_code_connect for safe enumeration.",
  );
}

function chunk(items, size) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

function hasCodeConnectMap(result) {
  return result.content?.some(({ text }) => {
    if (!text) return false;
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed)
        ? parsed.length > 0
        : Object.keys(parsed).length > 0;
    } catch {
      return !/no code connect map|not found|no mappings/i.test(text);
    }
  });
}

async function filterExistingMappings(client, mappings, batchSize) {
  const pending = [];
  for (const mappingsBatch of chunk(mappings, batchSize)) {
    const results = await Promise.all(
      mappingsBatch.map(async (mapping) => ({
        mapping,
        existing: await client.callTool("get_code_connect_map", {
          nodeId: mapping.nodeId,
          codeConnectLabel: mapping.label,
        }),
      })),
    );
    pending.push(
      ...results
        .filter(({ existing }) => !hasCodeConnectMap(existing))
        .map(({ mapping }) => toMcpMapping(mapping)),
    );
  }
  return pending;
}

async function applyPlan(options, plan) {
  const client = new McpHttpClient(options.mcpUrl);
  try {
    await client.connect();
    const tools = await client.listTools();
    const toolNames = new Set(tools.map(({ name }) => name));
    const missing = REQUIRED_TOOLS.filter((name) => !toolNames.has(name));
    if (missing.length) {
      throw new Error(
        `Connected Figma MCP server is missing: ${missing.join(", ")}.`,
      );
    }

    const mappings = attachFigmaNodes(
      plan,
      await enumerateFigmaComponents(options, client, toolNames),
    );
    const pending = await filterExistingMappings(
      client,
      mappings,
      options.batchSize,
    );
    for (const mappingsBatch of chunk(pending, options.batchSize)) {
      await client.callTool("send_code_connect_mappings", {
        mappings: mappingsBatch,
      });
    }
    return {
      planned: plan.length,
      matched: mappings.length,
      submitted: pending.length,
      skipped: mappings.length - pending.length,
    };
  } finally {
    await client.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const plan = createMappingPlan(
    await loadComponents(options.componentsDir),
    options.labels,
  );
  if (!options.apply) {
    console.log(JSON.stringify({ mappings: plan }, null, 2));
    return;
  }
  console.log(JSON.stringify(await applyPlan(options, plan), null, 2));
}

main().catch((error) => {
  console.error(`figma-code-connect: ${error.message}`);
  process.exitCode = 1;
});
