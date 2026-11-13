// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Pack the package and check the tarball: every `files` / `exports` target exists, the wasm
// is valid, and the engine renders a packed variant. Run after `moon run sdk-wasm-visual:build-package`.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function verifyPackage(directory = packageDirectory) {
  const temporary = mkdtempSync(join(tmpdir(), "design-data-visual-package-"));
  try {
    const packed = join(temporary, "packed");
    mkdirSync(packed);
    execFileSync("pnpm", ["pack", "--pack-destination", packed], {
      cwd: directory,
      stdio: "inherit",
    });
    const tarball = join(packed, readdirSync(packed)[0]);
    execFileSync("tar", ["-xzf", tarball, "-C", temporary]);
    const root = join(temporary, "package");
    const manifest = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    );
    for (const target of ["node", "web"]) {
      for (const file of [
        "design_data_wasm_visual.js",
        "design_data_wasm_visual.d.ts",
        "design_data_wasm_visual_bg.wasm",
        "package.json",
      ]) {
        const content = readFileSync(join(root, "pkg", target, file));
        assert(
          content.length > 0,
          `Empty package artifact: pkg/${target}/${file}`,
        );
        if (file.endsWith(".wasm")) {
          assert(WebAssembly.validate(content), `Invalid wasm: pkg/${target}`);
        }
      }
    }
    assert.equal(manifest.exports["."].node, manifest.main);
    const catalog = JSON.parse(
      readFileSync(join(root, "catalog.json"), "utf8"),
    );
    const withRecipe = catalog.components.filter((c) => c.hasVisual);
    assert(withRecipe.length > 0, "catalog lists no component with a recipe");
    readFileSync(join(root, "OFL-SourceSans3.txt"));
    const { Engine } = createRequire(import.meta.url)(
      join(root, "pkg/node/design_data_wasm_visual.js"),
    );
    const name = withRecipe[0].name;
    const variant = readFileSync(
      join(root, "variants", name, "m-light-desktop.json"),
      "utf8",
    );
    const svg = new Engine(variant).svg(
      JSON.stringify({
        component: name,
        size: "m",
        states: [],
        options: {},
        mode: { colorScheme: "light", scale: "desktop" },
        label: "Label",
      }),
    );
    assert(svg.startsWith("<svg"), `${name} did not render an SVG`);
    return manifest;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = verifyPackage();
  console.log(`✓ ${manifest.name}@${manifest.version} package verified`);
}
