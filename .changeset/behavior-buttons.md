---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add behavior contracts for Button and Close button on the `press` pattern, and
selected and pending behavior for Action button (proposal 022).

* Data: `button.json` and `close-button.json` extend `press`. Button adds a
  `pending` facet and a rule that a pending button ignores `activate`. Action
  button now toggles `isSelected` on `activate` (emits `press` with the new
  value, exposes `aria-pressed`) and ignores `activate` while `isPending`.
  The hold icon stays out. In-field progress button has no data, so no contract.
* Registry: facets `selected` and `pending`.
* Runner and spec: `emit` stays exact; a vector may set `emitOptions: "listed"`
  (used by the shared `button` role key vectors) to check only listed options.
* Vectors: Button, Close button and Action button suites, including selected
  plus press and pending. The `button` role key vectors now run on all three.
* No accessibility block changed; sheets derived from the contracts equal the
  block-derived ones. No render or spec sheet output changes.
