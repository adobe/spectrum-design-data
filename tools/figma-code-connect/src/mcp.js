// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export class McpHttpClient {
  constructor(url) {
    this.client = new Client({
      name: "figma-code-connect",
      version: "0.1.0",
    });
    this.transport = new StreamableHTTPClientTransport(new URL(url));
  }

  async connect() {
    await this.client.connect(this.transport);
  }

  async listTools() {
    return (await this.client.listTools()).tools;
  }

  async callTool(name, args = {}) {
    return this.client.callTool({ name, arguments: args });
  }

  async close() {
    await this.transport.close();
  }
}

export function parseToolJson(result) {
  const text = result.content?.find(({ type }) => type === "text")?.text;
  if (!text) {
    throw new Error("Figma MCP tool returned no text content.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Figma MCP component enumeration did not return JSON.");
  }
}
