---
"s2-tokens-viewer": minor
---

Switch s2-tokens-viewer token resolution from runtime to build-time wasm.

- **scripts/resolve.mjs**: new build-time script; drives `Dataset.embedded()` via
  `@adobe/design-data-wasm` (node) to pre-resolve all 2,460 slugs into
  `tokens/resolved.json` (values + chains per context).
- **moon.yml**: new `resolve` task (`sdk-wasm:build` + `prepare` deps);
  `export` now depends on `resolve` so `resolved.json` ships to `site/`.
- **index.html**: replace inline `TokenResolver`/`TokenResolverFactory` (~190 lines)
  with `createResolvedLookup(map, type)`; all call sites unchanged.
- **deploy-docs.yml**: add Rust toolchain + wasm-pack steps; drop stale
  `s2-tokens-viewer:export` line (correct id is `viewer`).
