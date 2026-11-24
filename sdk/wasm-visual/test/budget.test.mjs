// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Budgets: the .wasm stays within 535 KB raw and 203 KB gzip, and one scene (JSON in, JSON
// out) solves in under 0.2 ms. Run after `node scripts/build.mjs`; `node --test test/`.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "node:test";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const cli =
  process.env.DESIGN_DATA_CLI ?? join(root, "sdk/target/debug/design-data");
const pkg = "../pkg/node/design_data_wasm_visual";
const wasm = readFileSync(new URL(`${pkg}_bg.wasm`, import.meta.url));
const { Engine } = createRequire(import.meta.url)(`${pkg}.js`);

// Measured 2026-11-23 on main with the pinned toolchain: 570.9 KB raw / 210.0 KB gzip, up
// from 321.6 KB / 123.7 KB at nested recipes (#1703). The growth is solver features (slot
// fills, gradients and ramps, drop shadows, floating parts, images, grid). Per-crate
// opt-levels in scripts/build.mjs (core `z`, serde and hash crates `3`) cut it to 527.8 KB /
// 199.4 KB. The limits keep about 1.4% headroom. Raise them only with the commit that grows
// the engine, and say what grew.
// Dashed and per-side strokes (the stroke geometry and the SVG writer, the prop reader, one
// scene node field) took main's 527.8 KB / 199.8 KB to 538.2 KB / 203.2 KB, so the limits
// rise to 540,000 / 204,500 (about 0.3% headroom: trim before the next feature).
const MAX_RAW = 540_000;
const MAX_GZIP = 204_500;
// A shared CI runner, busy with other moon tasks, measured 0.48 and 0.65 ms where a laptop
// measures 0.15 ms (PR #2124), so CI gets 2 ms: still a failure for a 10x regression, not noise.
const MAX_SCENE_MS = process.env.CI ? 2 : 0.2;

it("the wasm fits its size budget (node and web targets)", () => {
  const web = new URL(
    "../pkg/web/design_data_wasm_visual_bg.wasm",
    import.meta.url,
  );
  if (existsSync(web)) {
    const w = readFileSync(web);
    const g = gzipSync(w, { level: 9 }).length;
    console.log(`web wasm ${w.length} B raw, ${g} B gzip`);
    assert.ok(w.length <= MAX_RAW && g <= MAX_GZIP, "web wasm over budget");
  }
  const gzip = gzipSync(wasm, { level: 9 }).length;
  console.log(`wasm ${wasm.length} B raw, ${gzip} B gzip`);
  assert.ok(wasm.length <= MAX_RAW, `${wasm.length} B raw > ${MAX_RAW}`);
  assert.ok(gzip <= MAX_GZIP, `${gzip} B gzip > ${MAX_GZIP}`);
});

it("a scene solves within its latency budget", () => {
  const out = mkdtempSync(join(tmpdir(), "slim-budget-"));
  execFileSync(cli, ["site", "--data-only", "--out", out], {
    cwd: root,
    stdio: "ignore",
  });
  const engine = new Engine(
    readFileSync(join(out, "variants/button/m-light-desktop.json"), "utf8"),
  );
  const requests = [
    {},
    { icon: { set: "workflow", name: "edit" } },
    { states: ["hover"], label: "A longer label" },
  ].map((r) =>
    JSON.stringify({
      component: "button",
      size: "m",
      mode: { colorScheme: "light", scale: "desktop" },
      label: "Label",
      ...r,
    }),
  );
  for (let i = 0; i < 300; i++) for (const r of requests) engine.scene(r);
  // The fastest of several batches, so a noisy CI neighbor does not fail the budget.
  const runs = Array.from({ length: 5 }, () => {
    const start = process.hrtime.bigint();
    for (let i = 0; i < 300; i++) for (const r of requests) engine.scene(r);
    return (
      Number(process.hrtime.bigint() - start) / 1e6 / (300 * requests.length)
    );
  });
  const best = Math.min(...runs);
  console.log(`scene ${best.toFixed(4)} ms`);
  assert.ok(best < MAX_SCENE_MS, `${best} ms >= ${MAX_SCENE_MS}`);
});
