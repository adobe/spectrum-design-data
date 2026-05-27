# Scenarios

The design-data spec and tooling support two primary workflows. This page is a self-serve entry point for designers and engineers who want to evaluate or adopt the system.

> Both scenarios share the same substrate: a normative spec, JSON schemas, 43 SPEC validation rules, a Rust CLI (`design-data`), an MCP server, and a Claude Code skill. The only thing that changes between them is what you bring to the table.

***

## Scenario A — Prototype against an existing system (Spectrum)

You are a designer or engineer on a product team. Spectrum is your design system. You want to build a prototype, evaluate a change, or answer a design question without waiting on a person in the middle.

### What you get on day one

* **Live token graph** at [opensource.adobe.com/spectrum-design-data/s2-visualizer](https://opensource.adobe.com/spectrum-design-data/s2-visualizer/) — search, click any token, walk the cascade chain, toggle dimension context (light/dark × desktop/mobile × regular/high-contrast)
* **81 fully-declared Spectrum components** with anatomy, states, accessibility (role, intents, WCAG citations), and token bindings — all machine-readable
* **Programmatic access** via the `design-data` CLI to query, validate, and inspect

### Common tasks

**See what a component declares:**

```bash
design-data component button --components-dir packages/design-data-spec/components
```

**Find all tokens used by a component:**

```bash
design-data query packages/design-data-spec --filter "component=button"
```

**Validate a change to the dataset:**

```bash
design-data validate packages/design-data-spec --strict
```

**Open a primer for an agent session:**

```bash
design-data primer packages/design-data-spec
```

### Talking to the system through an agent

Install the `@adobe/design-data-agent-mcp` MCP server or the Claude Code skill. The agent can answer questions like:

* *"What tokens does the button component use in its hover state, and what do they resolve to in dark mode?"*
* *"Which components declare a `dialog` accessibility role?"*
* *"Draft a new component declaration for a banner that follows the patterns alert-banner uses."*

The agent reads the live spec — not a stale doc, not a copy in someone's repo.

***

## Scenario B — Start a blank design system

You are a team launching a new product or design system. You want a contract that catches design-system mistakes before they ship, that designers and engineers can both author against, and that an agent can participate in.

### What the spec gives you on day one

* **A normative format** for tokens, components, anatomy, states, accessibility, and document blocks (see the [spec chapters](../packages/design-data-spec/spec/index.md))
* **11 JSON schemas** (draft 2020-12) for structural validation
* **43 SPEC validation rules** for semantic validation — reference integrity, alias resolution, cascade coverage, naming consistency, accessibility completeness, deprecation lifecycle
* **A CLI** for validating, querying, diffing, migrating, and exporting to Figma
* **An MCP server + Claude Code skill** so agents can author and validate alongside humans

### What a minimal valid component looks like

See [tools/demo/clean-component-example.json](../tools/demo/clean-component-example.json) — a complete declaration with identity, options, anatomy, states (with accessibility-aware fields), a top-level accessibility role + WCAG citations, and a typed prose block. This is the contract a new system targets.

### Authoring loop

1. Author a component or token declaration as JSON, following the schemas
2. Validate locally:
   ```bash
   design-data validate <your-spec-dir> --strict
   ```
3. SPEC rules catch mistakes — alias targets, missing accessibility data, ambiguous cascade resolution, naming drift — at authoring time, not at runtime
4. Ship the dataset; consumers (build pipelines, agents, visualizers) read it through the same contract

### Agent-authored declarations

With the MCP installed, a designer can describe a new component in plain language. The agent reads the spec, drafts a conformant declaration, runs `design-data validate` on the draft, and surfaces the result. The spec is what makes that loop safe.

***

## What's shared between the scenarios

Both rely on the same three guarantees:

1. **One source of truth** — schema + spec rules + CLI. There is no second interpretation layer between the design system and its consumers.
2. **Continuous validation** — every change is checked against 43 rules. Drift fails loud.
3. **Agent-readable** — the spec is structured so an agent can participate in authoring, querying, and review without bespoke integration work.

***

## References

* [Spec index](../packages/design-data-spec/spec/index.md) — all normative chapters
* [SPEC rule catalog](../packages/design-data-spec/rules/rules.yaml) — all 43 validation rules with messages and spec cross-references
* [CLI](../sdk/cli/) — `validate`, `resolve`, `diff`, `query`, `migrate`, `figma`, `primer`, `component`, `suggest`, `write`, `write-token`, `authoring-session`
* [Component declarations](../packages/design-data-spec/components/) — 81 declared Spectrum components
* [Agent surface](../tools/design-data-agent-mcp/) — MCP server for agent integrations
* [s2-visualizer](https://opensource.adobe.com/spectrum-design-data/s2-visualizer/) — live token graph for Spectrum
