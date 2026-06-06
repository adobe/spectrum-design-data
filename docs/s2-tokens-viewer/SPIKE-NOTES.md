# Spike Notes: wasm "web" build in docs/s2-tokens-viewer

**Task:** `spectrum-design-data-ktb.3.6` (candidate, P3)\
**Date:** 2026-06-05\
**Outcome: GO** — convergence is feasible. See follow-up work below.

***

## Pre-spike blockers (resolved by investigation)

Before this spike, five apparent blockers were identified:

1. **Data format mismatch** — viewer consumes object-map format; wasm requires cascade array.
2. **Resolution paradigm** — viewer resolves by named slug `{blue-100}`; wasm resolves by property.
3. **No resolution chain** — viewer UI shows `→` chain; wasm returns only the winning token.
4. **Module system** — viewer is non-module inline `<script>`; wasm is ESM + `await init()`.
5. **Different dataset** — `Dataset.embedded()` vs `@adobe/spectrum-tokens` source.

All five were resolved in this spike.

***

## Phase A: Browser load / bundle size

**Wasm bundle size:** `design_data_wasm_bg.wasm` = **15 MB** (post-`wasm-opt -O` compression).

This is the largest concern for a public docs page. The embedded `.redb` cache accounts for
\~13–14 MB; the Rust code compiles to \~1–2 MB. Options to address:

* **Accept it**: the viewer is an internal docs tool, not a consumer-facing page. 15 MB on
  a cached CDN/gh-pages is acceptable for a developer tool loaded rarely.
* **Strip the embedded build**: a non-embedded web build would be \~1–2 MB and load the
  token JSON at runtime from the already-fetched `tokens/*.json` files.
* **Compression**: gzip (gh-pages serves `.wasm` with `Content-Encoding: gzip`) typically
  reduces 15 MB → \~4–5 MB on the wire.

**Init pattern:** `<script type="module">` → `import init, { Dataset } from './wasm/design_data_wasm.js'` →
`await init()` (fetches `.wasm`) → `Dataset.embedded()` or `Dataset.fromTokens(tokens)`.

The spike page (`docs/s2-tokens-viewer/spike/index.html`) demonstrates this pattern.

***

## Phase B: Resolution capability gap — RESOLVED with Rust prototype

### Finding

The wasm `resolve(property, context)` resolves by *property* (e.g. `"background"`) in a
mode-set context. The viewer uses `TokenResolver.resolve("{blue-100}", "light")` — a named
slug reference. These are different resolution models.

Additionally, the viewer's `getResolutionChain()` produces a `→` arrow chain through
intermediate aliases; the existing `resolve()` returns only the final winner.

### Solution prototyped

A new `Dataset.resolveReference(tokenRef, context)` method was added to `sdk/wasm/src/dataset.rs`.
It:

1. Accepts `"{blue-100}"` (with or without braces) and a flat context map
   (`{ colorScheme: "light" }` for color, `{ scale: "desktop" }` for layout).
2. Finds all cascade tokens whose `extract_legacy_key(name)` matches the slug.
3. Scores candidates by name-object field overlap with the context (most matches wins).
4. Walks the `alias_target` chain via the existing `resolve_alias_key` + `resolve_leaf`
   infrastructure, emitting a chain of human-readable names at each hop.
5. Returns `{ value, chain }` where `chain` mirrors the viewer's `getResolutionChain` output.

**Test coverage:** 8 new AVA parity tests added to `sdk/wasm/test/parity.test.js`:

* Direct-value palette token by slug
* Color-set token with context discrimination (light vs dark)
* One-hop alias chain (e.g. `accent-background-color-default → blue-100 → rgb(...)`)
* Unknown token returns `undefined`
* Shape assertions
* Embedded dataset smoke tests for `black` and `blue-100` light/dark

**All 53 tests pass** (including 8 new; 0 regressions).

The prototype is functional but carries a **spike status** comment in the source — it needs
production hardening before shipping (see follow-up issues).

***

## Phase C: Dataset coverage — 100%

| Metric                                          | Result                   |
| ----------------------------------------------- | ------------------------ |
| Viewer object-map keys                          | 2,460                    |
| Cascade legacy names (via `extract_legacy_key`) | 2,460                    |
| Overlap                                         | **2,460 / 2,460 = 100%** |
| Viewer-only names                               | 0                        |
| Cascade-only names                              | 0                        |

Every token the viewer renders has an exact name match in `packages/design-data/tokens/*.tokens.json`
(the same dataset baked into `Dataset.embedded()`).

The 1,236 "viewer-only UUIDs" seen in the initial count were container-level `set_uuid` values
(one per color-set token) that don't appear as individual cascade token UUIDs — not missing data.

### Context key mapping

| Viewer `sets` key | Cascade name-object field  | Example                                                    |
| ----------------- | -------------------------- | ---------------------------------------------------------- |
| `light`           | `colorScheme: "light"`     | `resolveReference("{blue-100}", { colorScheme: "light" })` |
| `dark`            | `colorScheme: "dark"`      | `resolveReference("{blue-100}", { colorScheme: "dark" })`  |
| `wireframe`       | `colorScheme: "wireframe"` |                                                            |
| `desktop`         | `scale: "desktop"`         | `resolveReference("{spacing-100}", { scale: "desktop" })`  |
| `mobile`          | `scale: "mobile"`          |                                                            |

This mapping is deterministic: a one-line context translation at the call site.

***

## Go / No-Go Recommendation: **GO**

All five pre-spike blockers are resolved:

1. ✅ **Data format**: viewer can keep fetching its `tokens/*.json` for rendering AND call
   `Dataset.fromTokens(cascadeTokens)` (loaded from `packages/design-data/tokens`) for
   resolution. OR it can switch to `Dataset.embedded()` (same data, no extra fetch).
2. ✅ **Resolution paradigm**: `resolveReference(slug, ctx)` bridges the gap. The viewer's
   `TokenResolver` can be replaced call-by-call.
3. ✅ **Resolution chain**: `resolveReference` returns `chain` — the `→` chain array.
4. ✅ **Module system**: convert the viewer's `<script>` to `<script type="module">` —
   a one-line change. Confirmed compatible with the viewer's build/export setup.
5. ✅ **Dataset coverage**: 100% of viewer token names are present in the embedded dataset.

### Residual concerns

* **15 MB wasm bundle**: acceptable for an internal docs page; gzip reduces to \~4–5 MB on the
  wire. If unacceptable, a non-embedded build can be used with a `Dataset.fromTokens()` call
  on the already-fetched JSON.
* **`resolveReference` production hardening**: the spike prototype has a "spike status" comment.
  It needs error-handling, a broader conformance test, and a proper TypeScript type export
  before production use.
* **`initSync` option**: for the viewer (which currently doesn't block on async), a
  `<link rel="preload">` + `initSync` pattern avoids waterfall latency.

***

## Follow-up issues to file

1. **Productionize `resolveReference` + chain API in `sdk/wasm`**
   * Remove spike comment; add error handling for dangling aliases
   * Add TypeScript d.ts export check
   * Expand conformance fixtures for chain semantics

2. **Convert viewer to ESM + wire wasm for resolution**
   * `<script type="module">` in `index.html`
   * Import and `await init()` from `../wasm/design_data_wasm.js`
   * Replace inline `TokenResolver.resolve()` + `getResolutionChain()` calls with
     `ds.resolveReference(ref, contextMap)` where `contextMap` translates
     viewer context keys to cascade name-object fields
   * Keep `ValueFormatter` and display logic unchanged

3. **Add wasm artifacts to moon `export` task**
   * Copy `sdk/wasm/pkg/web/{design_data_wasm.js, design_data_wasm_bg.wasm}` to
     `docs/s2-tokens-viewer/wasm/` in the `export` task in `moon.yml`

4. **Data source decision**
   * Option A (simplest): use `Dataset.embedded()` — no extra fetch, same data, 15 MB wasm
   * Option B (smaller): keep viewer's existing `tokens/*.json` fetch; call
     `Dataset.fromTokens(cascadeTokens)` from `packages/design-data/tokens` via a new copy
     task (adds one fetch but reduces wasm to \~1–2 MB without embedded feature)

***

## Spike artifacts

* `docs/s2-tokens-viewer/spike/index.html` — throwaway browser prototype (to be deleted)
* `sdk/wasm/src/dataset.rs` — `resolveReference` prototype method (spike status)
* `sdk/wasm/src/types.rs` — `ReferenceChainResult` type
* `sdk/wasm/test/parity.test.js` — 8 new tests for `resolveReference`
