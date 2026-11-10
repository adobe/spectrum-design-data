<!-- Copyright 2026 Adobe. All rights reserved. -->

# Proposal 015: One visual layout engine (Rust solve, slim WASM in the browser)

**Status:** Accepted 2026-11-07 (Option A, merged in [#1683](https://github.com/adobe/spectrum-design-data/issues/1683)). No engine swap, no schema or recipe change comes with this document; the work is tracked as beads `hck9.5` to `hck9.8`, `hck9.10` and `hck9.11`.\
**Affects:** `sdk/core/src/visual.rs`, `sdk/plugins/site/assets/visual-runtime.js`, `sdk/wasm/test/visual-runtime-*.test.js`, a new slim WASM target\
**Bead:** `spectrum-design-data-hck9`. Waiting on this decision: `qkj5.133` (label width), `qkj5.13` (wrapping), `p6ga.8.76` (nested recipes), `p6ga.8.77` (fill width), `p6ga.11.3` (accordion container).\
**Prototype:** branch `spike/hck9-single-engine` (not merged): `sdk/spikes/hck9-slim-engine` (slim WASM crate), `sdk/spikes/hck9-measure` (measurement scripts), `CompiledVariant::from_compiled` and a table-driven `text_width_w` in `sdk/core/src/visual.rs`.

## Recommendation

**Choose A, in steps, and start with text measurement, which is independent of the swap.**

1. Both revisit triggers from the 2026-10-30 spike are now met: real font measurement has landed as a need (`qkj5.133`), and three layout features are queued that would each be written twice (wrapping, nested recipes, fill width).
2. The 2026-10-30 worry was that real measurement "forces a JS measurer callback anyway", so the engines could never agree on text width. The spike shows it does not. A per-font **advance + pair-kerning table** (data, not code) reproduces Chrome's `measureText` to 0.04 % and matches React Spectrum S2's label widths to 0.014 px. The same table can be read by Rust, WASM and JS, so the CLI and the browser produce the same number. A canvas callback becomes an optional override, not a requirement (option C is therefore not needed).
3. The slim WASM is 294 KB raw / 119 KB gzip / 94 KB brotli with the table embedded (about 238 KB raw without it), against a 33 KB / 10 KB JS runtime. That is small next to the 7.6 MB / 397 KB gzip `data.json` the explorer already fetches. Per scene it costs 0.11 ms against 0.02 ms for JS, which is invisible to the user.
4. The risk is **licensing, not engineering**, and it is narrow. The only table that matches S2 is measured from Adobe Clean Spectrum VF, and spec R2 says that font cannot be redistributed in this repository. The explorer, the spec-sheet pages and the docs site already load that font from the Adobe Fonts kit `flz1ovt` (`sdk/plugins/site/assets/index.html:6`), so the answer is to **generate the table from the kit when needed and never commit it**; the committed default is an OFL table. See [Decision needed](#decision-needed). Step 1a is safe either way.
5. Deleting `visual-runtime.js` also affects the spec-sheet pages (`docs/hub-prototype/specs/specs.js:7` imports `renderSvg` from it). The plan has a step for that ([Migration](#4-migration-if-a)).

If the owner picks B instead, the cost is in [Option B](#option-b-keep-the-js-copy). It is real but not catastrophic: about 15 to 25 % extra code per feature plus a duplicated test file.

## Decision needed

Two separate needs, and the Adobe Fonts kit covers one of them:

* **Drawing the text.** Solved. The browser gets Adobe Clean from the kit under the Adobe Fonts licence, and nothing is copied into the repo.
* **Measuring the text for layout.** The kit only helps where there is a browser: `canvas.measureText` is exact there. The Rust CLI (spec sheets, `render-compare`, Figma payloads, goldens) has no browser, so it needs a table of advance widths and kerning. That is why option C (a measure callback) was rejected: the CLI cannot call it and would get a different number.

The way to use the kit for both: **build the table from the kit instead of committing it.** `sdk/spikes/hck9-measure/kern.mjs` already does this (loads the kit in headless Chrome, measures each character and pair). Turn it into a `text-metrics` adapter in `tools/platform-capture` that writes the table to a git-ignored cache. The CLI, the slim WASM and the site read it through a `--text-metrics <file>` override. The committed default stays the Source Sans 3 (OFL) table.

| Choice                                                                                                                                                          | Matches S2 label width?                                                                                  | Licensing                                                                                                                                                                                                                                           | Repo cost                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1. Table measured from Adobe Clean Spectrum VF, committed                                                                                                       | Yes, 0.014 px                                                                                            | Conflicts with spec R2 as written                                                                                                                                                                                                                   | 56 KB JSON (24 KB gzip) for wght 400/700 |
| 2. Table measured from Source Sans 3 (SIL OFL), committed, no override                                                                                          | No. About 4 % (up to 6.6 %) wider than S2, so "Test" at M is 25.25 vs 23.69, outside the ±1 px tolerance | None. This is the table R2 already describes as "a width table for the fallback font", which was never built                                                                                                                                        | 21 KB JSON                               |
| 3. **Recommended.** Choice 2 committed as the default, plus `--text-metrics <file>`, with the Adobe Clean table generated from the kit into a git-ignored cache | Yes, when the generated file is supplied                                                                 | Nothing derived from the font is committed; the font is used only through its web-kit licence. What is left to confirm (quickly, with legal) is whether widths cached locally, or shipped in the internal explorer build, count as ordinary kit use | 21 KB plus a loader and the generator    |

What choice 3 means in practice:

* **Goldens and CI never depend on the kit.** The kit needs the network and Adobe can update the font, which would change goldens. CI and goldens use the committed OFL table. The kit-generated table is for `render-compare` against S2 and for the deployed explorer. Goldens change when step 1a lands (labels go from 7 to 9 % too wide to about 4 to 6.6 % too wide for button against S2) and change again if the default table ever changes.
* **The CLI and the site agree only when both read the same file.** The site must fetch the same table the CLI was given; a site on the OFL default next to a CLI on the kit table will differ by that 4 to 6.6 %. A different file is the one way the "CLI == browser" result stops holding.
* **Make a font update visible.** Stamp the generated table with its generation date and the measured width of "Test" at weight 700, and have `render-compare` print that stamp.
* **The deployed explorer needs the table at deploy time.** `hub-prototype:build` would run the generator (network and VPN) and ship the table next to the `.wasm`; otherwise the site falls back to the OFL table. The kit loads from all the places that matter, checked on 2026-11-07: a GitHub `ubuntu-latest` runner (the font file returned 200 with no `Referer`, with `localhost` and with `example.com`, and the preinstalled headless Chrome loaded `adobe-clean-spectrum-vf` and measured "Test" at 700 14px as 23.665 px), a local headless Chrome (23.673 px), and the deployed explorer on the `adt` host, which draws Adobe Clean. So generation is not limited to local and deploy time: a CI job can run it. Goldens still stay on the committed OFL table, and the Linux and macOS widths differ by 0.008 px (0.03 %), which is one more reason a generated table cannot feed goldens. Not checked: canvas measurement on the `adt` page itself (the glyphs load there, so it should work).
* Source Sans 3 is also what a browser without the kit falls back to, so on the OFL default the layout matches what such a viewer sees.

## Background

* `sdk/core/src/visual.rs` (4.6 k lines) compiles a recipe against the token graph (`compile_recipe`, `compile_variant`) and lays it out (`solve`, pure and graph-free after hck9.1). The CLI, spec sheets, `render-compare` and the Figma payloads call it.
* `sdk/plugins/site/assets/visual-runtime.js` (973 lines) is a hand copy of `solve` and `scene_to_svg`. The explorer (`backend.js`) imports it and gets `data.json` with every recipe pre-compiled (`compile_recipe` output). `sdk/wasm/test/visual-runtime-parity.test.js`, `parity.test.js` and the 21 golden SVGs in `visual-golden/` catch drift.
* The spec-sheet pages (`docs/hub-prototype/specs/specs.js:7`) also import `renderSvg` (the `scene_to_svg` mirror) from `visual-runtime.js`, and `docs/hub-prototype/build.mjs:84-85` copies it into `dist/specs/`. The site is not published from CI. `docs/hub-prototype/build.mjs` (`moon run hub-prototype:build`) builds the CLI, writes `dist/<platform>/` and the owner deploys it with `adt deploy`. Its README states "no WASM at runtime" as a property, which this proposal would change.
* Text width today is `chars * font_size * 0.46` (`AVG_ADVANCE_EM`, `visual.rs:27`, mirrored in JS). Widths are independent of weight and of the actual letters.

## 1. Text measurement

### What the real widths are

I measured the button label "Test" (weight 700, sizes 12/14/16/18 for S/M/L/XL) in headless Chrome, with the Adobe Fonts kit that `tools/platform-capture/lib/rasterize` already uses (`flz1ovt`, family `adobe-clean-spectrum-vf`) and with Source Sans 3 loaded from `@fontsource-variable/source-sans-3` (OFL). Script: `sdk/spikes/hck9-measure/measure.mjs`.

| Size    | S2 measured (`run2/rsp/measured.json`) | Adobe Clean Spectrum VF in Chrome | Source Sans 3 in Chrome | Today's estimate | Prototype table (CLI) |
| ------- | -------------------------------------- | --------------------------------- | ----------------------- | ---------------- | --------------------- |
| S (12)  | 20.297                                 | 20.291 (canvas), 20.297 (DOM)     | 21.639                  | 22.08            | 20.292                |
| M (14)  | 23.688                                 | 23.673, 23.688                    | 25.246                  | 25.76            | 23.674                |
| L (16)  | 27.063                                 | 27.054, 27.063                    | 28.852                  | 29.44            | 27.056                |
| XL (18) | 30.438                                 | 30.436, 30.438                    | 32.459                  | 33.12            | 30.438                |

* **S2 uses `adobe-clean-spectrum-vf`.** Its DOM widths equal Chrome's width for that family to the third decimal. The 7 to 9 % gap in `qkj5.133` is the flat 0.46 em estimate ("Test" is 1.691 em in Clean, 1.84 in the estimate), not a data error.
* The static `adobe-clean` family is not S2's font (1.741 em), and the generic `sans-serif` fallback is 1.98 em. Source Sans 3 is 1.803 em, +6.6 % at weight 700. Mean over eleven button-like strings: Source Sans 3 is +4.2 % wide (range +1.1 to +6.6) at 700 and +2.9 % at 400; the flat estimate averages +0.4 % but ranges from -6.4 to +8.8 % at 700 and up to +15 % at 400, so a near-zero mean hides errors of several percent on individual labels.
* The Adobe Clean files in `~/Library/Fonts` are root-owned mode 700 and the static family, so a local font-file measurement of the right font is not possible on this machine (same finding as `p6ga.8.80`). Nothing in the repo vendors a font.

### How the CLI measures

A measurement table is enough; no font parser or shaper is needed:

* `advance[c]` for printable ASCII per weight, in 1/1000 em, plus `kern["ab"]` for pairs. Sum advances and add kerning between neighbours. Measured with canvas at 1000 px so the numbers are integer-friendly.
* Kerning matters. Without it "Test" is 1.7575 em against 1.6909 real (+3.9 %, 0.93 px at 14), and advance-only sums are +0.4 % mean for Adobe Clean at 700 but 3.9 % worst case (5.3 % for Source Sans 3). With pair kerning the error against Chrome over eleven strings (including `WAVE Typography AVATAR To Yo`) is 0.002 % mean, 0.04 % worst case (`kern.mjs`). The same method on Source Sans 3 gives 0.016 % worst case.
* Size: Adobe Clean wght 400 + 700 is 56 KB raw / 24 KB gzip (3.4 k kern pairs); Source Sans 3 is 21 KB raw (885 pairs). Linear interpolation for 500/600 is within 0.27 %; 800 clamps to 700 and is 1.9 % off (2.5 % worst), so a third table is needed only when a recipe uses weight 800 (headings). The table sums reproduce S2 label widths: the prototype renders S/M/L/XL "Test" within 0.014 px (table above).
* Not covered: non-ASCII (falls back to 0.46 em), italics, other families, ligatures and contextual alternates, text with explicit `letter-spacing`. A prototype run of all 60 button states against `~/Spectrum/platform-compare/rsp-button/run2` with the table: label width differences 60 to 0, total differences 272 to 212. The 212 left are padding and gap (container paddingLeft 12 vs 16 and the like), tracked on other beads, and are not text related.

### How the browser measures

Three ways, in increasing risk:

1. **Same table in WASM (Option A) or JS (Option B).** Identical to the CLI by construction. Verified: the slim WASM's SVG for button/m/light/desktop/"Test" is **byte-identical** to `design-data render` (checked in Chrome, `bench.mjs`).
2. **`canvas.measureText` through a callback (Option C).** Exact for whatever font the browser really has, so the viewer's layout always matches the glyphs it draws. But it needs the font loaded before layout (`document.fonts.load`), makes scenes depend on the viewer, and makes CLI and site disagree by design when the viewer lacks Adobe Clean. Chrome's canvas and DOM widths agree within 0.015 px (above), so canvas is a faithful oracle, not a different answer. I do not recommend it as the default.
3. **Divergence between 1 and 2 for Adobe Clean:** 0.04 % at most (0.01 px at 14 px). For Source Sans 3 when a viewer has no kit: the table equals Source Sans 3 within 0.016 %, but the glyphs rendered for an Adobe Clean table with a Source Sans fallback are about 4 % off. R2 already accepts that ("overlay positions may differ slightly from the viewer's font").

## 2. Wrapping

What a line-breaking, min-height layout needs, and why it is cheaper written once:

* **A width constraint.** Today every box hugs its content (`solve` computes `c.w` from the text, `visual.rs:2174`). Wrapping needs an available width first, from a root `width`/`maxWidth`/fill (that is `p6ga.8.77`). So the layout becomes two-pass: resolve the constraint, then measure under it. This is the real change; it touches the row/column flow in both engines.
* **A greedy breaker.** Break opportunities after a space and after a hyphen; per word width from the table; line count = greedy fill. Prototype in `wrap.mjs` over six labels, three sizes, two weights and seven widths: **252 of 252 line counts equal Chrome's** (the first version, which split only on spaces, failed five cases, all on a hyphenated word). About 30 lines in Rust. No `taffy` dependency is needed; spec R3 says to revisit `taffy` when a text-field is piloted, and this evidence says a greedy breaker covers badge, checkbox and button labels.
* **Min-height instead of fixed height.** Container height = `max(minHeight, lines * lineHeight + paddingBlock)`. Derived vertical padding (SPEC-087, `component-visuals.md` "Derived contexts") is `(minHeight - lineHeight) / 2`. For a single line this is the token value; for several lines the padding stays that value and the height grows, so the formula stays defined over one line (spec text already says tooling solves with a label that does not wrap). The recipe needs a `minHeight` that is not a `height`, and a `wrap`/`overflow` choice (`wrap | truncate`, as in React Spectrum Badge `overflowMode`). Truncation needs an ellipsis measurement (one more table entry).
* **Alignment.** Multi-line labels need `text-anchor`/line placement and `<tspan>` or one `<text>` per line in `scene_to_svg`.
* **Where the mirrored cost lands.** Every item above touches both `solve` and `scene_to_svg` and needs new parity cases. See the numbers in Option B.

Wrapping is `qkj5.13`. It depends on measurement (step 1) and fill width (`p6ga.8.77`).

## 3. Build and CI cost

* **Where it is built.** Not in `sdk-wasm`: that crate embeds the token cache and is **14.0 MB** per target (`pkg/node`, `pkg/web`). A slim target is a separate crate depending on `design-data-core` with `default-features = false, features = ["wasm"]`, built with `wasm-pack build --release --target web`. Prototype: `sdk/spikes/hck9-slim-engine` (the crate carries its own `[workspace]` and a copy of `sdk/Cargo.lock`; promotion would make it a workspace member such as `sdk/wasm-visual`).
* **Size** (prototype, this machine, wasm-opt off because wasm-pack's bundled binaryen fails validation on bulk-memory, as in the 2026-10-30 spike; a pinned `wasm-opt -Oz` gave under 1 % then):

|                                                    | Raw       | gzip      | brotli   |
| -------------------------------------------------- | --------- | --------- | -------- |
| Slim WASM + Adobe Clean table (2 weights)          | 293,714 B | 118,547 B | 94,251 B |
| `visual-runtime.js` today                          | 33,286 B  | 10,299 B  | n/a      |
| One compiled variant JSON (button m/light/desktop) | 74,496 B  | 6,586 B   | n/a      |
| `data.json`, 7 components, all variants            | 7.6 MB    | 397 KB    | n/a      |

The 2026-10-30 build was 157 KB / 77 KB gzip; core has since grown (icons, constraints, option templates) and the table adds about 56 KB. The glue JS is 9.8 KB.

* **Browser runtime** (Chrome, `bench.html`): WASM instantiate 2.1 ms; building an `Engine` from one variant JSON 3.7 ms, from a whole component 23.8 ms (so the site should split `data.json` per variant: it parses the compiled recipe on every construction); 0.112 ms per scene through JSON in/out against 0.020 ms for the JS runtime. The explorer rerenders on a control change, so 0.1 ms is below any threshold.
* **CI time.** Cold `cargo build --release --target wasm32-unknown-unknown` of the slim crate took **16 s wall / 50 s CPU** on this machine with an empty target dir (about 1 to 2 minutes on a 2 to 4 vCPU runner; not measured there). The Rust job's cost today (memory `ci-rust-job-slowness-2026-11`: 35 to 37 min before [#1675](https://github.com/adobe/spectrum-design-data/issues/1675)/[#1676](https://github.com/adobe/spectrum-design-data/issues/1676), `sdk-wasm:build` 5 to 6 min of it) is dominated by the full 14 MB module; the slim target has no cache blob, so I expect it to be much cheaper, but I did not measure it in CI. To avoid adding to the PR critical path: build the slim target only from a Moon task whose inputs are `sdk/core/src/visual*.rs`, the slim crate and the recipes, and run the byte-equality test in the same task, so PRs that do not touch the renderer hit the Moon cache. Do not add it to the always-run set until step 3.
* **How the site is published today.** `moon run hub-prototype:build` on the owner's machine, then `adt deploy` (VPN), per `docs/hub-prototype/README.md`. No workflow publishes it. So the slim build lands in `hub-prototype/build.mjs` (one `wasm-pack` call, copy the `.wasm`), with no deploy workflow to change. `rustup target add wasm32-unknown-unknown` and `wasm-pack` are already required by `sdk-wasm`.
* **Artifact policy.** Build it; do not commit the `.wasm`. A committed binary needs a rebuild after every layout change and would drift; the build script is one command.

## 4. Migration (if A)

Steps are beads under `hck9`, in order; each leaves `main` working.

1. **`hck9.5` Step 1a: table-driven text measurement** with the committed Source Sans 3 (OFL) table and a `--text-metrics` loader, in Rust and in `visual-runtime.js` (about 35 lines each plus the shared table). Regenerates `recipe-snapshots.json`, the `visual-golden` SVGs and one hard-coded unit test; **the goldens change now and again if the default table ever changes**. Blocks `qkj5.133` in CI.
   **`hck9.10` Step 1b: kit-backed generator.** `kern.mjs` becomes a `text-metrics` adapter in `tools/platform-capture` writing a git-ignored, stamped table (date and width of "Test" at 700). `qkj5.133` is checked against S2 locally with it. Nothing from it is committed.
2. **`hck9.6` Slim WASM crate.** Promote the prototype: `CompiledVariant::from_compiled` (25 lines), `Engine { new(variantJson), svg(req), scene(req) }`, a Moon task with narrow inputs, size and latency budgets. **Data-shape change:** the icon override moves from compile time (`compile_variant` applies `req.icon`) into `solve`, which changes the compiled data the site and the Figma payloads read. The prototype does not do this yet.
3. **`hck9.7` Site cutover.** `design-data site` writes one JSON per component/size/mode and copies the `.wasm`; `backend.js` fetches the variant and the text-metrics file and drives the engine; README and `sdk/plugins/site/AGENTS.md` lose "no WASM at runtime". The parity test becomes "WASM SVG equals CLI SVG" over the matrix, **including the platform builds (`button-ios`, `toggle-button-ios`), not only `button`**. **From here wrapping, nested recipes and fill width are written once.**
   **`hck9.11` Step 3b: spec-sheet pages.** `design-data spec-sheet` writes an `svg` (Rust `scene_to_svg`) next to `scene` in each block's `render`; `specs.js` draws that and keeps taking markers and measurements from the scene; `build.mjs` stops copying `visual-runtime.js`. The alternative (the sheet pages loading the slim WASM) costs a second module load for no gain, since the sheet already carries the solved scene.
4. **`hck9.8` Delete the copy.** Requires `hck9.11`. Remove `visual-runtime.js`, the `visual-runtime-*.test.js` files (eight today) and the parity helpers in `parity.test.js`; keep `constraints.js` and its parity (a different mirror, `sdk/core/tests/fixtures/option-constraint-cases.json`); move the 21 `visual-golden` SVGs behind a Rust test or keep them under the WASM byte-equality test. Update spec text that names the JS runtime.

Feature beads then depend as follows (already added): `qkj5.133` on `hck9.5`; `qkj5.13`, `p6ga.8.76`, `p6ga.8.77` on `hck9.7`; `qkj5.13` also on `p6ga.8.77` (it needs the width constraint); `p6ga.11.3` already depends on the nested-recipe and fill-width beads.

**Rollback.** Until step 4 the JS runtime still exists, so a regression found after step 3 is fixed by pointing `backend.js` back. After step 4, rollback is a revert.

## Options compared

### Option A: one engine

Rust `solve` compiled to slim WASM; the site loads it instead of `visual-runtime.js`.

* **Text:** one table, one implementation; CLI == browser (byte-identical SVG verified for the button).
* **Wrapping and the three queued features:** written once, in Rust, with its tests (the unit tests in `visual.rs`, the snapshots in `sdk/core/tests`).
* **Cost:** a new wasm target and a build step in `hub-prototype/build.mjs`, 119 KB gzip on the page, a per-variant data split, the licensing decision.
* **Risk:** the site needs WASM (every browser the explorer supports has it); `wasm-pack` and `wasm-opt` are another thing to keep pinned.

### Option B: keep the JS copy

Mirror every feature. Evidence of what that costs, from the three most recent features (`git show --numstat`):

| Feature                                                                                          | `visual.rs`     | `visual-runtime.js`         | JS tests added |
| ------------------------------------------------------------------------------------------------ | --------------- | --------------------------- | -------------- |
| Icon paths from the catalog ([#1668](https://github.com/adobe/spectrum-design-data/issues/1668)) | +498 / -80      | +61 / -27                   | +113           |
| `--icon` and `request.icon` ([#1669](https://github.com/adobe/spectrum-design-data/issues/1669)) | +211 / -1       | +36 / -6                    | +68            |
| Label and icon controls ([#1671](https://github.com/adobe/spectrum-design-data/issues/1671))     | n/a (site only) | +83 (`content-controls.js`) | +104           |

So the mirror is 12 to 17 % of the Rust diff plus a comparable test file, and each feature also touches goldens and the parity matrix. For the queued work I estimate:

| Feature                 | Rust (once)                                                     | JS mirror        | Extra                                                                                                |
| ----------------------- | --------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------- |
| Text table              | about 40 lines + data                                           | about 35 lines   | shared data file; regenerate goldens twice                                                           |
| Wrapping and min-height | about 120 to 200 (two-pass layout, breaker, tspans, truncation) | about 100 to 160 | break-opportunity parity cases (the hyphen miss above is the kind of drift a parity test finds late) |
| Fill width              | about 60                                                        | about 50         |                                                                                                      |
| Nested recipes          | about 150 to 250 (part kind, option scoping, nested compile)    | about 120 to 200 | compiled data shape change visible to both                                                           |

These are estimates, not measurements; they extrapolate the 12 to 17 % ratio and the larger share the layout core (as opposed to icon plumbing) takes. They put B at roughly 300 to 450 mirrored lines and a duplicated test matrix, spread over four features, with drift between CLI and browser as the failure mode. B stays viable if the owner prefers it: the cost is time, not feasibility.

### Option C: Rust engine with a pluggable text-measure callback

Not recommended. The evidence says a data table closes the gap without a callback, and a callback adds a font-load ordering problem and lets site and CLI diverge. Keep it as a later option (a `measure` hook in the `Engine`, canvas in the browser) only if a recipe needs a family the table does not cover.

## 5. Risk: Figma plugin, spec sheets, render-compare

All of them already call the Rust `solve`, so they do not change engine under A. What changes is **text width**, under any option that fixes `qkj5.133`:

* **`render-compare`:** label widths move toward S2 (60 button states: label differences 60 to 0). Container widths follow. Anything that stored the old widths as an expectation changes (`recipe-snapshots.json`, `visual-golden`, any pinned measured JSON).
* **Spec sheets and the Figma payload:** measurement callouts and text frame widths change. Whether the plugin lets Figma auto-size text (so the payload width is only a hint) was not checked. SPEC-087 compares token values against the solved **line height**, which a width change does not touch (re-run `design-data validate` in step 1 to confirm).
* **Spec-sheet pages:** they use `visual-runtime.js` today (`specs.js:7`), so they are affected by step 4, not by the engine itself; step 3b removes the dependency first.
* **Figma plugin:** consumes `Scene` JSON from the Rust crate; no change to the `Scene` shape in steps 1 to 3. Wrapping adds line data later; that is a `Scene` extension to design with the plugin owner, not a swap risk.
* **Shared-checkout hazards:** the prototype needs `design-data-core` built for `wasm32` with `--features wasm`; `cargo clean -p design-data-core` if a build script points at a deleted worktree.

Residual risks and what I did not measure:

* Whether cached kit-measured widths count as ordinary kit use (above): a confirmation, not an open licensing problem, since nothing font-derived is committed. Everything else in step 1a works with the OFL table.
* Weights 500, 600 (interpolated, 0.27 % worst) and 800 (clamped, 2.5 % worst); non-ASCII; italics. Add tables or a font-family key when a recipe needs them.
* The kit must be loaded for a viewer to see Adobe Clean at all; the table cannot fix that.
* I did not measure browsers other than the system Chrome, a CI runner for the build time, `wasm-opt -Oz` on today's build, or the Figma plugin against changed widths.
* `wasm-pack`'s bundled `wasm-opt` failed validation in the 2026-10-30 spike and I did not retry it; the numbers above are without any `wasm-opt`.
* The prototype does not handle the icon override in the WASM `Engine` and was run only for the button; badge, switch, accordion and the platform builds were not re-verified for byte equality in this spike (the 2026-10-30 spike verified button, badge and switch).

## Prototype

Branch `spike/hck9-single-engine`, not merged:

* `sdk/spikes/hck9-slim-engine/`: slim crate (`Engine::new(variantJson, key)`, `svg(reqJson)`), `wasm-pack build --release --target web`.
* `sdk/core/src/visual.rs`: `CompiledVariant::from_compiled`, `text_width_w` (advance + kerning, weights 400/700 interpolated).
* `sdk/core/src/text_metrics_proto.json`: the committed Source Sans 3 (OFL) table, so the crate builds from a clean checkout. The S2 numbers in this document came from the Adobe Clean table instead; `sdk/spikes/hck9-measure/kern.mjs` plus `compact.py` regenerate it into the git-ignored `text_metrics_clean.json`, and copying that over `text_metrics_proto.json` reproduces them. That file is not committed.
* `sdk/spikes/hck9-measure/`: `measure.mjs`, `kern.mjs`, `kern-ss3.mjs`, `wrap.mjs`, `interp.mjs`, `bench.html`/`bench.mjs`, `compact.py`.

## Follow-up beads

`hck9.5` (step 1a, OFL table and loader), `hck9.10` (step 1b, kit-backed generator), `hck9.6` (slim WASM), `hck9.7` (site cutover), `hck9.11` (spec-sheet pages), `hck9.8` (delete the JS copy). Created now so the dependencies exist; they are blocked on the owner's decision in this document.
