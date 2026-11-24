---
name: design-data
description: >
  Look up Spectrum design tokens, component schemas, and design-system decisions
  when building with or extending Adobe Spectrum. Use when the user asks about
  token values, component options, naming conventions, or Spectrum design
  guidelines. Read-only lookup against an embedded Spectrum
  snapshot; it does not generate component code.
metadata:
  author: adobe
  version: "2.2.33"
  designDataVersion: "4.5.0"
when_to_use: >
  Trigger on: token names (color, spacing, typography, dimension), "which token",
  "Spectrum component options", design-data primer, query tokens, suggest token,
  resolve token value, component schema, Spectrum guideline, render a component, component
  preview or image (SVG or PNG), Adobe Clean font, @adobe/design-data-mcp.
allowed-tools: mcp__plugin_spectrum-design-data_design-data__design-data-primer, mcp__plugin_spectrum-design-data_design-data__design-data-query, mcp__plugin_spectrum-design-data_design-data__design-data-suggest, mcp__plugin_spectrum-design-data_design-data__design-data-refinements, mcp__plugin_spectrum-design-data_design-data__design-data-component-tokens, mcp__plugin_spectrum-design-data_design-data__design-data-component, mcp__plugin_spectrum-design-data_design-data__design-data-component-search, mcp__plugin_spectrum-design-data_design-data__design-data-resolve, mcp__plugin_spectrum-design-data_design-data__design-data-guideline-list, mcp__plugin_spectrum-design-data_design-data__design-data-guideline, mcp__plugin_spectrum-design-data_design-data__design-data-visual-recipe, mcp__plugin_spectrum-design-data_design-data__design-data-render, mcp__plugin_spectrum-design-data_design-data__design-data-font-status
---

# Spectrum Design Data

Read-only lookup of Spectrum design tokens, component schemas, and design
guidelines through the `@adobe/design-data-mcp` MCP server. The server runs
in-process against a Spectrum snapshot embedded in the package.

This skill complements React Spectrum and Spectrum Web Components guidance. It
answers from data; it does not generate components or integrate with a framework.

## Setup

Installing the `spectrum-design-data` **plugin** (Claude Code or GitHub Copilot) registers
the MCP server for you: no manual MCP configuration. Requires Node.js `>=20.12.0`.
The first run downloads the pinned package with `npx`; after that, lookups use the
embedded snapshot.

If you installed only this skill folder (for example as a Cursor rule), the tools
are not available until you add the server yourself, pinned to the version this
skill was written for:

```json
{
  "mcpServers": {
    "design-data": {
      "command": "npx",
      "args": ["-y", "@adobe/design-data-mcp@1.17.6"]
    }
  }
}
```

## Tool names

Tools are listed below by their server names. Clients prefix them: Claude Code
exposes the plugin's tools as `mcp__plugin_spectrum-design-data_design-data__<tool>`, and a
manually configured server as `mcp__design-data__<tool>`. Use whichever the client
lists.

## Tools

### `design-data-primer`

Overview of the embedded dataset: token count, mode-sets, component list, taxonomy
fields, guidelines, and provenance (`provenance.designDataVersion` is the snapshot
version). `tokenTiers` explains the token tiers; `semanticSpecificity` explains specificity; `fieldTiers` lists the fields that are limited to
certain tiers (`allowedTokenTiers`) or imply one (`impliesTokenTier`). **Call this first in
a session.** No required inputs.

### `design-data-query`

Filter tokens by expression. Required: `filter` (string), e.g. `component=button`,
`component=button,state=hover`, `property=*color*`, `state=hover,colorScheme=dark`.
Filterable fields: `property`, `component`, `variant`, `state`, `colorScheme`, `scale`,
`contrast`, `uuid`, `tier`, and the purpose fields `object`, `anatomy` and `colorRole`
(`tier=semantic,object=background,colorRole=accent`). `component` matches the tokens a component's relationships bind to.
Optional: `limit` (integer, default 25, max 200) and `detail` (`compact`, the default, or
`full`). Returns `{ total, shown, tokens }`. Each compact token has `name`, `value` (aliases
already followed, so there is nothing to look up by uuid), `layer`, `uuid`, and its
`tier`, its `purposeFields` when it has any, and its `colorScheme`/`scale`/`contrast` when it has them; active tokens come before deprecated ones.
When a token's value differs by a mode its name does not pin, it has `values` instead of
`value`, keyed by mode-set then mode (`values.colorScheme.dark`): use the one for the user's
mode, never the first.
When `total` is larger than `shown`, add `state=`, `property=` or `colorScheme=` to the filter
instead of raising `limit`. `detail: "full"` returns the complete token objects and is large.

### `design-data-suggest`

Rank tokens against a natural-language intent. Required: `intent` (string), e.g.
`"primary CTA button background color"`. Optional: `limit` (number, default 5). Each match has
`name`, `value` (aliases followed), `layer`, `uuid`, modes and `confidence`.

### `design-data-refinements`

A token's specificity and its same-property neighbors (see Semantic specificity below).
Required: `token` (name, uuid or conceptId; for a token without a name, the `property=… scaleIndex=…` text that query shows). Optional: `limit` (integer, default 10, max 50, for
each of `narrower` and `broader`). Returns `{ token, specificity: { tier, purposeFields },
narrower, narrowerTotal, broader, broaderTotal }`; each neighbor has `name`, `fields`,
`specificity`, `valueMatch` and `differingModes`.

### `design-data-component-tokens`

Which tokens a component uses for what. Required: `component` (kebab-case ID). Optional:
`context` (text the binding's context contains, e.g. `border`), `property`, `state` and `limit`
(default 40). Returns `{ component, total, shown, bindings }`. Each binding has `context`
(Background, Border, Label, ...), `property`, `part`, `when` (the options and `state` it applies
under), `token`, `tier` and its value (`values` by mode when it differs). A binding without
`when` is the default; one with `when` replaces it under those options. Prefer this over
`design-data-query` with `component=` to answer "what does X use for Y in state Z": the query
returns tokens but not what each one is for. If the component has no binding for something, the
data has none; say so instead of guessing. `state` matches the component's declared state ids
exactly, and states differ (`focus-+-not-hover` is not `keyboard-focus`); `otherStates` lists the
other states with bindings, so check it before concluding a state has nothing.

### `design-data-component`

Full component declaration (displayName, description, options such as variants,
sizes, states, booleans). Required: `id` (kebab-case, e.g. `action-button`).

### `design-data-component-search`

Find components by name, description, or docs text. Required: `query` (string).
Optional: `category` (string), `limit` (integer, default 10). Returns id,
displayName, category, and a snippet; pass the id to `design-data-component`.

### `design-data-resolve`

Resolve a token property to its value for a mode context. Required: `property`
(string, e.g. `corner-radius`). Optional: `colorScheme` (`light`/`dark`),
`scale` (`desktop`/`mobile`), `contrast` (`regular`/`high`), and narrowing by
`component`, `variant`, `state`, `colorRole`, or `excludeDeprecated`. Errors when no
token matches. Active tokens rank above deprecated ones. Ambiguity can still occur:
when `ambiguous: true`, the `token` is only the top pick; narrow further or report the
`alternatives` instead of presenting one value as definitive.

### `design-data-guideline-list` and `design-data-guideline`

`design-data-guideline-list` lists guideline pages (optional `category`:
`designing`, `fundamentals`, `developing`, `support`). `design-data-guideline`
returns one page by `id`, the `slug` from the list (e.g. `colors`).

### `design-data-visual-recipe` and `design-data-render`

`design-data-visual-recipe` returns a component's visual recipe by `id`; only
components with a recipe are available (the error lists them). `design-data-render`
draws one. Required: `component`. Optional: `size` (default `m`), `states` (e.g.
`["hover"]`), `options` (object), `colorScheme`, `scale`, `label`, `width` (px),
`format` (`svg` by default, or `png`), `pixelRatio` (PNG only, 1 to 4, default 2) and
`fontPath` (PNG only, see Fonts).

* `svg` returns the markup as text. Its text is drawn in whatever font the viewer has.
* `png` returns an image and a JSON block `{ font, diagnostics }`. Show the image to the
  user. Read `font` before describing it (see Fonts), and mention anything in
  `diagnostics` that affects what they see.

PNG output and `design-data-font-status` need an `@adobe/design-data-mcp` newer than 1.11.0.
An older server ignores `format: "png"` and returns SVG text, and has no
`design-data-font-status` tool. If a `png` call returns text that starts with `<svg`, or the
status tool is missing, tell the user the MCP server is out of date and to update it (the
plugin's next release, or `npx -y @adobe/design-data-mcp` without a version pin); do not present
the SVG as a PNG.

### `design-data-font-status`

Which font draws text in PNG renders: `{ found, fallback, using, family, installed,
rejected, related, help, searched }`. Optional: `fontPath` to check a specific file. Call it before a
PNG when the user cares about typography, or any time a render's `font.fallback` is
true.

## Fonts for PNG renders

PNG text uses **Adobe Clean Spectrum VF** when it is installed on the user's machine:
the server finds it by itself in the usual font folders and in Creative Cloud's font
cache, so there is nothing to ask the user for. Order: Adobe Clean Spectrum VF Roman
(`.ttf`), then Adobe Clean VF Roman (`.ttf`), then a bundled open font (Source Sans 3).
Adobe Clean Serif VF, Italic and `.otf` files are never used.

Follow the status, not a guess:

* `font.found` is `true`: the real font was used. Do not tell the user to download or
  install anything.
* `font.fallback` is `true`: name the font actually used (`font.family`, `font.using`; it
  is Adobe Clean VF when `font.installed` is `true`, else bundled Source Sans 3), say its
  metrics, spacing and wrapping may differ from Adobe Clean Spectrum VF, and do not call
  the image exact. Then pass on `font.help`.
  For an Adobe employee that means: download `AdobeCleanSpectrumVF-Roman.ttf` from the
  Brand Center (<https://inside.corp.adobe.com/content/inside/en/brand-center/font.html>,
  employees only) and install it (double-click the file). If they are not at Adobe they
  cannot get the font, so the fallback is the best this tool can do; say so plainly.
* `font.rejected` lists files that were found but cannot be used (for example the `.otf`
  version: only the `.ttf` file works, and the Italic file is not used for upright
  text). Tell the user which file and why.
* `font.related` lists other Adobe Clean fonts on the machine. Creative Cloud's static
  "Adobe Clean" is a different font and is not used.
* The user says the font is installed but `found` is `false`: ask for the file's full
  path and pass it as `fontPath`. To make it permanent, they set `DESIGN_DATA_FONT` to
  that path in the MCP server's `env` (in the MCP configuration), or pick the file in the
  extension's "Adobe Clean Spectrum VF font file" setting where the client has one.
* Never offer, attach, or paste the font file, and never describe the font as something
  you can download for them.

## Token tiers

Every token is `primitive` (raw values), `semantic` (a shared purpose or structural role) or
`component` (defined for one component). The tier is usually not written in the data: it is
derived from the token's name fields and value, and a `tokenTier` on the token overrides it.
The `component` tier holds only tokens whose name has a `component` field, not every token a
component binds through relationships; use `component=<name>` for those. In the foundation
dataset component-specific data lives in relationship records, so that tier is nearly empty.
Query results show `tier`, and `tier=semantic` filters by it. A field's `allowedTokenTiers`
in the primer's `fieldTiers` says where it may be used (`scaleIndex` is for primitive and
semantic tokens only).

## Semantic specificity

A token's specificity is how much its name says about its purpose: its tier, then how many
`purposeFields` it has (name fields such as `colorRole`, `object` and `state`). It is derived
from the name, never stored. More purpose fields means a more specific token, but it only
orders tokens: it does not say a token fits. When a token's name has fewer purpose fields than
what you are building needs (a hover state, a particular part), call `design-data-refinements`
with the token name. `narrower` lists same-property tokens that add fields, `broader` ones that
drop them; each shows the `fields` it adds or lacks, and a `valueMatch`:

* `drop-in`: the same value in every mode. This does not mean it means the same thing.
* `consider`: the value differs in some mode (`differingModes`, or `all`). Treat it as a design
  question and tell the user; never swap silently.

Before using a narrower token, check its added fields against the use: `variant=subtle` or
`subdued` marks a different style, not a more specific version of the same one. When nothing
narrower fits, the general token is correct.

## Building a custom component

When the user builds something Spectrum has no component for, or changes an existing one:

1. If a Spectrum component is close, call `design-data-component-tokens` for it to see which
   token it uses for each part and state (`context`, `when.state`). Reuse its tokens for the
   matching parts.
2. For a part nothing covers, query the semantic tier by what it is for:
   `tier=semantic,object=background,colorRole=neutral,state=hover` with `sort: "specificity"`.
3. Call `design-data-refinements` on the closest token. Use a narrower token only if its added
   fields fit the use, and tell the user when it is `consider`.
4. Resolve each chosen token for every mode (`values` in the results), not just light.
5. If the data has no token for a state or part, say so and name the nearest primitive as a
   design decision. Do not state a gray, size or token name you did not read in a result.

## Workflow

1. `design-data-primer` to see what data exists.
2. `design-data-query` when you know the property, component, or state.
3. `design-data-suggest` when the user describes an intent.
4. `design-data-component-search`, then `design-data-component`, for component options.
5. `design-data-resolve` for a concrete value in a given mode.
   `design-data-refinements` for a token's specificity and narrower or broader neighbors.
6. `design-data-guideline-list`, then `design-data-guideline`, for design guidance.
7. `design-data-render` to draw a component (SVG, or PNG with a font status to relay);
   `design-data-visual-recipe` to read its recipe.

## Limits

* Read-only; nothing is written or validated.
* Answers reflect the embedded snapshot, not the live Spectrum site. Report
  `provenance.designDataVersion` when the version matters. The primer makes a
  best-effort registry check and adds `provenance.datasetStatus` when a newer data
  package exists (set `DESIGN_DATA_SKIP_VERSION_CHECK=1` to disable it).
* Guidelines are an imported copy of public Spectrum site content and may lag it.
* Custom datasets, validation, diffing, and authoring are out of scope; use the
  `design-data-agent` skill from the
  [spectrum-design-data repository](https://github.com/adobe/spectrum-design-data/tree/main/tools/design-data-agent-mcp).
