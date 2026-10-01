// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import { sep } from "node:path";
import { pathToFileURL } from "node:url";

// The server starts in the artifact; the guard can live outside its staging tree.
const artifact = pathToFileURL(`${process.cwd()}${sep}`).href;

export async function resolve(specifier, context, nextResolve) {
  const result = await nextResolve(specifier, context);
  if (result.url.startsWith("file:") && !result.url.startsWith(artifact)) {
    throw new Error(
      `Import escaped isolated artifact: ${specifier} -> ${result.url}`,
    );
  }
  return result;
}
