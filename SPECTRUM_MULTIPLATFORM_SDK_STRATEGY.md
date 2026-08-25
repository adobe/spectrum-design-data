# Spectrum Multi-Platform SDK Strategy

*Strategy and roadmap — living document. Last reconciled with shipped reality 2026-08-20.*

> **Status note.** An earlier draft of this document described a customization mechanism —
> inline `[filters]`/`[transforms]` TOML blocks, an in-tree `platform-configs/` directory,
> per-platform `generated/` SDKs, and UniFFI/JNI/FFI bindings — that was **never built**. The
> mechanism that actually shipped is the **externalized per-platform manifest repo** built on the
> **Layer-2 platform `manifest.json` cascade**. This revision keeps the multi-platform vision but
> corrects "how it works" to what exists in the codebase today, and lays out the roadmap to close
> the gaps. Items still aspirational are marked **(future)**.

## 🎯 Executive summary

Spectrum design data (tokens + component schemas + catalogs) is processed by a **Rust core engine**
(`sdk/core`) exposed three ways: a `design-data` **CLI** (`sdk/cli`), a **wasm** package for
JS/browser (`sdk/wasm`), and an **MCP server** for AI agents (`tools/design-data-agent-mcp`). A
platform team adopts the system by standing up a small **platform manifest repo** that pins the
foundation and declares its platform-specific overrides and extensions declaratively — then the same
core tooling validates, resolves, diffs, and (increasingly) round-trips that data to Figma and code.

The worked prototype is **[`GarthDB/spectrum-ios-design-data`](https://github.com/GarthDB/spectrum-ios-design-data)**:
a repo whose `.design-data.toml` pins `adobe/spectrum-design-data` via the `github` source and
cascades a local `manifest.json` on top.

### Key strategic decisions

1. **Rust core, single source of truth** — one engine (`sdk/core`) behind CLI, wasm, and MCP.
2. **Multi-platform targets** — TypeScript/JS and browser today (wasm); iOS, Android, Web
   components as consumers of resolved data; native FFI bindings **(future)**.
3. **Team-owned customization via a manifest repo** — platform teams own a small repo, not a slice
   of the monorepo. Customization is a validated `manifest.json`, not ad-hoc config.
4. **Validation and governance as CI** — every platform repo validates its manifest + cascade and
   detects foundation drift on each PR.
5. **Design-data scope** — tokens + component schemas today; component anatomy data **(future)**.

## 📊 Current state (what actually shipped)

**Foundation SDK — `adobe/spectrum-design-data`:**

* **CLI** (`sdk/cli/src/main.rs`): `validate`, `validate-dataset`, `resolve`, `query`, `diff`,
  `primer`, `figma read|export|audit`, `write`, `authoring-session`, `lifecycle`, `data`,
  `cache-build`, `tui`. `validate`, `validate-dataset`, and `diff` emit `--format json` and exit **1
  on failure/drift, 2 on hard error** — directly CI-gateable.
* **`.design-data.toml` discovery + cascade** (`sdk/core/src/data_source/mod.rs`): a project points
  at a foundation via `[source]` — `type = "path"` or `type = "github"` (a repo pinned by exactly
  one of `tag`/`branch`/`sha`, fetched as a release tarball over pure HTTPS, cached; cache dir via
  `DESIGN_DATA_CACHE_DIR`). A **top-level, source-independent `manifest` key** points at a Layer-2
  platform `manifest.json` that cascades over whatever source resolved.
* **Manifest cascade + validation** (`sdk/core/src/manifest.rs`, `graph.rs`):
  `manifest::apply_configured` Layer-1 validates the manifest against `manifest.schema.json`, then
  `TokenGraph::apply_platform_manifest` applies `include`/`exclude` query filters, `overrides`,
  `extensions`, and `modeSetRestrictions`. Rules live in `packages/design-data-spec/rules/rules.yaml`
  (notably **SPEC-039** manifest-query-parseable, **SPEC-041** mode-set-restriction-coverage,
  **SPEC-044** dataset-structure).
* **wasm** (`sdk/wasm`): a `Dataset` class exposing query/resolve/diff/validate/primer to JS/TS.
* **AI/MCP** (`tools/design-data-agent-mcp`, wired in `.mcp.json`): read tools run in-process via
  wasm; authoring/write shell out to the CLI. Read/query/resolve/diff/validate + guided authoring.
* **Figma** (`sdk/core/src/figma/`, CLI `figma export|read|audit`): a Figma Variables REST bridge
  that can export cascade tokens as Figma Variables and read/audit existing ones.

**Known gaps (tracked as beads under epic `spectrum-design-data-h890`):** the CLI is not yet
distributed to teams (crates are internal-only); the github tarball omits the spec-schemas dir so
manifest Layer-1 validation silently no-ops against a fetched foundation; there is no standalone
`validate-manifest` command or reusable validation Action; `figma export` consumes a raw token dir,
not the manifest-resolved dataset; the MCP env layer only understands local paths, not the
`.design-data.toml` cascade. See the roadmap below.

## 🧭 The value story — why a platform team adopts this

The manifest layer is extra surface area for a platform team, so it has to pay for itself. Framed
against **Spectrum iOS today** (`spectrum-tokens-ios`), where the override "source of truth" is a
Figma file plus hand-authored JSON, merged by `Tools/tokentool` into Swift with an
`override-log.csv` emitted as an *unvalidated* byproduct:

| Today (Spectrum iOS)                                                    | With a platform manifest repo                                                |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Overrides live in a Figma file + `override-log.csv` (a merge byproduct) | Overrides are a **declarative, reviewable `manifest.json`**                  |
| Nothing validates overrides against the foundation                      | **CI validates** manifest + cascade on every PR (`validate-dataset`, exit 1) |
| Foundation bumps break overrides silently                               | **`diff` drift-gate** flags foundation changes that touch overridden tokens  |
| The Swift generator's input is an ad-hoc merged blob                    | Input is a **pinned, reproducible resolved dataset**                         |
| No AI/query surface scoped to the platform's tokens                     | `resolve`/`query`/authoring **scoped to the platform set** via MCP           |
| Figma↔code is one-way, manual, token-by-token                           | **Figma round-trip** driven by the same manifest                             |

Net: the manifest layer replaces opaque merge/CSV toil with a validated, diffable, tool-supported
contract. It costs a team one small repo and removes silent breakage and manual reconciliation.

## 🏗️ Reference architecture

```
adobe/spectrum-design-data          per-platform manifest repo            platform impl repo
 (foundation dataset,          e.g. GarthDB/spectrum-ios-design-data      e.g. spectrum-tokens-ios
  SDK: core/CLI/wasm/MCP)                                                  (Swift + tokentool)
        │                              .design-data.toml (github pin)             │
        │  release binaries  ─────►    manifest.json (overrides/extensions)       │
        │  (Homebrew / CI)             validation CI (design-data Action)         │
        │                              .mcp.json + skill (platform-scoped AI)     │
        ▼                                        │                                ▼
   figma export/import  ◄────────────────────────┼──────────────►  generate-source-code consumes the
   (Figma Variables)                     resolve / query / diff      RESOLVED dataset (not ad-hoc merge)
```

Three roles, each owned by a different team:

* **Foundation** (Core Spectrum team): the dataset + the SDK/CLI/wasm/MCP + distribution.
* **Platform manifest repo** (platform design/eng team): the declarative overrides + CI + AI config.
* **Platform implementation** (platform eng team): the native library and its code generator, now
  fed by a resolved dataset rather than a bespoke merge.

## 📦 Building & distributing the tools to implementation teams

Distribution is currently greenfield (no release binaries, no tap; `release.yml` handles only
JS/changeset publishing). Recommended, assuming macOS for engineers to start:

* **CLI → Homebrew (engineers).** Use **`cargo-dist`**: one config builds macOS arm64+x86\_64 release
  binaries as GitHub Release assets, generates a **Homebrew formula** (an `adobe/homebrew-spectrum`
  tap), and emits a shell installer plus a CI install step — covering both `brew install design-data`
  for engineers and the CI install path for the validation Action in one tool. Wire into
  `release.yml`. (Beads `h890.1`, `h890.2`.)
* **AI/MCP** already ships via `npx @adobe/design-data-agent-mcp` — no change needed.
* **wasm** ships via npm (`@adobe/design-data-wasm`) for browser and Figma-plugin consumers.
* **TUI**: decide whether to publish the npm wrapper (currently `private`) or keep it brew-only.
  (Bead `h890.3`.)

Native FFI distribution (Swift Package via UniFFI, Android AAR via JNI) is **(future)** — see roadmap.

## ✅ Validation, CI, and the reusable Action

The whole point of a manifest repo is that its correctness is machine-checked. The building blocks
exist; the roadmap wires them into a turnkey Action:

* **Ship the spec schemas in the github tarball** so manifest Layer-1 validation actually runs
  against a fetched foundation (`should_extract`, `sdk/core/src/data_source/fetch.rs`). (Bead
  `h890.4`; relates to `spectrum-design-data-9osr`.)
* **Add a standalone `validate-manifest` subcommand** (today manifest validation only runs as a side
  effect of `query`). (Bead `h890.5`.)
* **Publish a reusable composite GitHub Action** (`.github/actions/validate`) that installs the CLI
  and runs `validate-dataset --strict --format json`, `validate-manifest`, and a **foundation-drift
  `diff`** (pinned `foundationVersion` vs latest tag) — gating platform-repo PRs and optionally
  opening a "foundation moved" issue. (Bead `h890.6`.)

## 🧰 What a platform manifest repo ships (the template)

Generalized from the iOS prototype, a scaffold (a template repo, or a `design-data init` subcommand)
produces: `.design-data.toml` (github pin), a `manifest.json` skeleton, the validation workflow
above, a repo-local `.mcp.json` + design-data skill (platform-scoped AI), `README.md`, `LICENSE`.
(Bead `h890.7`.)

## 🎨 Figma variable round-trip

Spectrum iOS's overrides originate in Figma today, so Figma is a first-class interface, not an
afterthought. Two directions, both building on the existing `figma` CLI bridge:

* **Manifest → Figma**: extend `figma export` (`run_figma_export`, `sdk/cli/src/main.rs`) to consume
  a **manifest-resolved** dataset, so a platform's Figma variable collection is authored *from* the
  manifest. (Bead `h890.11`.)
* **Figma → manifest**: a new importer turning Figma variables into `manifest.json`
  overrides/extensions — the declarative replacement for tokentool's `convert-variable-collections`
  authoring path. (Bead `h890.12`.)
* **(future)** a wasm-backed Figma plugin for live query/resolve, which needs a wasm binding for
  `apply_platform_manifest` (not exposed today). (Bead `h890.13`.)

## 🤖 Platform-scoped AI tools

Point the design-data MCP server at a platform manifest repo so `resolve`/`query`/`diff`/authoring
operate on the **platform-resolved** dataset:

* **Short term (works today):** resolve the cascade to a local dir and set `DESIGN_DATA_PATH` at it.
* **Better:** teach `@adobe/design-data-agent-mcp` to honor `.design-data.toml` (github source +
  manifest cascade) directly, rather than only local-path env vars
  (`tools/design-data-agent-mcp/src/config.js`). Ship the repo-local `.mcp.json` + skill via the
  template so a platform engineer gets scoped AI tools out of the box. (Bead `h890.14`.)

## 📱 Worked example: interfacing Spectrum iOS

`spectrum-tokens-ios` is the concrete adoption target. Its current pipeline —
`fetch` foundation → `fetch-figma-variables` → `convert-variable-collections` → `merge` (foundation

* `ios-tokens/*.json` + figma-derived, emitting `override-log.csv`) → `generate-source-code` (Swift)
  — collapses onto the manifest model:

- The 742-row `override-log.csv` **imports into `manifest.json`** overrides + `extensions.tokens`
  (contrast/elevated additions become extensions, since the foundation ships no `contrast=high`
  record to override). This is the highest-signal value demonstration on real data. (Bead `h890.8`.)
- The iOS foundation pin moves from `@adobe/spectrum-tokens@13.0.0` (pre-cascade format) to a
  cascade-format release (`15.0.0`+) — a prerequisite. (Bead `h890.9`.)
- `tokentool`'s `generate-source-code` keeps owning Swift codegen, but its **input becomes a
  `design-data`-resolved dataset** (CLI output or a published resolved snapshot from the manifest
  repo), retiring the ad-hoc `merge` + `figma-tokens.json` + `override-log.csv` as source of truth.
  (Bead `h890.10`.)

## 🛠️ Roadmap

Tracked under epic **`spectrum-design-data-h890`** ("Platform design-data ecosystem: tooling for
implementation teams", initiative `DNA-1741`; governance overlap `DNA-1520`). Workstreams:

| WS  | Theme                                                                        | Beads           |
| --- | ---------------------------------------------------------------------------- | --------------- |
| WS1 | Build & distribute the CLI (cargo-dist, Homebrew tap, channels)              | `h890.1`–`.3`   |
| WS2 | Validation hardening + reusable Action + drift gate                          | `h890.4`–`.6`   |
| WS3 | Platform-manifest repo template / `design-data init`                         | `h890.7`        |
| WS4 | Spectrum iOS interface (override import, pin move, resolved-dataset codegen) | `h890.8`–`.10`  |
| WS5 | Figma variable round-trip                                                    | `h890.11`–`.13` |
| WS6 | Platform-scoped AI/MCP                                                       | `h890.14`       |

Related manifest-engine gaps from the iOS POC (`FINDINGS.md`) live under epic `spectrum-design-data-b17`:
`8bkb`, `c3qw`, `jl7t`, `9osr`, `uduh`.

### Aspirational / not yet scoped (future)

* Native FFI bindings: **UniFFI** (Swift), **JNI** (Android/Kotlin), **FFI** (Qt/C++).
* Platform-native documentation generation (DocC, KDoc, TSDoc, Doxygen).
* Component **anatomy** data (spatial relationships, layout constraints).
* Usage analytics, automated migration suggestions, cross-platform optimization.

## 💡 Strategic differentiation

The combination of a **shared Rust core** (consistency + performance) with **externalized,
declarative per-platform manifest repos** (team autonomy + validated customization) gives platform
teams ownership without forking the design system, and gives the core team machine-checkable
governance. Customization-as-a-validated-manifest — reviewed in PRs, diffed against the foundation,
and consumed by the same tools that author Figma variables and drive AI assistance — is what makes
the system adoptable at scale.

***

*This is a living document. As roadmap beads land, move items from "future" into "current state" and
keep the value story anchored to what a platform team actually experiences.*
