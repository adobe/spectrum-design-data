// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

function parseResponse(text) {
  const data = text
    .split("\n")
    .find((line) => line.startsWith("data: "))
    ?.slice("data: ".length);
  if (!data) {
    throw new Error("Figma MCP returned no JSON-RPC response.");
  }
  const response = JSON.parse(data);
  if (response.error) {
    throw new Error(`Figma MCP error: ${response.error.message}`);
  }
  return response.result;
}

export class McpHttpClient {
  constructor(url) {
    this.url = url;
    this.sessionId = undefined;
    this.requestId = 0;
  }

  async request(method, params) {
    const headers = {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    };
    if (this.sessionId) {
      headers["mcp-session-id"] = this.sessionId;
    }
    const response = await fetch(this.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ++this.requestId,
        method,
        params,
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Figma MCP request ${method} failed with HTTP ${response.status}.`,
      );
    }
    const sessionId = response.headers.get("mcp-session-id");
    if (sessionId) {
      this.sessionId = sessionId;
    }
    return parseResponse(await response.text());
  }

  async connect() {
    await this.request("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: {
        name: "figma-code-connect",
        version: "0.1.0",
      },
    });
  }

  async listTools() {
    return (await this.request("tools/list")).tools;
  }

  async callTool(name, args = {}) {
    return this.request("tools/call", { name, arguments: args });
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
