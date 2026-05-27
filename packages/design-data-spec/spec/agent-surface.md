# Agent-readable surface

**Spec version:** `1.0.0-draft` (see [Overview](index.md))\
**Status:** Implemented — RFC-C / Phase 8 (epic [#830](https://github.com/adobe/spectrum-design-data/issues/830)). Core read/validate/write surface shipped. `write_component` and `explain` deferred (no CLI subcommand or MCP tool yet).

This document defines the **agent-readable surface**: the contract an external AI agent uses to consume design data conformant with this specification. It standardizes a small set of operations exposed through three transports — a CLI, a Model Context Protocol (MCP) server, and a Claude Code Agent Skill — all backed by the same resolver, validator, and query implementations that power the rest of the SDK.

## Goals

The surface targets three consumer shapes:

1. **Authoring an external system.** A non-Spectrum design system being constructed inside an AI tool (e.g. a finance-dashboard prototype tool) wants to produce spec-conformant tokens, mode sets, and components without re-deriving the format from prose.
2. **Extending Spectrum.** A product or platform team adds tokens, components, or overrides on top of the published Spectrum foundation and needs to validate that the additions cascade and resolve correctly.
3. **Adhering to Spectrum.** A prototyping tool generates UI that should match Spectrum even where no bound component exists (e.g. CSS for a custom card). The agent needs to look up tokens by intent, validate proposed property values against the foundation, and report drift.

**NORMATIVE:** A conforming agent surface implementation MUST support all three consumer shapes, parameterized by the manifest provided at session start (see [Session primer](#session-primer)).

## Non-goals

* Generating finished platform code (Swift, CSS, etc.). Output formatting is the consumer's responsibility; the surface returns structured tokens.
* Hosting design data. The surface operates on local datasets reachable from the consumer's filesystem, plus optionally a remote published manifest.
* Replacing the existing Spectrum-bound tools (`@adobe/spectrum-design-data-mcp`, `@adobe/s2-docs-mcp`). Those expose Spectrum-specific shapes; this surface is generic to any spec-conformant dataset.

## Tool catalog

**NORMATIVE:** A conforming implementation MUST expose the following operations. Transport-specific naming (CLI subcommand vs MCP tool name vs skill action) MAY differ; the semantics MUST NOT.

| Operation            | Reads                                                  | Returns                                                                                                                                                                                   | Backed by                                                                                          |
| -------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `resolve_token`      | property + mode set context                            | winning token (literal or resolved alias) with file/UUID/specificity                                                                                                                      | `cascade::resolve`                                                                                 |
| `query_tokens`       | filter expression (see [Query](query.md))              | matching token list                                                                                                                                                                       | `query::filter`                                                                                    |
| `validate_usage`     | candidate token document or fragment                   | `ValidationReport` (Layer 1 + Layer 2 diagnostics)                                                                                                                                        | `validate::validate_*`                                                                             |
| `describe_component` | component identifier                                   | component contract (anatomy, options, states, tokenBindings); see [#832](https://github.com/adobe/spectrum-design-data/discussions/832) and [Phase 6.7](#describe_component-return-shape) | (Phase 6 contract)                                                                                 |
| `suggest_token`      | natural-language intent + optional property hint       | ranked candidate tokens with rationale (RECOMMENDED, not NORMATIVE in v1)                                                                                                                 | registry + query                                                                                   |
| `get_guidance`       | token UUID, component identifier, or anatomy reference | attached document blocks (Phase 9 / RFC-D); falls back to empty list pre-RFC-D                                                                                                            | document blocks                                                                                    |
| `diff_datasets`      | two dataset roots                                      | `DiffReport` per [Diff](diff.md)                                                                                                                                                          | `diff::semantic_diff`                                                                              |
| `write_token`        | token object + optional rationale string               | updated product-layer token file + `product-context.json` (RECOMMENDED, not NORMATIVE in v1)                                                                                              | `write::write_token` — shipped: `design-data write-token` (CLI) / `authoring_session_commit` (MCP) |
| `write_component`    | component object + optional rationale string           | updated product-layer component file + `product-context.json` (RECOMMENDED, not NORMATIVE in v1)                                                                                          | `write::write_component` — deferred; no CLI subcommand or MCP tool yet                             |

**NORMATIVE:** `validate_usage`, `resolve_token`, `query_tokens`, `diff_datasets`, and `describe_component` MUST be implemented in a conforming agent surface. `suggest_token`, `get_guidance`, `write_token`, and `write_component` are RECOMMENDED.

**RECOMMENDED:** When `write_token` or `write_component` is invoked, the implementation SHOULD capture a `rationale` argument from the agent session context and record it in both the token's inline `rationale` field and the product context document's `overrides[].rationale` or `extensions.tokens[].rationale`. See [Product context — Agent capture behavior](product-context.md#agent-capture-behavior).

## Session primer

An agent loop benefits from a small, structural overview at session start so that subsequent calls are well-scoped. The **session primer** is a single operation that returns a serialized summary of the active dataset.

**NORMATIVE:** A conforming implementation MUST expose a `primer` operation returning a JSON object with at least:

| Field            | Type           | Meaning                                                           |
| ---------------- | -------------- | ----------------------------------------------------------------- |
| `specVersion`    | string         | The spec version the dataset declares (see [Overview](index.md)). |
| `manifest`       | object \| null | Resolved platform manifest, if any (see [Manifest](manifest.md)). |
| `modeSets`       | array          | Declared mode sets with modes and defaults.                       |
| `components`     | array          | Component identifiers exposed by the dataset (post Phase 6).      |
| `taxonomyFields` | array          | Active name-object fields and their declared vocabulary.          |
| `tokenCount`     | integer        | Total tokens in the merged cascade.                               |

**RECOMMENDED:** The primer payload SHOULD fit within 2,000 tokens of LLM context for typical Spectrum-scale datasets. Implementations that produce larger payloads SHOULD provide a `--summary` mode.

**RATIONALE:** The primer replaces the "DESIGN.md emit" approach explored in earlier RFC-C drafts. A live, queryable primer keeps the agent's session context current without requiring the agent to maintain a frozen prose summary that can drift from the dataset.

## Transports

**NORMATIVE:** A conforming implementation MUST expose the [Tool catalog](#tool-catalog) through at least one of the following transports.

### CLI

The reference CLI is `design-data` (see [`sdk/cli/`](../../../sdk/cli/)). RFC-C extends the existing subcommands (`validate`, `resolve`, `diff`, `query`) with:

* `design-data primer [PATH]` — emit the [Session primer](#session-primer) payload.
* `design-data suggest "<intent>" [--property <hint>]` — invoke `suggest_token`.
* `design-data explain <token-uuid|component-id>` — invoke `get_guidance`. (Deferred — not yet shipped; pending `get_guidance` wire-up.)

**NORMATIVE:** All RFC-C CLI output MUST default to JSON when stdout is not a TTY, and MUST emit human-friendly output when stdout is a TTY. This makes the CLI directly composable from agent shells without per-call format flags.

### MCP server

A reference MCP server is RECOMMENDED to ship as `@adobe/design-data-agent-mcp` (separate from the existing Spectrum-bound `@adobe/spectrum-design-data-mcp` to avoid coupling to a specific dataset).

**NORMATIVE:** The MCP server MUST register one tool per [Tool catalog](#tool-catalog) operation. Tool names MUST match the operation name in the table verbatim. Each tool's input schema MUST mirror the CLI flag set; agents that learn one transport SHOULD work with the other.

### Agent skill

A reference Claude Code Agent Skill is RECOMMENDED at `tools/design-data-agent-mcp/skills/design-data/SKILL.md`. The skill SHOULD trigger on intent words covering all three [Goals](#goals) — for example "design system", "design tokens", "drift", "spec-conformant", and explicit Spectrum mentions when the active manifest binds Spectrum.

**RECOMMENDED:** The skill SHOULD shell out to the CLI rather than embedding tool calls, so its description (the only persistent context cost) stays small and the heavy lifting happens out-of-band.

## `describe_component` return shape

The `describe_component` tool returns the component declaration object as stored in the dataset, extended with `tokenBindings` when Phase 6.7 data is present. A conforming implementation MUST include `tokenBindings` in the response when the component declaration contains that field.

```json
{
  "name": "button",
  "displayName": "Button",
  "meta": { "category": "actions", "documentationUrl": "https://spectrum.adobe.com/page/button/" },
  "options": {
    "variant": { "type": "string", "values": [{"value": "accent"}, {"value": "negative"}, {"value": "primary"}, {"value": "secondary"}], "default": "accent" }
  },
  "anatomy": [
    { "name": "icon",  "description": "Leading icon." },
    { "name": "label", "description": "Button text.", "required": true }
  ],
  "states": [
    { "name": "hover",    "trigger": "interaction", "precedence": 50 },
    { "name": "focus",    "trigger": "interaction", "precedence": 60, "layered": true },
    { "name": "disabled", "trigger": "prop",        "precedence": 100 }
  ],
  "tokenBindings": [
    { "token": "component-height-100", "context": "Minimum height" },
    { "token": "corner-radius-full",   "context": "Rounding" }
  ]
}
```

`tokenBindings` enables agents to retrieve a complete picture of a component's token usage — including shared structure and foundation tokens that do not carry the component name in their name-object — without issuing a second `query_tokens` call.

## Conformance

**NORMATIVE:** An agent surface implementation that claims conformance MUST:

1. Implement all NORMATIVE operations in the [Tool catalog](#tool-catalog).
2. Implement the [Session primer](#session-primer) operation.
3. Expose the catalog through at least one transport in [Transports](#transports).
4. Emit `validate_usage` diagnostics that match the structure produced by `validate::validate_all_with_options` (see `sdk/core/src/report.rs`): each diagnostic MUST include `rule_id`, `severity`, `message`, `instance_path`, `schema_path`, `file`, and `token` where applicable.
5. Honor manifest-based filtering: when a manifest is present in the session, `query_tokens` and `resolve_token` MUST respect `include`/`exclude` and MUST apply manifest overrides before returning results.

## Worked example

The following sketch shows an agent loop that adheres-to-Spectrum while authoring a non-bound component.

1. Agent calls `primer ./spectrum-data` and learns that `colorScheme` and `scale` are the active mode sets and that `button`, `picker`, and `card` are exposed components.
2. User asks for a "subtle hover background for a card on dark mode".
3. Agent calls `suggest_token "subtle hover background for card" --property background-color`.
4. Surface returns a ranked list including `background-color-hover` from Spectrum foundation and `background-color-card-hover` from a card component group.
5. Agent calls `resolve_token background-color-card-hover --color-scheme dark`.
6. Surface returns the resolved literal value for the dark-mode card hover background.
7. Agent emits CSS using that value and calls `validate_usage` against the proposed token document fragment to confirm no SPEC-NNN diagnostics fire.

The same loop, with a different manifest passed at primer time, authors a non-Spectrum system: the surface returns whatever tokens that dataset declares, and `validate_usage` enforces the same spec rules independent of which design system is in play.

## References

* [#714 — Design Data Specification (umbrella)](https://github.com/adobe/spectrum-design-data/discussions/714)
* [#625 — Token Authoring Workflow](https://github.com/adobe/spectrum-design-data/discussions/625)
* [#832 — Component Contract in Design Data Spec](https://github.com/adobe/spectrum-design-data/discussions/832) — supplies `describe_component` once implemented
* [Document blocks](document-blocks.md) (forthcoming, RFC-D / Phase 9) — supplies `get_guidance` payloads
* [`sdk/cli/src/main.rs`](../../../sdk/cli/src/main.rs) — CLI surface to extend
* [`sdk/core/src/report.rs`](../../../sdk/core/src/report.rs) — diagnostic shape
