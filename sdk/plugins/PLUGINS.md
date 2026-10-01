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
through its public API. There are two shapes, matching the two kinds of
export target that actually exist:

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

  `design-data-dtcg`'s `DtcgExporter` is the only implementor today. The CLI
  looks it up by `format_id()` from a small static registry
  (`cli/src/main.rs::exporters()`) instead of hardcoding a match arm — the
  seam a second pure exporter would plug into.

* **Bidirectional / network-coupled plugins** — anything that isn't a
  one-shot transform. `design-data-figma` is this shape: it fetches live
  variables from Figma, diffs them against the resolved graph, and can POST
  changes back. Forcing that through `TokenExporter` would leak a fake
  uniform shape, so it doesn't implement the trait — it exposes its own CLI
  subcommands (`figma export`/`import`/`audit`/`diff`/`pair`) and function API
  instead.

**Adding a new in-monorepo plugin**: create `sdk/plugins/<name>/`, depend on
`design-data-core` by path, implement `TokenExporter` if it fits (register it
in the CLI's `exporters()`) or add its own subcommands if it doesn't. No new
abstraction is owed until a second exporter actually needs one — one
`match`/`Vec` entry is cheap at N=2.

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

**Open question — mode coverage**: `TokenExporter::export` hands the plugin
one resolved winner per identity for one mode context. A target that needs
every mode in one output (e.g. an iOS asset catalog with light/dark/increased
contrast) needs more than that single slice. Whether the subprocess protocol
invokes the plugin once per mode context or bundles all modes into one
payload is unresolved — settle it when the protocol, or the first
multi-mode in-process exporter, actually gets built.

This is a specification, not an implementation. Build it when a genuine
external plugin author shows up, not speculatively.
