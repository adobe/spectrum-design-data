// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { copyFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

export async function connectArtifact(directory, entryPoint) {
  const loader = join(directory, "isolation-loader.js");
  const requireGuard = join(directory, "isolation-require.cjs");
  copyFileSync(new URL("./isolation-loader.js", import.meta.url), loader);
  copyFileSync(
    new URL("./isolation-require.cjs", import.meta.url),
    requireGuard,
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      "--require",
      requireGuard,
      "--experimental-loader",
      loader,
      join(directory, entryPoint),
    ],
    cwd: directory,
    env: { PATH: process.env.PATH, DESIGN_DATA_SKIP_VERSION_CHECK: "1" },
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  const client = new Client({
    name: "guideline-content-contract",
    version: "1.0.0",
  });
  try {
    await client.connect(transport);
    return { client, stderr: () => stderr };
  } catch (error) {
    await transport.close();
    throw new Error(`${error.message}\n${stderr}`, { cause: error });
  }
}

export function readCanonical(file) {
  return JSON.parse(
    readFileSync(
      new URL(
        `../../../../packages/design-data/guidelines/${file}`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
}

export async function callJson(client, name, args = {}) {
  const response = await client.callTool({ name, arguments: args }, undefined, {
    timeout: 20_000,
  });
  if (response.isError) throw new Error(JSON.stringify(response.content));
  return JSON.parse(response.content.find((item) => item.type === "text").text);
}
