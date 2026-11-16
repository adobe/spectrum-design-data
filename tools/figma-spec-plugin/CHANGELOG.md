# figma-spec-plugin

## 0.2.0

### Minor Changes

- [#1862](https://github.com/adobe/spectrum-design-data/pull/1862) [`d5383c6`](https://github.com/adobe/spectrum-design-data/commit/d5383c6b8f860154db8e5228bee22f688af0cb60) Thanks [@GarthDB](https://github.com/GarthDB)! - `plan.mjs record --text-metrics <table>` stores a stamp of the Adobe Fonts kit table in the
  registry entry (family, `test700At14px`, a short fingerprint of its advances and kerning, date, and
  the platform it was measured on; never the table or the kit URL), and
  `plan` adds a `note` to an item when its table differs from the registered one or is missing. The
  seven registered spec files are regenerated with the kit table, so label widths follow Adobe Clean
  Spectrum VF. The kit hashes reproduce only on the same platform (macOS and Linux measure the font
  slightly differently), so regenerate on macOS.

## 0.1.0

### Minor Changes

- [#1711](https://github.com/adobe/spectrum-design-data/pull/1711) [`a5d5468`](https://github.com/adobe/spectrum-design-data/commit/a5d546876654a5f0c80fc4f7963a51cb960023dd) Thanks [@GarthDB](https://github.com/GarthDB)! - `plan.mjs plan` accepts `--text-metrics <file>` to build sheets with a
  kit-measured text-metrics table. The hub prototype build uses one when it
  can generate it, and falls back to the default otherwise.
