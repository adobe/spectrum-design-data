// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.
import test from "ava";
import { readFile, rm } from "node:fs/promises";
import { createFreshBundle } from "../../design-data-mcp/test/helpers/ensure-bundle.js";
import { connectMcp, callJson, assertCurrentArtifact } from "../src/mcp.js";
import { scenarios, normalize } from "../src/scenarios.js";

let client;
let directory;
test.before(async () => {
  directory = await createFreshBundle();
  client = await connectMcp(directory);
});
test.after.always(async () => {
  await client?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

test("packaged catalog equals the canonical manifest, not a frozen count", async (t) => {
  const manifest = JSON.parse(
    await readFile(
      new URL(
        "../../../packages/design-data/guidelines/manifest.json",
        import.meta.url,
      ),
    ),
  );
  const result = await callJson(client, "design-data-guideline-list");
  t.deepEqual(result.guidelines, manifest.guidelines);
  t.is(result.total, manifest.guidelines.length);
});

test("agent preflight rejects stale content even when its catalog is unchanged", async (t) => {
  await t.notThrowsAsync(() => assertCurrentArtifact(client));
  const fake = {
    callTool: async ({ name }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            name === "design-data-guideline-list"
              ? await callJson(client, name)
              : { name: "stale" },
          ),
        },
      ],
    }),
  };
  await t.throwsAsync(() => assertCurrentArtifact(fake), {
    message: /differs from canonical content/,
  });
});

for (const scenario of scenarios) {
  test(`grounding contract: ${scenario.id}`, async (t) => {
    if (scenario.expectAbstention) {
      const result = await client.callTool({
        name: "design-data-guideline",
        arguments: { id: "zzz-nonexistent-quantum-protocol" },
      });
      t.true(result.isError);
      t.regex(JSON.stringify(result.content), /not found/i);
      return;
    }
    for (const item of scenario.grounding) {
      const result = await callJson(client, item.tool, item.arguments);
      if (
        scenario.id === "container-token-lookup" &&
        item.tool === "design-data-query"
      ) {
        const matches = result.filter(
          (token) => token.raw.name.scaleIndex === 300,
        );
        t.is(matches.length, 1);
        t.deepEqual(matches[0].raw.name, {
          property: "spacing",
          scaleIndex: 300,
        });
        t.is(matches[0].raw.value, "16px");
      }
      if (item.source) t.is(result.sourceUrl, item.source);
      const text = normalize(JSON.stringify(result));
      for (const fact of item.facts) {
        t.true(
          text.includes(normalize(fact)),
          `${item.tool}: missing grounding fact "${fact}"`,
        );
      }
    }
  });
}
