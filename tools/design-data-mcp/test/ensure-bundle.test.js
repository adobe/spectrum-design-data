// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import test from "ava";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createFreshBundle, generateBundle } from "./helpers/ensure-bundle.js";
import { readCanonical } from "./helpers/stdio-client.js";

test("fresh bundle generation replaces stale content even when a manifest exists", async (t) => {
  const directory = await createFreshBundle();
  t.teardown(() => rmSync(directory, { recursive: true, force: true }));
  const guidelines = join(
    directory,
    "node_modules/@adobe/spectrum-design-data/guidelines",
  );
  writeFileSync(join(guidelines, "manifest.json"), '{"guidelines":[]}');
  writeFileSync(
    join(guidelines, "writing-for-errors.json"),
    '{"name":"stale"}',
  );
  writeFileSync(join(guidelines, "stale-guideline.json"), "{}");
  await generateBundle(directory);
  t.false(existsSync(join(guidelines, "stale-guideline.json")));
  for (const file of ["manifest.json", "writing-for-errors.json"]) {
    t.deepEqual(
      JSON.parse(readFileSync(join(guidelines, file), "utf8")),
      readCanonical(file),
    );
  }
});

test("fresh bundles have independent directories", async (t) => {
  const directories = [];
  t.teardown(() =>
    directories.forEach((directory) =>
      rmSync(directory, { recursive: true, force: true }),
    ),
  );
  directories.push(await createFreshBundle());
  directories.push(await createFreshBundle());
  t.not(directories[0], directories[1]);
});

test("generation rejects output outside the package dist directory before deleting anything", async (t) => {
  await t.throwsAsync(
    () => generateBundle(new URL("../", import.meta.url).pathname),
    {
      message: /non-symlink child/,
    },
  );
});
