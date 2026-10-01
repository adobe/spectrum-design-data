// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

// Copied into each artifact so ESM imports cannot fall back to workspace packages.
const artifact = new URL("./", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  const result = await nextResolve(specifier, context);
  if (result.url.startsWith("file:") && !result.url.startsWith(artifact)) {
    throw new Error(
      `Import escaped isolated artifact: ${specifier} -> ${result.url}`,
    );
  }
  return result;
}
