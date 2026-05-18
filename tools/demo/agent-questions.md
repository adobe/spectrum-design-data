# Prepared Agent Demo Questions

Use one of these in Claude Code with the `design-data` MCP enabled. The first is the primary; the others are backups.

***

## Primary question

> Using the design-data MCP, look up the button component and tell me:
>
> 1. What its accessibility role and keyboard intents are
> 2. Which states it declares
> 3. Which token resolves the default background color in the dark color scheme
>
> Show the answers with citations from the spec, not a guess.

**What success looks like**: the agent calls `mcp__design-data__component` (or equivalent) to read `button`, then `mcp__design-data__resolve` (or the CLI) for the dark-mode color. It quotes the actual `role`, `keyboardIntents`, the list of state names, and the resolved hex/rgb value.

**Why this lands**: the audience sees the design system answering a multi-part question directly. No human reads the spec, opens Figma, runs a build, and reports back — the agent does it from one source in seconds.

***

## Backup question (if the primary is too long)

> Using the design-data MCP, what does `accent-background-color-default` resolve to in dark mode on mobile with high contrast?

**Why this works**: smaller surface, single fact, demonstrates dimensional resolution. Good if time is tight in the demo block.

***

## Stretch question (if Demo A is going well and time allows)

> Using the design-data MCP, draft a new component declaration for a "demo-banner" component that has a dismiss button, an icon slot, and follows the accessibility patterns used by alert-banner. Don't write it to disk — show me the JSON.

**Why this is interesting**: shows the agent authoring against the spec, not just reading. Demonstrates the "agent participates in design" story directly. Only run this if Demo A felt strong — it's higher variance.

***

## If the MCP is not connected

Fall back to running these directly in the terminal — the answers are equivalent, just less theatrical:

```bash
design-data component button --components-dir packages/design-data-spec/components
design-data resolve accent-background-color-default \
  --color-scheme dark --scale mobile --contrast high \
  packages/design-data-spec
```
