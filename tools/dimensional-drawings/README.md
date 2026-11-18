<!-- Copyright 2026 Adobe. All rights reserved. -->

# Dimensional drawings

Interactive, Apple-style dimensional drawings of Spectrum components, generated from visual recipes. Each sheet is monochrome by default, with codes (`P1`, `H1`, `R1`) tied to tokens and formulas. Sizes, states, color and label text are interactive, and dimensions animate with the shape.

The style comes from [enesozturk/dimensional-drawing](https://github.com/enesozturk/dimensional-drawing) (MIT). The numbers are not measured by hand: they come from the resolved scene that `design-data render` produces, which names the token behind every value.

## Contents

- `extract-button-ios.mjs`: renders every size, style, state and scheme of `button-ios` and writes `data.json` (git-ignored). It asserts that height = 2·P2 + LH and radius = min(token, height ÷ 2), so a recipe change that breaks the drawing's formulas fails loudly.
- `templates/button-ios.tpl.html`: the sheet. `__DATA__` is replaced with `data.json`.
- `templates/switch.html`: the Switch sheet. Its values are inlined (see Gaps).
- `site/`: the index page and its two thumbnails.
- `build.mjs`: writes the deployable site to `dist/` (git-ignored).

## Workflow

```sh
node tools/dimensional-drawings/extract-button-ios.mjs   # needs design-data on PATH
node tools/dimensional-drawings/build.mjs
```

Open `dist/index.html`, or screenshot a sheet with headless Chrome. Deep links set the state, for example `button-ios/#l,color,primary,dark,search,text=Add%20to%20cart`.

## Adding a component

1. Render its states: `design-data render [--platform ios] --batch states.json --out <dir>`. Each `*.scene.json` has every part's box, token names and values (`nodes[].tokens`).
2. Pick the codes: padding, gap and size tokens become `P#`, `G#`, `Z#`. Derived values (height, inset, radius) become formulas that close.
3. Write an extract script like `extract-button-ios.mjs` that fails when the recipe stops agreeing with the formulas.
4. Copy a template, wire its state controls, add a card and thumbnail to `site/index.html`.

## Deploying

Prototypes go to `*.entapp.adproto.com` with the `adt` CLI.

```sh
adt deployments create-upload --team-id <team> --project-name "<name>" --project-slug <slug> \
  --name <slug> --hosted-zone-id 09d64280-366d-4083-aa44-ba5488a2a256 --hostname <slug> --json --no-input
adt deployments upload <deploymentId> tools/dimensional-drawings/dist --wait --json --no-input
```

The component drawings site is deployment `8e3b95e0-c724-4f0f-930f-2130d5b14b2e` (https://component-drawings.entapp.adproto.com). `ef381e5a-1620-487d-af9c-d47384aba9ac` is an older Switch-only copy.

- The site sits behind Adobe sign-in, so an unauthenticated `curl` returns the login page with a 200. Check it in a signed-in browser.
- A new upload takes 15 to 20 seconds to show.
- The platform injects an analytics script on publish, so the sources don't include it.

## Fonts

Label text uses Adobe Clean Spectrum VF from the Adobe Fonts kit `https://use.typekit.net/flz1ovt.css`, measured in the browser with canvas `measureText`. Never bundle the font or a text-metrics table derived from it (see `tools/platform-capture`). `design-data render` measures with Source Sans 3 unless given `--text-metrics`, so its label widths run about 6.6 % wider than the drawing's.

## Findings and gaps

- `button-ios` hover and down resolve to identical values for both styles and both schemes. This may be a gap in the iOS stopgap tokens.
- On M and L the effective radius is smaller than the token, because it is min(token, height ÷ 2).
- The Switch sheet is a hand-built page with its values inlined, and it has no label text or icon. It needs an extract script and the shared drawing kit.
- The two sheets duplicate their drawing helpers (`dimH`, `dimV`, `callout`, tables). Factor them out before a third component.
- The Switch's press and keyboard-focus states are still `[TBD]`. `design-data render --state down` can supply them.
- The index thumbnails are static screenshots and need regenerating when a sheet changes.
