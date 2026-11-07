<!-- Copyright 2026 Adobe. All rights reserved. -->

# hck9 spike: text metrics and slim engine measurements

Throwaway scripts for proposal 015. Not merged. Run `npm i` here, then:

* `node measure.mjs`: canvas vs DOM width of button labels in Adobe Clean Spectrum VF (Typekit kit flz1ovt), Source Sans 3 and sans-serif.
* `node kern.mjs`: builds the advance + pair-kerning table for Adobe Clean Spectrum VF (wght 400, 700) into `clean-metrics.json` and prints the error against Chrome. `kern-ss3.mjs` does the same for Source Sans 3 (OFL).
* `python3 compact.py`: turns `clean-metrics.json` into `../../core/src/text_metrics_clean.json` (git-ignored: metrics measured from a proprietary font). `sdk/core/src/text_metrics_proto.json` is the committed Source Sans 3 (OFL) table and is what `visual.rs` includes, so the crate builds from a clean checkout. To reproduce the S2 numbers in the proposal, copy `text_metrics_clean.json` over `text_metrics_proto.json` locally and do not commit it.
* `node wrap.mjs`: greedy line breaking over the table against Chrome's line count (needs `clean-metrics.json`).
* `node interp.mjs`: error of interpolating weights 500/600 and clamping 800 from the 400/700 tables.
* `bench.html` + `bench.mjs`: load `../spikes/hck9-slim-engine/pkg` in Chrome, compare its SVG with the CLI's and time it against `visual-runtime.js`. Serve a `design-data site` output dir on port 8765 with `pkg/`, `bench.html` and a one-variant JSON copied in.
