<!-- Copyright 2026 Adobe. All rights reserved. -->

<!-- Licensed under the Apache License, Version 2.0. -->

# platform-capture

Captures platform reference renderings so they can be compared with
design-data renderer output. Layout:

* `adapters/<name>/`: one folder per source. `ios-simulator/` is the iOS
  Catalog capture described below.
* `lib/`: code shared by adapters.

## iOS simulator adapter

Captures light and dark simulator screenshots of the Spectrum iOS Catalog app
(`OneAdobe/spectrum-ios`, `Tools/SpectrumCatalog`) so they can be compared with
design-data renderer output. Tracked in beads `p6ga.8.78` (spike) and
`p6ga.8.79` (comparison).

> **Keep the images internal.** The Catalog app comes from a private repo and
> shows Preview-status builds, while this repo is public. Do not commit
> screenshots here. Store them outside the repo, for example in
> `~/Spectrum/spectrum-ios-catalog-shots/`. Only the tooling and `states.json`
> (an index of filenames) are committed.

## Prerequisites

* macOS with Xcode, an iOS simulator (default `iPhone 17 Pro`), Node 20, and
  [`mobilebuildmcp`](https://github.com/getsentry/MobileBuildMCP) on `PATH`
  (formerly XcodeBuildMCP; `npm install -g mobilebuildmcp`).
* A clone of `OneAdobe/spectrum-ios` (needs access).
* ImageMagick for contact sheets.

## Run

```sh
cd <spectrum-ios>/Tools/SpectrumCatalog
mobilebuildmcp simulator build-and-run --project-path SpectrumCatalog.xcodeproj \
  --scheme SpectrumCatalog --simulator-name "iPhone 17 Pro"

# from adapters/ios-simulator/; takes about 20 minutes per three components
node capture.mjs <outDir>/shots              # or: ... "Button" "Picker"
./sheets.sh <outDir>/shots <outDir>/contact-sheets
node index.mjs <outDir>/shots > states.json
```

The first build can fail until `copy_previews` generates
`Generated/GeneratedPreviews.swift`; rebuild once.

`capture.mjs` changes one control at a time from its default, across every
SwiftUI/UIKit variant, and also toggles switches. Output is
`<component>/<variant>/<state>.<light|dark>.png`. Run it on a fresh app launch.

## Gotchas

* `mobilebuildmcp ui-automation tap` needs `--post-delay` (the script uses 1.2 s)
  or it reports success without acting.
* Element refs change on every snapshot, so always re-snapshot before tapping.
* A menu opens from the inner value button, not the row. Menu items are appended
  after the existing targets.
* A picker's currently selected option can be missing from its menu items, so
  the script defers those rows and captures them last.
* Picker's framework choice is a nested nav-bar menu (SwiftUI > SPPicker, UIKit >
  SPUIPicker, UICollectionView, UITableView). Other components use SwiftUI/UIKit
  tabs; Pop-up label has neither.
* Restore a picker to its original default, not its current value.
* The reference snapshots in `spectrum-ios` are Git LFS pointers; run
  `git lfs pull` before using them.

## Known gaps

* Picker's first Style menu: the default appears only in the `default` shot.
* Text-field content (Pop-up label's Label Text) is not varied.
* Switches are labelled by the nearest preceding text, so a second switch on a
  screen may carry the first one's name.
* Contact-sheet crop assumes 1206x2622 screenshots.

## Storybook adapter (`adapters/storybook`)

Opens stories in headless Chrome, screenshots the component element only, and
writes `design-data-measured/1` JSON for `design-data render-compare`
(`docs/visual-comparison.md`). Public libraries, but still write output outside
the repo (`~/Spectrum/platform-compare/<run>/`).

```sh
# React Spectrum S2: immutable per-commit build, pinned by the full main SHA
SHA=$(gh api repos/adobe/react-spectrum/commits/main --jq .sha)
node adapters/storybook/cli.mjs capture.json --source rsp --sha $SHA --out <run>/rsp

# Spectrum Web Components gen2 (mutable deployment)
node adapters/storybook/cli.mjs capture.json --source swc --out <run>/swc
```

`capture.json` is `{ "states": [{ id, story, args?, colorScheme?, selector, parts? }] }`.
`id` is the id the batch render gave the matching state. `selector` is the
component element (the container); `parts` optionally gives CSS selectors for
`label` and `icon`, otherwise the first element with its own text and the first
`svg` are used. Playwright selectors pierce open shadow roots. Args go in
`iframe.html?id=<story>&args=k:v;k2:v2`.

* **Dark mode.** RSP: `document.documentElement.dataset.colorScheme = 'dark'`.
  SWC: `&globals=theme:dark`. The adapter waits for fonts and colour transitions
  before measuring.
* **Output.** `shots/<id>.png` (element screenshot, `--scale` default 2),
  `measured.json` (container: width, height, padding, cornerRadius, fill; label:
  width of the text, fontSize, fontWeight, color), and `details.json`
  (story URLs, font family, and for SWC the token custom properties each part's
  rules use, with resolved values).
* **Provenance.** RSP records the full commit SHA and the build URL. SWC
  records `Last-Modified`, `ETag`, and the `@adobe/spectrum-wc` version. The
  deployment doesn't expose that version, so it is inferred from npm publish
  times and labelled so.
* **SWC tokens.** The deployed gen2 Storybook uses `--swc-*` variables, not
  `--spectrum-*`; the collector records both prefixes. It lists every matching
  declaration without resolving the cascade.
* SWC is lightly tested (one story against the live site).

## Rasterizing renderer SVGs (`lib/rasterize`)

Turns `design-data render` SVGs into PNGs for review and pixel diffs. Accepts SVG
files or a `design-data render --batch` output folder (reads `index.json`,
skips failed states).

```sh
design-data render --batch states.json --out ~/Spectrum/platform-compare/<run>/renders
node lib/rasterize/cli.mjs ~/Spectrum/platform-compare/<run>/renders \
  --out ~/Spectrum/platform-compare/<run>/png
```

* **Chrome (default).** `playwright-core` with the system Chrome (`channel:
  'chrome'`), the Adobe Fonts kit (`--kit`, default `flz1ovt`), and
  `document.fonts.ready` before an element screenshot of the `<svg>`. Needs
  network for the kit; `--no-kit` skips it. A warning is printed when no kit
  font loaded.
* **Scale.** `--scale N`, otherwise 3 for states with platform `ios` (or
  `--platform ios`) and 2 for everything else.
* **Light and dark.** The renderer bakes the scheme into the SVG, so batch both
  `colorScheme` values. PNGs are transparent unless `--background <css>` is set.
* **Offline fallback: `--engine resvg`.** Needs the `resvg` binary and Adobe
  Clean installed locally and readable (`--fonts-dir` to point at it). Fonts are
  never bundled or committed, and resvg's variable-font support is limited, so
  treat this output as a review aid, not a measurement.
* Output goes outside the repo. Never commit PNGs.

Test: `pnpm --filter @adobe/platform-capture test` (Chrome tests skip when
Chrome is missing).

## Pilot: React Spectrum S2 Button vs the foundation recipe

Run everything from the repo root (the `design-data` CLI finds the dataset from the working
directory). Output goes outside the repo.

```sh
R=~/Spectrum/platform-compare/rsp-button; TC=tools/platform-capture
SHA=$(gh api repos/adobe/react-spectrum/commits/main --jq .sha)

# 1. Matrix of S2 args -> matching render states and capture states (+ unmapped.json)
node $TC/lib/mapping-cli.mjs $TC/adapters/storybook/mappings/react-spectrum-s2-button.json \
  $R/matrix.json --layout icon-label --out $R
# 2. Render the recipe, capture S2, compare numbers
design-data render --batch $R/states.json --out $R/renders
node $TC/adapters/storybook/cli.mjs $R/capture.json --source rsp --sha $SHA --out $R/rsp
design-data render-compare --scenes $R/renders --measured $R/rsp/measured.json --format markdown -o $R/report.md
# 3. Pixels (a review aid; the numbers above are the verdict)
node $TC/lib/rasterize/cli.mjs $R/renders --out $R/png
node $TC/lib/pixel-diff.mjs --renders $R/renders --png $R/png --shots $R/rsp/shots --scale 2 --out $R/pixel
npx reg-cli $R/pixel/actual $R/pixel/expected $R/pixel/diff -R $R/pixel/report.html
```

`matrix.json` is `{ axes?, cases?, colorSchemes }` of S2 args. The mapping file
(`adapters/storybook/mappings/`) maps arg names and values to recipe options; a `null` value
means the recipe has no equivalent and the state is listed in `unmapped.json` instead of
rendered. Defaults are always passed explicitly (S2 defaults to `primary`, the recipe to
`accent`). Skip combinations the component's `constraints` forbid (outline is only defined for
primary and secondary). Pixel diffs are dominated by width and glyph differences (the recipe
draws a generic icon), so read them after the numeric report.
