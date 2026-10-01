// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { copyFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";

export const bundleDir = fileURLToPath(
  new URL(
    "../../design-data-mcp/dist/design-data-mcp-bundle/",
    import.meta.url,
  ),
);

export async function connectMcp(cwd = bundleDir) {
  for (const file of ["isolation-loader.js", "isolation-require.cjs"]) {
    await copyFile(
      new URL(`../../design-data-mcp/test/helpers/${file}`, import.meta.url),
      join(cwd, file),
    );
  }
  const client = new Client({ name: "hub-mcp-eval", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      "--require",
      join(cwd, "isolation-require.cjs"),
      "--experimental-loader",
      join(cwd, "isolation-loader.js"),
      "src/cli.js",
    ],
    cwd,
    env: { PATH: process.env.PATH, DESIGN_DATA_SKIP_VERSION_CHECK: "1" },
    stderr: "pipe",
  });
  let diagnostics = "";
  transport.stderr?.on("data", (chunk) => {
    diagnostics = (diagnostics + chunk.toString()).slice(-4000);
  });
  try {
    await client.connect(transport);
    return client;
  } catch (error) {
    await transport.close();
    throw new Error(`MCP startup failed: ${error.message}\n${diagnostics}`, {
      cause: error,
    });
  }
}

export async function assertCurrentArtifact(client) {
  const { guidelines } = JSON.parse(
    await readFile(
      new URL(
        "../../../packages/design-data/guidelines/manifest.json",
        import.meta.url,
      ),
    ),
  );
  const catalog = await callJson(client, "design-data-guideline-list");
  if (!isDeepStrictEqual(catalog.guidelines, guidelines)) {
    throw new Error(
      "Packaged guideline catalog differs from the canonical manifest; rebuild the bundle.",
    );
  }
  for (const { slug } of guidelines) {
    const canonical = JSON.parse(
      await readFile(
        new URL(
          `../../../packages/design-data/guidelines/${slug}.json`,
          import.meta.url,
        ),
      ),
    );
    const shipped = await callJson(client, "design-data-guideline", {
      id: slug,
    });
    if (!isDeepStrictEqual(shipped, canonical)) {
      throw new Error(
        `Packaged ${slug} differs from canonical content; rebuild the bundle.`,
      );
    }
  }
}

export async function callJson(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args }, undefined, {
    timeout: 30_000,
  });
  if (result.isError) {
    throw new Error(`MCP ${name} failed: ${JSON.stringify(result.content)}`);
  }
  const text = result.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");
  return JSON.parse(text);
}
