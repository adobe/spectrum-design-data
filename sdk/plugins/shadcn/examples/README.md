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

## Files

* `shadcn-theme.sample.json`: output of `export --format shadcn-theme` against the embedded dataset.
  It holds 1,194 variables for each of `light` and `dark`.
* `action-button.registry-item.sample.json`: the `action-button` item written by `shadcn registry`
  from `packages/design-data/components/action-button.json`.

## Theme keys

Keys have no `--` prefix, for example `spectrum-gray-50`.
The shadcn CLI adds the prefix itself. A key that starts with `--` produces `var(----…)` in the generated `@theme inline` block.

Both color schemes are resolved from the graph. Scale and contrast come from `--scale` and `--contrast`, or the mode set default if you leave them out.
Tokens without a legacy key, and composite tokens such as typography or shadow, are skipped.

shadcn writes non-color values (sizes, widths) into `@theme inline` as `--name: var(--name)`.
Treat those variables as plain custom properties set in `:root` and `.dark`, not as Tailwind theme values.

## Scope

Component items hold Spectrum Design Data metadata only: options, states, anatomy, accessibility, and implementation references.
The exporter writes no component source files and no Code Connect mappings.
Each item lists `spectrum-theme` as a registry dependency, but nothing hosts the theme yet.
Publish the generated theme next to the component items before installing them with the shadcn CLI.
