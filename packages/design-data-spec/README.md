# [**@adobe/design-data-spec**](https://github.com/adobe/spectrum-design-data/tree/main/packages/design-data-spec)

Normative **Design Data Specification** artifacts for Spectrum: human-readable spec (`spec/`), JSON Schemas (`schemas/`), validation rule catalog (`rules/`), and conformance fixtures (`conformance/`).

**Spec version:** `1.0.0-draft` — see [`spec/index.md`](spec/index.md).

## Layers

1. **JSON Schemas** (Draft 2020-12) — structural (per-file) validation; canonical `$id` under `https://opensource.adobe.com/spectrum-design-data/schemas/v0/`.
2. **Rule catalog** (`rules/rules.yaml`) — semantic rules (`SPEC-001` … `SPEC-006`).
3. **Conformance fixtures** — valid/invalid examples and expected diagnostics for implementors.

## Package exports

`package.json` `exports` expose root schemas, `value-types/color.schema.json`, and `rules/rules.yaml` for tooling.

## Tasks

* `moon run designDataSpec:check` — verify required paths exist (layout guard).

## References

* [Design Data Specification project](https://github.com/orgs/adobe/projects/89)
* Discussion [#714](https://github.com/adobe/spectrum-design-data/discussions/714) — umbrella spec
