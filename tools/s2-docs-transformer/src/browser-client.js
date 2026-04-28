/**
 * Browser MCP Client
 * Communicates with cursor-browser-extension MCP server
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class BrowserClient {
  constructor() {
    this.client = null;
    this.transport = null;
  }

  async connect() {
    // Connect to the browser extension MCP server
    // This assumes the cursor-browser-extension is already running
    console.log("Connecting to browser MCP...");

    this.transport = new StdioClientTransport({
      command: "cursor-browser-extension",
      args: [],
    });

    this.client = new Client(
      {
        name: "s2-docs-scraper",
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );

    await this.client.connect(this.transport);
    console.log("Connected to browser MCP");
  }

  async navigate(url) {
    if (!this.client) {
      throw new Error("Not connected to browser MCP");
    }

    const result = await this.client.callTool("browser_navigate", { url });
    return result;
  }

  async snapshot() {
    if (!this.client) {
      throw new Error("Not connected to browser MCP");
    }

    const result = await this.client.callTool("browser_snapshot", {});
    return result;
  }

  async click(element, ref) {
    if (!this.client) {
      throw new Error("Not connected to browser MCP");
    }

    const result = await this.client.callTool("browser_click", {
      element,
      ref,
    });
    return result;
  }

  async close() {
    if (this.client) {
      await this.client.close();
    }
  }
}
