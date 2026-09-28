# React Spectrum platform manifest (incubating)

**Status:** Incubating in this monorepo — React Spectrum does not yet own this
manifest. See `platforms/README.md` for the incubation model and ejection
contract.

## What this is

React Spectrum (specifically Spectrum 2 / S2) consumes the foundation token
dataset directly: its `style()` build macro (`@react-spectrum/s2/style`)
resolves token values by the same names the foundation already publishes
(kebab-case, e.g. `red-400`, `size-100` — see
`https://react-spectrum.adobe.com/styling`). There is currently no known
React-Spectrum-specific naming transform, filter, or override to encode here —
so this manifest is intentionally minimal: an identity + foundation pin, with
no `include`/`exclude`, no `overrides`, and no `formatting` block.

Do not add speculative overrides to this file. If/when React Spectrum needs a
real platform-specific extension (a component that doesn't exist in the
foundation catalog, a naming exception, a mode-set restriction), add it here
with a description of the real need it addresses, backed by an actual
React Spectrum source reference.

## `extensions/`

Currently empty — see `extensions/README.md` for the category layout it would
use if/when a real extension is needed.

## Validating locally

```bash
design-data --platform react-spectrum validate-manifest
design-data platform show react-spectrum
```
