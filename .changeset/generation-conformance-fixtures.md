---
"@adobe/design-data-spec": minor
---

Add output-generator conformance fixtures and normative determinism contract (Phase A4, RFC #625).

- **packages/design-data-spec/conformance/generation/flat-token/**: fixture pairing a single
  cascade flat-token input with its expected byte-identical legacy output; tests 1:1 slug
  mapping from name-object serialization.
- **packages/design-data-spec/conformance/generation/mode-set-token/**: fixture pairing two
  cascade tokens sharing a `set_uuid` with their merged legacy `sets`-keyed expected output.
- **packages/design-data-spec/conformance/README.md**: document the generation fixtures
  section, format, and SDK driver command.
- **packages/design-data-spec/spec/evolution.md**: add normative output-generator determinism
  contract (byte-identical on successive runs, sorted keys, no ephemeral fields) with link to
  the generation conformance fixtures.
- **packages/design-data-spec/scripts/check-layout.mjs**: require both generation fixture
  directories in the layout guard.
