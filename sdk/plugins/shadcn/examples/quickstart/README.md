<!-- Copyright 2026 Adobe. All rights reserved. -->

# Spectrum in a shadcn app

A Vite, React and Tailwind v4 app that uses the Spectrum theme from `design-data export --format shadcn-theme` with shadcn's `Button` and `Badge`. The walkthrough is the article [Using Spectrum design data in a shadcn app](../../../../../docs/site/src/articles/using-spectrum-in-a-shadcn-app.md).

```bash
moon run sdk:build                      # from the repository root
export PATH="$PWD/sdk/target/debug:$PATH"
cd sdk/plugins/shadcn/examples/quickstart
npm install
npm run setup                           # spectrum-theme.json, theme CSS, button and badge
npm run dev
```

`setup` generates the theme, installs shadcn's stock `button` and `badge` into `src/components/` (gitignored, MIT licensed, not committed here), and copies SWC gen 2's Button and Action button CSS from `@adobe/spectrum-wc@2.0.0-beta.7` into `src/swc/` with `--swc-` token variables renamed to `--spectrum-` (`scripts/swc-css.mjs`). Those files are gitignored too: they are Apache-2.0 with an Adobe header and generated at setup, not committed or added to registry items. The theme goes into `src/index.css`. `src/spectrum-mapping.css` maps shadcn's variables to Spectrum's and is hand-written.

The `theme` script runs the CLI from a temporary directory. Inside this repository the CLI treats the current directory as a dataset and fails on the empty `spectrum-theme.json` the shell creates for the redirect. In your own app you can run `design-data export --format shadcn-theme > spectrum-theme.json` directly.

Don't commit the changes `setup` makes to `src/index.css`.
