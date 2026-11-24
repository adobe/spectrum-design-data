// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// The explorer has no JavaScript painter: it places the engine's SVG (`scene.svg`). The ring,
// box and image drawing parity is engine.test.mjs (Engine.svg equals `design-data render`).
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";

const assets = new URL("../../plugins/site/assets/", import.meta.url);
const sources = readdirSync(assets)
  .filter((f) => /\.(js|html)$/.test(f) && f !== "spectrum-controls.js")
  .map((f) => [f, readFileSync(new URL(f, assets), "utf8")]);

describe("the explorer paints no SVG of its own", () => {
  it("draw-helpers.js is gone", () =>
    assert.equal(existsSync(new URL("draw-helpers.js", assets)), false));

  it("no drawing of scene nodes", () => {
    for (const [f, src] of sources)
      for (const re of [
        /\bnodeSvg\b|\bboxSvg\b|\bprogressSvg\b|\biconSvg\b|\broundedPath\b/,
        /<(rect|circle|path|text)\b[^>]*\$\{\s*n\.(x|fill|stroke|font_size)/,
        /\.nodes\s*\.\s*(?:map|flatMap|forEach)\([^;\n]*(?:Svg|paint|draw)/i,
        // Whatever it is called: a node-taking function that returns a shape, or a
        // node field spliced into markup.
        /\b(?:paint|draw|render)\w*(?:Node|Nodes|Scene)\b/i,
        /\b(?:n|node)\)?\s*=>\s*[`"'(]*\s*<(?:rect|circle|ellipse|path|text|image|line|polygon|g)\b/,
        /function\s*\w*\s*\(\s*(?:n|node)\b[^)]*\)\s*\{[^}]*<(?:rect|circle|ellipse|path|text|image|line|polygon|g)\b/,
        /\$\{[^}]*\b(?:n|node)\.[a-z_]+/,
      ])
        assert.doesNotMatch(src, re, `${f} paints scene nodes`);
  });

  it("backend.js hands the page the engine's svg", () => {
    const b = sources.find(([f]) => f === "backend.js")[1];
    assert.match(b, /defineProperty\(scene, "svg"[\s\S]*?engine\.svg\(/);
  });
});
