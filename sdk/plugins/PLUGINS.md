# Plugin model

`design-data-core` deliberately doesn't compile in every external-format
integration. Figma's Variables REST API and the W3C DTCG spec are both owned
and versioned outside this team — `sdk/plugins/figma` and `sdk/plugins/dtcg`
exist so that core stays free of their dependencies (Figma alone needs
`reqwest`/`tokio`) and each can evolve on its own schedule without risking
core's build.

This document describes that model as it stands today (in-monorepo,
compile-time) and specifies — but does not implement — where it goes if a real
third-party plugin ecosystem shows up. See the PR that introduced this file
for the full staged rationale; the summary below is the part meant to stay
accurate as the code evolves.

## Today: compiled-in, in-monorepo plugins

A plugin is a crate under `sdk/plugins/` that depends on `design-data-core`
through its public API. There are several shapes, matching the kinds of export
target that actually exist:

* **Pure exporters** — a one-shot `TokenGraph` + resolved winners -> document
  transform, with no I/O or protocol of its own. These implement
  \[`design_data_core::export::TokenExporter`]:

  ```rust
  pub trait TokenExporter {
      fn format_id(&self) -> &'static str;
      fn export(&self, graph: &TokenGraph, winners: &[TokenRecord],
                 mode_ctx: &HashMap<String, String>) -> serde_json::Value;
  }
  ```

  `design-data-dtcg`'s `DtcgExporter` and `design-data-shadcn`'s
  `ShadcnThemeExporter` implement this trait. The CLI looks them up by
  `format_id()` from a small static registry (`cli/src/main.rs::exporters()`)
  instead of hardcoding a match arm. Run `design-data export --format shadcn-theme`
  for the shadcn theme. It ignores `winners`, resolves `light` and `dark` from
  the graph itself, and emits keys without a `--` prefix (shadcn adds it).
  Scheme-independent non-color values go in `cssVars.theme` so shadcn doesn't
  emit self-referencing `var()` entries for them.

* **Data-specific one-shot exports** — a pure transform that does not consume a
  resolved token graph. `design-data-shadcn` also maps component declarations
  into `registry:component` items with metadata only: no source files and no
  Code Connect mappings. Run `design-data shadcn registry --output DIR`
  (add `--component ID` for one component). It reads the platform-merged
  catalog when a platform manifest is selected. It uses its own subcommand and the
  component lookup path, and does not implement `TokenExporter`, whose inputs
  are token-only. Build and test with `moon run sdk:build` and `moon run sdk:test`.

* **Bidirectional / network-coupled plugins** — anything that isn't a
  one-shot transform. `design-data-figma` is this shape: it fetches live
  variables from Figma, diffs them against the resolved graph, and can POST
  changes back. Forcing that through `TokenExporter` would leak a fake
  uniform shape, so it doesn't implement the trait — it exposes its own CLI
  subcommands (`figma export`/`import`/`audit`/`diff`/`pair`) and function API
  instead.

* **Multi-file generators** — `design-data-site` writes a whole static
  explorer from the graph and the `visuals/` recipes. It takes the graph
  directly and has its own `design-data site` subcommand, so it doesn't
  implement `TokenExporter`.

* **Scene renderers** — a solved visual-recipe `Scene` -> one output format's
  bytes. These implement \[`design_data_core::scene_render::SceneRenderer`]:
  `format_id`, `media_type`, `binary` (true when the bytes must not go to a
  terminal), `prepare(options) -> Prepared` and
  `render(scene, options) -> Rendered`. `prepare` runs before layout, because a
  format that draws text may need to choose its font first (the font sets the
  text widths): it returns the settled `RenderOptions` (pixel ratio, user fonts),
  an optional `TextMetrics` for layout, and diagnostics to show before the render.
  `render` returns the bytes and the diagnostics for what it could not draw
  faithfully. `SvgRenderer` (`svg`) and `SceneJsonRenderer` (`scene`) live in
  core and keep the default `prepare`. `design-data-png`'s `PngRenderer` (`png`,
  `image/png`) owns the pure-Rust rasterizer (`canvas`, `shape`, `path`, `png`),
  the TrueType and variable-font reader, font discovery and resolution
  (`font/`), and the bundled Source Sans 3 fallback font with its OFL text
  (`src/fonts/`, behind the default `fallback-font` feature). The CLI looks a
  renderer up by `format_id()` from a static registry
  (`cli/src/main.rs::scene_renderers()`), and `render --format` accepts exactly
  the ids in that list, so a plugin is added in one place. The TUI preview and
  `sdk/wasm` (`renderPng`, `describeFont`, `chooseFont`) call the PNG crate's
  functions directly; `sdk/wasm` turns `fallback-font` off because the MCP server
  hands it the fonts it reads. `sdk/wasm-visual` does not depend on it.

* **Spec-sheet generator** — `design-data-spec-sheet` builds the component
  spec-sheet model (pages of blocks with scenes, token rows, change markers and
  the filled template sections) from a loaded `TokenGraph`. It is a library with a
  function API (`build_sheet`, `components_with_relationships`, `index_entry`),
  not a `SceneRenderer`: its output is a JSON document that the Figma spec plugin
  (`tools/figma-spec-plugin`, payloads) and the hub explorer (web SVG with `--svg`)
  read. The CLI's `design-data spec-sheet` (`cli/src/spec_sheet.rs`) loads the
  dataset and the text metrics, calls the plugin and writes the files. Only the
  CLI depends on it; `sdk/wasm`, `sdk/wasm-visual` and core do not.

**Adding a new in-monorepo plugin**: create `sdk/plugins/<name>/`, depend on
`design-data-core` by path, implement `TokenExporter` if it accepts resolved
token graph inputs (register it in the CLI's `exporters()`), or add a
data-specific subcommand if its input shape differs. No new abstraction is
owed until a second plugin needs one.

## Later: a third-party subprocess protocol (not yet built)

Neither shape above works for an author who can't or shouldn't land a crate
in this repo. For that case, the plan is a subprocess protocol rather than
dynamic loading (FFI/`cdylib`/hot-reload) — a batch CLI never hot-reloads
anything, so paying for a runtime plugin loader buys nothing here.

Same rule as the in-process case: a plugin sits strictly downstream of the
manifest cascade (`manifest::apply_configured` mutates the graph in place,
then `cascade::resolve_dataset` produces winners + mode context — see
`TokenExporter` above). A consumer with its own platform manifest, like
`spectrum-ios-design-data` layering overrides on a foundation dataset, still
gets its real resolved values; the subprocess never sees the manifest or the
foundation source, only the result.

* `design-data export --format <name>` looks for `design-data-export-<name>`
  on `PATH` when `<name>` isn't a built-in format.
* **stdin**: the *resolved* dataset — the graph state and winners a
  `TokenExporter` would receive, after `apply_configured` and
  `resolve_dataset`, serialized to JSON. This is **not** the neutral
  `{ tokens, components, modeSets, relationships, guidelines }` shape the
  conformance fixtures use — that shape is raw, pre-manifest foundation
  input with no production emitter (only a `#[cfg(test)]` reader,
  `build_graph`). A resolved-graph JSON serializer doesn't exist yet either;
  building it is part of building this protocol, not a reused contract.
* stdin must also carry **mode context**: the manifest's mode-set
  restrictions live in the resolution's `mode_ctx` / `ResolutionContext`,
  not in the graph, and `TokenExporter::export` takes it as a separate
  argument. Dropping it from the payload would silently lose a consumer's
  platform mode restrictions.
* **stdout**: the target-format bytes, written verbatim to the CLI's normal
  export output.
* Non-zero exit or anything on stderr is a hard failure — no partial/degraded
  output.

**Open question — mode coverage for subprocess plugins**:
`TokenExporter::export` hands the plugin one resolved winner per identity for
one mode context. An in-process exporter can re-resolve additional contexts
from the graph (as `ShadcnThemeExporter` does for light/dark); a subprocess
plugin receives only the serialized winners. A target needing every mode in
one output (e.g. an iOS asset catalog with light/dark/increased contrast)
therefore needs a protocol that supplies multiple contexts. Whether that
protocol invokes the plugin once per context or bundles all contexts into one
payload remains unresolved.

This is a specification, not an implementation. Build it when a genuine
external plugin author shows up, not speculatively.
