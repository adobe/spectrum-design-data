---
"@adobe/design-data-tui": minor
---

`platform eject` can scaffold an opt-in consumer-codegen smoke workflow (closes h890.7.3).

- **sdk/cli**: `platform eject --with-consumer-smoke` writes `consumer-smoke.yml`,
  which runs the repo's own `consumer/smoke.sh` when present.
- **.github/actions/validate**: new `install-only` input installs the CLI and skips checks.
- **.github/actions/validate**: release install picks the binary by runner OS and arch.
- **docs/MIGRATION.md**: documents the flag and the `consumer/smoke.sh` contract.
