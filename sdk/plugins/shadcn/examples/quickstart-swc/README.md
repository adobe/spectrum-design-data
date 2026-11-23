<!-- Copyright 2026 Adobe. All rights reserved. -->

# Spike: Spectrum shadcn theme + SWC gen 2 global CSS

Bead `spectrum-design-data-y3up.2`. Not for merging as is. Renders SWC gen 2's published light-DOM Button, Action button and Link stylesheets (`@adobe/spectrum-wc@2.0.0-beta.7`, `dist/global-*.css`) on our shadcn theme, with `--swc-` token variables renamed to `--spectrum-`.

```bash
export PATH="<repo>/sdk/target/debug:$PATH"   # a design-data CLI built from this checkout
npm install
npm run setup    # theme -> spectrum-theme.json, shadcn add, copy + rename SWC CSS into src/swc/
npm run dev      # /  demo, /compare.html  token comparison (window.__cmp)
```

`scripts/swc-css.mjs` renames only variables that `tokens.css` defines as tokens. Component hooks (`--swc-button-*`) keep their names. SWC CSS is copied at setup time and gitignored; do not add it to registry items.

## Results

* **Renders.** Button (default, secondary, accent, negative, primary and secondary outline, disabled, as a link, sizes S to XL), Action button (XS to XL, quiet, disabled) and the global link style all render with the right shapes, sizes and colors in light and dark. In the browser the accent button is `rgb(59, 99, 251)` in light and `rgb(64, 105, 253)` in dark, our theme's values.
* **Variables the CSS reads.** 46 token variables (47 references). 46 are defined by our theme at runtime. Missing: `--spectrum-sans-font-family-stack` (an SWC custom token: Adobe Clean Spectrum VF, then Source Sans Pro and system fonts). Our theme has only `sans-serif-font-family: Adobe Clean Spectrum VF`. Without it the `font-family` declaration is invalid and buttons inherit the page font.
* **Values vs SWC `tokens.css`.** Of the 1,025 token names both define, compared as computed values with SWC's `swc.css` scale class and our `.dark` class: 989 identical in light and in dark, 12 differ, 24 are strings the harness can't type (below).
  * 10 are alpha differences in static black and white colors (`disabled-static-*`, `static-*-track-*`), for example `disabled-static-black-background-color` 0.08 (SWC) vs 0.09 (ours). SWC pins `@adobe/spectrum-tokens` 15.6.0 and we're at 15.9.1; our alias for the first is `transparent-black-100`, SWC's chain goes through `transparent-static-black-150`. Consistent with version skew; I checked only that one.
  * `component-size-width-ratio-down` 0.33 vs 0.3333 (precision).
  * `black-font-weight` is a number in SWC (900) and the word `black` in ours.
  * Of the 24 strings, the real differences are two groups: **font weights** (`light`, `regular`, `medium`, `bold`, `extra-bold`, `black` are words in ours, 300 to 900 in SWC; words are invalid as CSS `font-weight`) and **percentages** (`corner-radius-full` and `corner-radius-1000` are `0.5` in ours, `50%` in SWC; six `gradient-stop-*` are `0` vs `0%`). SWC converts both in `cssSyntaxConversions`. Font family names are unquoted in ours and quoted in SWC, which is equivalent.
* **What broke.**
  1. `global-link.css` does `@import url("./link.css")` after its first rule, which the bundler drops with a warning. Fix: import `link.css` first from `index.css` and strip the line (the script does).
  2. The missing font stack above.
  3. Nothing sets the page background or text color. `body` needs `--spectrum-background-base-color` (done in `index.css`).
  4. No Badge: SWC has no global stylesheet for it yet.
* **Not an issue.** SWC's layers (`swc-global-elements`) sit above Tailwind's layers when Tailwind is imported first, so Tailwind's preflight doesn't override them. None of the four files use `light-dark()`. Our `.dark` class plus `color-scheme` is enough.
* **Size.** The four CSS files are 32 KB raw. The built stylesheet is 92 KB (14 KB gzipped), including the theme.
* **Not tested.** Hover, active and focus-visible states (rules are present; I didn't drive them), forced-colors, high contrast, mobile scale (`--swc-theme--sizeL`), RTL, icon buttons and pending state.
