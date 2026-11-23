// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// The explorer paints a progress-circle's track (a stroked box) and fill (a progress arc) with
// draw-helpers.js. Both must be one ring: the same center radius and stroke width, as the native
// SVG draws them. Needs the CLI (default sdk/target/debug/design-data, or DESIGN_DATA_CLI).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { run } from "../shared/matrix.mjs";
import { boxSvg, progressSvg } from "../../plugins/site/assets/draw-helpers.js";

const render = (size, format, ...extra) =>
  run(
    "render",
    "progress-circle",
    "--size",
    size,
    "--format",
    format,
    ...extra,
  ).toString();
const num = (s, re) => Number(s.match(re)[1]);

describe("progress-circle track and fill are one ring in the explorer", () => {
  for (const size of ["s", "m", "l"])
    for (const options of [
      ["--option", "value=50"],
      ["--option", "isIndeterminate=true"],
    ])
      it(`${size} ${options[1]}`, () => {
        const scene = JSON.parse(render(size, "scene", ...options));
        const track = scene.nodes.find((n) => n.part === "track");
        const fill = scene.nodes.find((n) => n.part === "fill");
        const ring = progressSvg(fill);
        const r = num(ring, /<circle[^>]* r="([\d.]+)"/);
        const sw = num(ring, /stroke-width="([\d.]+)"/);
        assert.equal(sw, track.stroke_width);
        assert.equal(sw, fill.stroke_width);
        // The track is the stroked rect's center line: half the inset rect's width.
        const box = boxSvg(track);
        const rect = box.match(/<rect[^>]*stroke=[^>]*>/)[0];
        assert.equal(num(rect, /width="([\d.]+)"/) / 2, r);
        assert.equal(num(rect, /rx="([\d.]+)"/), r);
        assert.equal(num(rect, /x="([\d.]+)"/) + r, fill.x + fill.w / 2);
        // And the native SVG draws the same ring.
        const native = render(size, "svg", ...options);
        assert.equal(num(native, /<circle[^>]* r="([\d.]+)"/), r);
        assert.equal(num(native, /<g [^>]*stroke-width="([\d.]+)"/), sw);
      });
});
