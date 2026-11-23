<!-- Copyright 2026 Adobe. All rights reserved. -->

# shadcn registry examples

These files are generated output. The exporter tests compare against them, so regenerate them when the output changes.

## Commands

Build the CLI with `moon run sdk:build`, then run the `design-data` binary from `sdk/target/debug/`.

```bash
# Light and dark theme (registry:theme)
design-data export --format shadcn-theme > sdk/plugins/shadcn/examples/shadcn-theme.sample.json

# One component, plus registry.json (registry:component)
design-data shadcn registry --component action-button --output out/

# Every component
design-data shadcn registry --output out/
```

`--components-dir DIR` overrides where component declarations are read from.
Without it, the CLI uses the repository's `packages/design-data/components`.
When a platform manifest is selected (`--platform`, `DESIGN_DATA_PLATFORM`, or `default_platform`), items are built from the platform-merged catalog, so platform-owned implementation mappings appear in `meta.implementations`.

## Files

* `shadcn-theme.sample.json`: output of `export --format shadcn-theme` against the embedded dataset.
  It holds 834 color variables for each of `light` and `dark`, plus 1,874 scheme-independent non-color variables in `theme`.
* `action-button.registry-item.sample.json`: the `action-button` item written by `shadcn registry`
  from `packages/design-data/components/action-button.json`.

## Theme keys

Keys have no `--` prefix, for example `spectrum-gray-50`.
The shadcn CLI adds the prefix itself. A key that starts with `--` produces `var(----…)` in the generated `@theme inline` block.

Both color schemes are resolved from the graph. Scale and contrast come from `--scale` and `--contrast`, or the mode set default if you leave them out.
Tokens without a legacy key, and composite tokens such as typography or shadow, are skipped.
Component-scoped legacy tokens (`avatar-border-width`) come from the relationships catalog; deprecated ones are included, so consumers pinned to older names still resolve.
Values are CSS-ready: `*-font-weight` tokens are numbers (300 to 900), and `corner-radius-*` and `gradient-stop-*` fractions are percentages (`corner-radius-full` is `50%`).
`spectrum-sans-font-family-stack` is a font stack added by the exporter; the data has only the family name.

shadcn mirrors every `light` and `dark` key into `@theme inline` as `var(--name)`, which is a self-reference for non-color values.
So scheme-independent non-color values (sizes, widths) go in `cssVars.theme` as literals, which shadcn writes straight into `@theme inline`.
Only colors, and non-color values that differ by scheme, stay in `light` and `dark`.

## Quick start app

`quickstart/` is a Vite, React and Tailwind v4 app that applies the theme to shadcn's `Button` and `Badge`. See its README.

## Scope

Component items hold Spectrum Design Data metadata only: options, states, anatomy, accessibility, and implementation references.
The exporter writes no component source files and no Code Connect mappings.
Each item lists `spectrum-theme` as a registry dependency. Without `--base-url` that is the bare name, which the shadcn CLI cannot resolve.

## Hosted registry

The deploy-docs workflow runs `moon run sdk:shadcn-registry`, which publishes the registry to GitHub Pages. Nothing under `site/` is committed.

```bash
design-data shadcn registry --output site/r --base-url https://adobe.github.io/spectrum-design-data/r
```

With `--base-url`, the output is flat: `registry.json`, `spectrum-theme.json`, and one `{component}.json` per component.
Each item's `spectrum-theme` dependency becomes `{base-url}/spectrum-theme.json`, and `registry.json` lists the theme too.
Install a component, and its theme with it, using:

```bash
npx shadcn@latest add https://adobe.github.io/spectrum-design-data/r/action-button.json
```
