---
"@adobe/spectrum-tokens": minor
---

Update meter token from meter-default-width to meter-width.

### Design motivation

We try to avoid "default" in the name (unless it's the state) because it's a word that implies that it's relative to something else that may not be named, which could get confusing. So meter-width I think for the name, and then just add a note in the specs.

### Token diff

_Renamed token:_

- `meter-default-width` -> `meter-width`

_Token added for deprecation and rename:_

- `meter-default-width`
