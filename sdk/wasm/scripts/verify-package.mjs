// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function exportPaths(value) {
  if (typeof value === "string") return [value];
  return Object.values(value).flatMap(exportPaths);
}

export function validatePackedPackage(directory) {
  const manifest = JSON.parse(
    readFileSync(join(directory, "package.json"), "utf8"),
  );
  const files = new Set([
    ...["node", "web"].flatMap((target) => [
      `pkg/${target}/design_data_wasm.js`,
      `pkg/${target}/design_data_wasm.d.ts`,
      `pkg/${target}/design_data_wasm_bg.wasm`,
      `pkg/${target}/design_data_wasm_bg.wasm.d.ts`,
      `pkg/${target}/package.json`,
    ]),
    ...manifest.files.filter((file) => file.startsWith("pkg/")),
    manifest.main,
    manifest.types,
    ...exportPaths(manifest.exports),
  ]);
  for (const file of files) {
    const content = readFileSync(join(directory, file));
    assert(content.length > 0, `Empty package artifact: ${file}`);
    if (file.endsWith(".wasm")) {
      assert(
        content.subarray(0, 4).equals(Buffer.from([0, 97, 115, 109])),
        `Invalid wasm header: ${file}`,
      );
      assert(WebAssembly.validate(content), `Invalid wasm binary: ${file}`);
    }
  }
  for (const [target, type] of [
    ["node", "commonjs"],
    ["web", "module"],
  ]) {
    const nested = JSON.parse(
      readFileSync(join(directory, "pkg", target, "package.json"), "utf8"),
    );
    assert.equal(
      nested.type ?? "commonjs",
      type,
      `Incorrect ${target} module type`,
    );
  }
  assert.equal(manifest.exports["."].node, manifest.main);
  assert.equal(manifest.exports["."].browser, "./pkg/web/design_data_wasm.js");
  assert.equal(manifest.exports["."].default, manifest.exports["."].browser);
  return manifest;
}

export function verifyPackage(directory = packageDirectory) {
  const temporary = mkdtempSync(join(tmpdir(), "design-data-wasm-package-"));
  try {
    const packed = join(temporary, "packed");
    mkdirSync(packed);
    execFileSync("pnpm", ["pack", "--pack-destination", packed], {
      cwd: directory,
      stdio: "inherit",
    });
    const tarballs = readdirSync(packed).filter((file) =>
      file.endsWith(".tgz"),
    );
    assert.equal(tarballs.length, 1, "Expected exactly one packed tarball");
    const tarball = join(packed, tarballs[0]);
    execFileSync("tar", ["-xzf", tarball, "-C", packed]);
    const manifest = validatePackedPackage(join(packed, "package"));
    const consumer = join(temporary, "consumer");
    mkdirSync(consumer);
    writeFileSync(
      join(consumer, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
        packageManager: "pnpm@10.17.1",
      }),
    );
    execFileSync("pnpm", ["add", "--ignore-scripts", tarball], {
      cwd: consumer,
      stdio: "inherit",
    });
    const installed = join(
      consumer,
      "node_modules",
      ...manifest.name.split("/"),
    );
    const installedManifest = validatePackedPackage(installed);
    for (const target of ["node", "web"]) {
      const entry =
        target === "node"
          ? manifest.name
          : pathToFileURL(
              join(installed, installedManifest.exports["."].browser),
            ).href;
      const smoke = `
        import assert from 'node:assert/strict';
        import { readFileSync } from 'node:fs';
        import * as wasm from ${JSON.stringify(entry)};
        ${target === "web" ? `await wasm.default({ module_or_path: readFileSync(${JSON.stringify(join(installed, "pkg/web/design_data_wasm_bg.wasm"))}) });` : ""}
        const dataset = wasm.Dataset.embedded();
        try {
          const tokens = dataset.query('');
          assert(Array.isArray(tokens) && tokens.length > 0, 'Embedded token query returned no tokens');
        } finally {
          dataset.free();
        }
      `;
      const script = join(consumer, `${target}-smoke.mjs`);
      writeFileSync(script, smoke);
      execFileSync(process.execPath, [script], {
        cwd: consumer,
        stdio: "inherit",
      });
      console.log(`Verified installed ${target} wasm runtime`);
    }
    console.log(
      "Verified wasm tarball artifacts, exports, and isolated consumers",
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  verifyPackage();
}
