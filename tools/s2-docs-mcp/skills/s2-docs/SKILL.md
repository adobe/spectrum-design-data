---
name: s2-docs
description: >
  Look up Spectrum 2 (S2) component documentation, design guidelines, and usage
  patterns when building with React Spectrum or Spectrum Web Components. Use
  when the user mentions Spectrum, S2, React Spectrum, RSP, Spectrum Web
  Components, or SWC, or names a Spectrum component (Button, Picker, ComboBox,
  TextField, ActionButton, etc.). Helps prevent drift from documented S2 design
  decisions during prototyping.
when_to_use: >
  Trigger on: "which Spectrum component", "React Spectrum", "Spectrum Web
  Components", "@adobe/react-spectrum", "@spectrum-web-components", component
  name imports, "S2 tokens", "Spectrum spacing", "Spectrum variant", or any
  question about what a Spectrum component should do or look like.
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/lookup.js *)
---

# Spectrum 2 Docs

Fetch canonical S2 docs before suggesting any Spectrum component or pattern.
This prevents common vibe-coding mistakes: wrong variant, hard-coded sizes,
divider-first layouts, missing required props.

## Lookup commands

**Get a specific component** (use before writing any RSP/SWC code):

```
node ${CLAUDE_SKILL_DIR}/scripts/lookup.js get <component-name>
```

**Find components by use case**:

```
node ${CLAUDE_SKILL_DIR}/scripts/lookup.js use-case "<phrase>"
```

**Search by name**:

```
node ${CLAUDE_SKILL_DIR}/scripts/lookup.js search <query>
```

**List all components in a category** (`actions`, `containers`, `feedback`, `inputs`, `navigation`, `status`):

```
node ${CLAUDE_SKILL_DIR}/scripts/lookup.js list --category <category>
```

### When working in Cursor

Cursor does not support inline shell injection. Use Bash explicitly with `--cursor` for trimmed, delimited output:

```
node ${CLAUDE_SKILL_DIR}/scripts/lookup.js get <component-name> --cursor
node ${CLAUDE_SKILL_DIR}/scripts/lookup.js use-case "<phrase>" --cursor
```

## Workflow

1. **Identify the component(s)** the user needs — use `use-case` or `search` if unsure.
2. **Fetch the docs** with `get <name>` for each relevant component.
3. **Read the "Component options" table** — note variants, sizes, required props.
4. **Apply the anti-drift checklist** before writing code.

## Anti-drift checklist

After fetching docs, verify every suggestion against:

* [ ] **Correct component** — ComboBox (freeform + autocomplete) vs Picker (selection only), ActionButton vs Button, etc.
* [ ] **Correct variant** — don't default to `accent`; match the use case (primary, secondary, negative)
* [ ] **No hard-coded sizes** — use Spectrum size tokens, not px values
* [ ] **Spacing-first grouping** — S2 uses spacing to separate content, not dividers
* [ ] **Required props present** — e.g. `label` on all inputs, `necessityIndicator` when required
* [ ] **Static color used correctly** — only when placed on a custom background

## Key S2 design decisions (quick reference)

* **Button variants**: `accent` = primary CTA (max 3 per view); `primary` = medium emphasis; `secondary` = low emphasis; `negative` = destructive
* **ActionButton vs Button**: ActionButton is compact and icon-focused for toolbars; Button is for primary flows
* **ComboBox vs Picker**: ComboBox allows freeform text + autocomplete; Picker is select-only
* **Spacing over dividers**: S2 replaced dividers with spacing as the primary grouping mechanism
* **Size tokens**: always use `size="S|M|L|XL"` prop, never hard-coded px
