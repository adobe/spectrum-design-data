// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

const Module = require("node:module");
const { isAbsolute, relative } = require("node:path");
const originalResolve = Module._resolveFilename;
const artifact = process.cwd();

// Cover createRequire and the CommonJS WASM wrapper as well as ESM imports.
Module._resolveFilename = function (...args) {
  const filename = originalResolve.apply(this, args);
  if (isAbsolute(filename) && relative(artifact, filename).startsWith("..")) {
    throw new Error(
      `Require escaped isolated artifact: ${args[0]} -> ${filename}`,
    );
  }
  return filename;
};
