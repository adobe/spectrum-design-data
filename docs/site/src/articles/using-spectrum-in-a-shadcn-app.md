---
title: "Using Spectrum design data in a shadcn app"
date: 2026-11-23T12:00:00Z # noon UTC avoids local-timezone date rollback in the `date` liquid filter
author: Spectrum Design Data
category: Concepts
description: >-
  Generate a light and dark Spectrum theme for a shadcn/ui and Tailwind v4 app
  with the design-data CLI, map it onto shadcn's variables, and see what that
  does and doesn't give you.
---

shadcn/ui components read a small set of CSS variables (`--primary`,
`--background`, `--border` and so on). The `design-data` CLI can write
Spectrum's tokens as a shadcn `registry:theme` item, so a shadcn app can use
Spectrum colors and sizes in light and dark. This page walks through it with a
small example app, and is plain about what you don't get yet.

## What you get

- **A theme item.** `design-data export --format shadcn-theme` writes every
  Spectrum token that has a legacy name as a CSS variable named
  `--spectrum-<token-name>`. Colors are resolved separately for light and dark.
  Sizes and other values that don't change with the scheme are written once.
- **Component metadata.** `design-data shadcn registry` writes one
  `registry:component` item per component, with its options, states, anatomy,
  accessibility data and implementation references. These items hold no source
  code and no styles.

## What you don't get

- **Component styling.** shadcn's `Button` and `Badge` keep their own shapes,
  sizes, radii and type. Only the colors come from Spectrum. A Spectrum badge is
  a rectangle with a small radius, and shadcn's is a pill, for example.
- **Typography.** Composite tokens such as type styles and shadows are skipped.
  The theme includes the font family name (`Adobe Clean Spectrum VF`), but the
  font is licensed and isn't loaded for you.
- **shadcn's own variables.** The theme only defines `--spectrum-*`. You map
  them onto `--primary`, `--background` and the rest yourself (step 3).

## 1. Generate the theme

With the CLI installed, run this from your app:

```bash
design-data export --format shadcn-theme > spectrum-theme.json
```

The output has `cssVars.light`, `cssVars.dark` and `cssVars.theme` for values
that don't depend on the scheme. Scale and contrast come from the dataset's
defaults (desktop, regular). Pass `--scale mobile` or `--contrast high` to
change them.

## 2. Add it to your project

```bash
npx shadcn@latest add ./spectrum-theme.json
```

The shadcn CLI writes the variables into your CSS file: `:root` and `.dark`
blocks for the two schemes, and an `@theme inline` block for the rest. Keys have
no `--` prefix in the JSON, because shadcn adds it.

## 3. Map shadcn's variables to Spectrum

Add a block like this after the theme. It's a choice, not generated output, so
change it to taste.

```css
:root {
  --background: var(--spectrum-background-base-color);
  --foreground: var(--spectrum-neutral-content-color-default);
  --primary: var(--spectrum-accent-background-color-default);
  --primary-foreground: var(--spectrum-white);
  --secondary: var(--spectrum-gray-200);
  --secondary-foreground: var(--spectrum-neutral-content-color-default);
  --destructive: var(--spectrum-negative-background-color-default);
  --border: var(--spectrum-gray-300);
  --input: var(--spectrum-gray-300);
  --ring: var(--spectrum-focus-indicator-color);
  --radius: var(--spectrum-corner-radius-medium-size-medium);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ...one --color-* line for each variable above */
}
```

Because `--spectrum-*` already switches between light and dark, the mapping
needs no `.dark` block of its own. Toggle the `dark` class on `<html>` as you
would in any shadcn app.

The example's [`spectrum-mapping.css`](https://github.com/adobe/spectrum-design-data/blob/main/sdk/plugins/shadcn/examples/quickstart/src/spectrum-mapping.css)
has the full list, including the card, popover, muted and accent variables.

## 4. Use shadcn components

```bash
npx shadcn@latest add button badge
```

In the example app, the default `Button` and `Badge` render with
`rgb(59, 99, 251)` in light and `rgb(64, 105, 253)` in dark. Those are the
values of `accent-background-color-default` in each scheme. The page background
is `#ffffff` in light and `#111111` in dark.

If your components live in a gitignored folder, tell Tailwind to scan it with
`@source "./components";`. Tailwind v4 skips gitignored paths when it looks for
class names, and the buttons end up unstyled.

## Try the example

`sdk/plugins/shadcn/examples/quickstart` is a Vite, React and Tailwind v4 app
with a light and dark toggle, five button variants plus a disabled one, three
sizes and four badges. Build the CLI (`moon run sdk:build`) and put `target/debug` on your
`PATH`, then:

```bash
cd sdk/plugins/shadcn/examples/quickstart
npm install
npm run setup   # writes spectrum-theme.json, adds the theme, button and badge
npm run dev
```

`npm run setup` generates the theme from a temporary directory. Inside this
repository the CLI otherwise treats your current directory as a dataset, and a
half-written `spectrum-theme.json` stops it loading.

## Hosted registry

The docs deploy publishes the registry at
`https://adobe.github.io/spectrum-design-data/r/`. Once it's live, you can skip
step 1 and install the theme with the URL:

```bash
npx shadcn@latest add https://adobe.github.io/spectrum-design-data/r/spectrum-theme.json
```

Component items are at `/r/<component>.json`. They depend on the theme, so
adding one installs it too.

## What's next

Generating component styles from Spectrum's visual recipes, so shadcn
components match Spectrum's shapes and sizes as well as its colors, is not done.
Until it is, treat this as a Spectrum palette for shadcn, not Spectrum
components.
