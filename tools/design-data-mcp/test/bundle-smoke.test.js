// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import test from "ava";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createFreshBundle } from "./helpers/ensure-bundle.js";
import {
  callJson,
  connectArtifact,
  readCanonical,
} from "./helpers/stdio-client.js";

test.before(async (t) => {
  t.context.directory = await createFreshBundle();
  const connection = await connectArtifact(t.context.directory, "src/cli.js");
  Object.assign(t.context, connection);
});

test.after.always(async (t) => {
  await t.context.client?.close();
  if (t.context.directory)
    rmSync(t.context.directory, { recursive: true, force: true });
});

test.serial(
  "fresh isolated bundle initializes offline and advertises its manifest tools",
  async (t) => {
    const { client, directory, stderr } = t.context;
    const manifest = JSON.parse(
      readFileSync(join(directory, "manifest.json"), "utf8"),
    );
    t.is(client.getServerVersion().name, "design-data");
    t.is(client.getServerVersion().version, manifest.version);
    const { tools } = await client.listTools();
    t.deepEqual(
      tools.map(({ name, description }) => ({ name, description })),
      manifest.tools,
    );
    t.false(stderr().includes("Cannot find module"), stderr());
  },
);

test.serial(
  "guideline tools return the canonical catalog, not a frozen count",
  async (t) => {
    const { guidelines, total } = await callJson(
      t.context.client,
      "design-data-guideline-list",
    );
    const expected = readCanonical("manifest.json").guidelines;
    t.deepEqual(guidelines, expected);
    t.is(total, expected.length);
    const category = "designing";
    const filtered = await callJson(
      t.context.client,
      "design-data-guideline-list",
      { category },
    );
    t.deepEqual(
      filtered.guidelines,
      expected.filter((entry) => entry.category === category),
    );
    t.is(filtered.total, filtered.guidelines.length);
  },
);

test.serial(
  "every shipped guideline equals current source JSON over stdio",
  async (t) => {
    for (const { slug } of readCanonical("manifest.json").guidelines) {
      const document = await callJson(
        t.context.client,
        "design-data-guideline",
        { id: slug },
      );
      t.deepEqual(document, readCanonical(`${slug}.json`), slug);
    }
  },
);

test.serial(
  "invalid and unknown guideline slugs produce MCP tool errors",
  async (t) => {
    for (const id of ["../writing-for-errors", "zzz-nonexistent-guideline"]) {
      const result = await t.context.client.callTool({
        name: "design-data-guideline",
        arguments: { id },
      });
      t.true(result.isError, id);
      t.regex(result.content[0].text, /invalid|not found|unknown/i);
    }
  },
);
