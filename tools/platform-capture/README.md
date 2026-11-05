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
