---
title: "Exporting Spectrum tokens to DTCG"
date: 2026-09-17T12:00:00Z # noon UTC avoids local-timezone date rollback in the `date` liquid filter
author: Spectrum Design Data
category: Concepts
description: >-
  How resolve, query, and export produce W3C DTCG-conformant output from
  Spectrum's token data, and what to know before wiring it into Style
  Dictionary, Terrazzo, or Tokens Studio.
---

The [Design Tokens Community Group](https://tr.designtokens.org/format/) (DTCG)
format is the closest thing the token ecosystem has to a shared file shape:
`$value`, `$type`, `$description`. Style Dictionary, Terrazzo, and Tokens Studio
all read it. Spectrum's own token model predates DTCG and is structured
differently: UUID identity, a cascade of aliases, mode-aware resolution. Getting
from one to the other takes a real conversion step, not just a rename.

The `design-data` CLI does that conversion for you. This article covers the
three commands that emit DTCG output, what they're each for, and where the
format's known rough edges are.

## Three ways to get DTCG out

| Command | Scope | Use it when |
| --- | --- | --- |
| `resolve --format dtcg` | One token property | You want a single value, resolved for one mode context |
| `query --format dtcg` | A filtered subset | You want the tokens for one component, category, or filter |
| `export --format dtcg` | The whole dataset | You want everything, as one document, for a downstream tool |

All three accept the same mode flags (`--color-scheme`, `--scale`,
`--contrast`), so the DTCG output reflects a specific, resolved context rather
than an unresolved cascade.

<figure>
  <img src="/assets/images/exporting-tokens-to-dtcg-scopes.png" alt="Three nested scopes: export (the whole dataset) contains query (a filtered subset), which contains resolve (one property).">
  <figcaption>The three commands differ only in scope — each is a narrower view onto the same resolved data.</figcaption>
</figure>

```bash
design-data resolve color packages/design-data/tokens --color-scheme light --format dtcg
# {
#   "accent-background-color-default": {
#     "$value": "#3b63fb",
#     "$type": "color"
#   }
# }

design-data query packages/design-data/tokens --filter "component=button" \
  --format dtcg --color-scheme dark

design-data export packages/design-data/tokens --color-scheme dark --format dtcg
# {
#   "accent-background-color-default": { "$value": "#4069fd", "$type": "color" },
#   "font-size-200": { "$value": { "value": 19.0, "unit": "px" }, "$type": "dimension" },
#   ...
# }
```

## Where `$type` comes from

Design Data Spec has a `$valueType` field for exactly this purpose, but it
isn't populated on any token in the corpus yet. So the DTCG exporter derives
`$type` from something that already exists on every token: its `$schema`
token-type URL. `color.json` becomes `color`, `dimension.json` becomes
`dimension`, `typography.json` becomes `typography`, and so on.

The document shape is flat, keyed by the token's legacy kebab-case name
(`accent-background-color-default`), rather than nested by the structured
`name` fields the newer spec uses. That's deliberate: it reproduces the names
ecosystem tools and published CSS custom properties already use, so there's no
translation step on the consuming end.

## Aliases resolve, they don't pass through

A resolved cascade winner is frequently an alias record: a `$ref` pointing at
another token's UUID, with no literal value of its own. DTCG's `$value`
describes an actual value, so the exporter always follows the alias down to
its leaf first. For composite tokens like typography and drop-shadow, that
includes any inline `{alias}` references inside the composite's own
sub-values, and those resolve in the same mode context you passed on the
command line: a typography token's `font-size` alias resolves to the
`dark`/`desktop`/whatever value you asked for, not to some default-context
sibling.

<figure>
  <img src="/assets/images/exporting-tokens-to-dtcg-alias-resolution.png" alt="An alias record ($ref) points to a target token ($ref), which resolves to a leaf value ($value).">
  <figcaption>An alias chain always resolves down to a leaf value — DTCG's $value never holds an unresolved $ref.</figcaption>
</figure>

## Known limitation: color format

DTCG's draft spec represents color as a `{colorSpace, components, alpha}`
object. This exporter emits a normalized CSS hex string instead. That's a
deliberate deviation, not an oversight: Style Dictionary and Terrazzo, the
tools this format targets, consume CSS color strings, and matching what they
actually read is worth more here than matching the letter of a still-evolving
draft.

## Further reading

- [Specification](/spec/): see the agent-readable surface spec for the full
  CLI contract, including which subcommands accept `--format dtcg`
- [Tokens](/tokens/): the current token reference
- [Spectrum Design Data on GitHub](https://github.com/adobe/spectrum-design-data)
