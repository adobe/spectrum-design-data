#!/usr/bin/env node
// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createAuthoringTools } from "./tools/authoring.js";
import { createReadTools } from "./tools/read.js";
import { createValidateTools } from "./tools/validate.js";
import { createDiffTools } from "./tools/diff.js";
import { createWriteTools } from "./tools/write.js";

export function createAllTools() {
  return [
    ...createReadTools(),
    ...createValidateTools(),
    ...createDiffTools(),
    ...createWriteTools(),
    ...createAuthoringTools(),
  ];
}

export function createMCPServer() {
  const pkg = JSON.parse(
    readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "../package.json"),
      "utf8",
    ),
  );
  const allTools = createAllTools();
  const server = new Server(
    { name: "design-data-agent-mcp", version: pkg.version },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    })),
  }));
  server.setRequestHandler(
    CallToolRequestSchema,
    async ({ params: { name, arguments: args } }) => {
      const tool = allTools.find((t) => t.name === name);
      if (!tool) throw new Error(`Unknown tool: ${name}`);
      try {
        const result = await tool.handler(args ?? {});
        return {
          content: [
            {
              type: "text",
              text:
                typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: err.message }],
          isError: true,
        };
      }
    },
  );
  return server;
}

async function startServer() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("design-data-agent-mcp started");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
