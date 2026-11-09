// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Byte equality: Engine.svg (and scene) over one precompiled variant equals `design-data
// render` for a matrix of requests. Needs the CLI (default sdk/target/debug/design-data, or
// DESIGN_DATA_CLI) and `node scripts/build.mjs`; run with `node --test test/`.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, describe, it } from "node:test";
import {
  PLATFORMS,
  assemble,
  buildSites,
  buildStates,
  cliRender,
  readVariant,
  requestFor,
  run,
  variantKey,
} from "../shared/matrix.mjs";

const { Engine } = createRequire(import.meta.url)(
  "../pkg/node/design_data_wasm_visual.js",
);

const dir = mkdtempSync(join(tmpdir(), "slim-engine-"));
let sites;
let states; // [{ id, platform, site, request }]

describe("Engine equals design-data render", () => {
  let cliOut; // id -> { svg, scene, component }

  before(() => {
    sites = buildSites(dir);
    states = buildStates(sites);
    cliOut = cliRender(dir, states);
  });

  it("covers the whole matrix", () => {
    assert.ok(states.length > 250, `${states.length} states`);
    for (const platform of Object.keys(PLATFORMS))
      for (const site of PLATFORMS[platform])
        assert.ok(
          states.some((s) => s.platform === platform && s.site === site),
        );
    assert.ok(states.some((s) => s.request.icon === "none"));
    assert.ok(states.some((s) => s.metrics));
  });

  it("svg and scene match the CLI byte for byte, from a variant file or a whole recipe", () => {
    const whole = {};
    for (const s of states) {
      const want = cliOut.get(s.id);
      const key = variantKey(s);
      whole[`${s.platform}/${s.site}`] ??= JSON.stringify(
        assemble(sites, s.platform, s.site),
      );
      const req = JSON.stringify(requestFor(s, want.component));
      for (const [how, engine] of [
        ["new", new Engine(readVariant(sites, s.platform, s.site, key))],
        [
          "fromCompiled",
          Engine.fromCompiled(whole[`${s.platform}/${s.site}`], key),
        ],
      ]) {
        assert.equal(engine.svg(req), want.svg, `${s.id} (${how})`);
        assert.deepEqual(
          JSON.parse(engine.scene(req)),
          want.scene,
          `${s.id} scene (${how})`,
        );
        engine.free();
      }
    }
  });

  it("wraps a badge label over several text nodes and grows the badge", () => {
    const scene = (tag) =>
      cliOut.get(
        states.find(
          (s) =>
            s.platform === "foundation" &&
            s.site === "badge" &&
            s.id.endsWith(`-${tag}`),
        ).id,
      ).scene;
    const text = (tag) => scene(tag).nodes.filter((n) => n.kind === "text");
    assert.equal(text("default").length, 1);
    const wrapped = text("wrap");
    assert.ok(wrapped.length > 1, `${wrapped.length} lines`);
    assert.ok(wrapped.every((n) => n.part === "label"));
    assert.ok(scene("wrap").nodes[0].h > scene("default").nodes[0].h);
  });

  it("draws the nested action button and switch of an accordion from one variant", () => {
    const { nodes, diagnostics } = cliOut.get(
      "foundation-accordion-m-light-desktop-direct-actions",
    ).scene;
    const parts = nodes.map((n) => n.part);
    for (const part of [
      "direct-actions",
      "action-button",
      "action-button.icon",
      "switch",
      "switch.track",
      "switch.handle",
    ])
      assert.ok(parts.includes(part), part);
    assert.deepEqual(diagnostics, []);
    const box = (part) => nodes.find((n) => n.part === part);
    // The nested root keeps the host part id and bounds its namespaced parts.
    const [button, icon] = [box("action-button"), box("action-button.icon")];
    assert.ok(icon.x >= button.x && icon.x + icon.w <= button.x + button.w);
  });

  it("anchors on the single `render` command", () => {
    const file = join(dir, "single.svg");
    run(
      "render",
      "--platform",
      "ios",
      "button",
      "--size",
      "m",
      "--icon",
      "workflow:edit",
      "--output",
      file,
    );
    assert.equal(
      readFileSync(file, "utf8"),
      cliOut.get("ios-button-m-light-desktop-icon-edit").svg,
    );
  });

  it("applies the icon override in solve", () => {
    const svg = (tag) =>
      cliOut.get(`foundation-button-m-light-desktop-${tag}`).svg;
    assert.notEqual(svg("icon-edit"), svg("default"));
    assert.notEqual(svg("icon-none"), svg("default"));
    const miss = cliOut.get(
      "foundation-button-m-light-desktop-icon-unknown",
    ).scene;
    assert.deepEqual(miss.diagnostics, [
      "icon workflow:nope has no drawing for size 'm'; drawing a placeholder",
    ]);
  });

  it("rejects an unknown variant key and a malformed variant", () => {
    const c = JSON.stringify(assemble(sites, "foundation", "button"));
    assert.throws(() => Engine.fromCompiled(c, "zz|light|desktop"));
    assert.throws(() => new Engine("{}"));
  });
});
