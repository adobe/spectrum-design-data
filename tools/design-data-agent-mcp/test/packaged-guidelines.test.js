// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import test from "ava";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createFreshBundle } from "../../design-data-mcp/test/helpers/ensure-bundle.js";
import {
  callJson,
  connectArtifact,
  readCanonical,
} from "../../design-data-mcp/test/helpers/stdio-client.js";

const execFileAsync = promisify(execFile);
const packageDir = fileURLToPath(new URL("../", import.meta.url));

test.before(async (t) => {
  // Both servers declare the same runtime dependencies. Reuse the MCPB vendoring
  // allowlists, but execute the agent's actual pnpm-pack artifact, not its workspace src.
  const directory = await createFreshBundle();
  t.context.directory = directory;
  const tarball = join(directory, "agent.tgz");
  await execFileAsync("pnpm", ["pack", "--out", tarball], {
    cwd: packageDir,
    timeout: 120_000,
  });
  const agent = join(directory, "node_modules/@adobe/design-data-agent-mcp");
  mkdirSync(agent, { recursive: true });
  await execFileAsync("tar", [
    "-xzf",
    tarball,
    "--strip-components=1",
    "-C",
    agent,
  ]);
  rmSync(tarball, { force: true });
  const pkg = JSON.parse(readFileSync(join(agent, "package.json"), "utf8"));
  const bundleDeps = JSON.parse(
    readFileSync(
      new URL("../../design-data-mcp/package.json", import.meta.url),
      "utf8",
    ),
  ).dependencies;
  const sourceDeps = JSON.parse(
    readFileSync(join(packageDir, "package.json"), "utf8"),
  ).dependencies;
  assert.deepEqual(
    sourceDeps,
    bundleDeps,
    "Update vendoring if agent dependencies diverge",
  );
  assert.deepEqual(
    pkg.dependencies,
    Object.fromEntries(
      Object.entries(bundleDeps).map(([name, range]) => [
        name,
        range.startsWith("workspace:")
          ? JSON.parse(
              readFileSync(
                join(directory, "node_modules", name, "package.json"),
                "utf8",
              ),
            ).version
          : range,
      ]),
    ),
  );
  const connection = await connectArtifact(
    directory,
    "node_modules/@adobe/design-data-agent-mcp/src/index.js",
  );
  Object.assign(t.context, connection);
});

test.after.always(async (t) => {
  await t.context.client?.close();
  if (t.context.directory)
    rmSync(t.context.directory, { recursive: true, force: true });
});

test.serial(
  "packed agent initializes and advertises guideline tools over stdio",
  async (t) => {
    t.is(t.context.client.getServerVersion().name, "design-data-agent-mcp");
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    );
    t.is(t.context.client.getServerVersion().version, pkg.version);
    const { tools } = await t.context.client.listTools();
    for (const name of ["list_guidelines", "describe_guideline"]) {
      t.true(
        tools.some((tool) => tool.name === name),
        name,
      );
    }
    t.false(
      t.context.stderr().includes("Cannot find module"),
      t.context.stderr(),
    );
  },
);

test.serial(
  "packed agent catalog equals the current canonical manifest",
  async (t) => {
    const expected = readCanonical("manifest.json").guidelines;
    t.deepEqual(await callJson(t.context.client, "list_guidelines"), expected);
    t.deepEqual(
      await callJson(t.context.client, "list_guidelines", {
        category: "designing",
      }),
      expected.filter((entry) => entry.category === "designing"),
    );
  },
);

test.serial(
  "packed agent serves every current guideline without stale content",
  async (t) => {
    for (const { slug } of readCanonical("manifest.json").guidelines) {
      t.deepEqual(
        await callJson(t.context.client, "describe_guideline", { id: slug }),
        readCanonical(`${slug}.json`),
        slug,
      );
    }
  },
);

test.serial(
  "packed agent returns tool errors for invalid and unknown slugs",
  async (t) => {
    for (const id of ["../writing-for-errors", "zzz-nonexistent-guideline"]) {
      const result = await t.context.client.callTool({
        name: "describe_guideline",
        arguments: { id },
      });
      t.true(result.isError, id);
      t.regex(result.content[0].text, /invalid|not found|unknown/i);
    }
  },
);
