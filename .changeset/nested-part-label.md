---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

A nested component part's `with.label` sets the nested request's label text.

- `with.label` is a string literal or `{"option": name}` naming a string host option. It is
  the nested component's text, not an option; SPEC-089 checks that it is a string.
- A slot fill's `options.label` works the same way.
- A group of labelled radios can now be expressed: each nested item carries its own text.
- Without `with.label` the nested label stays empty, as before.
