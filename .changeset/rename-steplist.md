---
"@adobe/spectrum-component-api-schemas": patch
---

refactor(component-schemas): rename step-list to steplist

Renamed the `step-list` component schema to `steplist` for consistency with other single-word component names.

## Component Schema Changes (0 added, 1 deleted, 1 added)

**Original Branch:** `main`

**New Branch:** `refactor/rename-step-list-to-steplist`

### 📦 Renamed Component

-   `step-list` → `steplist` - Component schema renamed

### Changes to steplist schema

-   **$id**: Changed from `https://opensource.adobe.com/spectrum-tokens/schemas/components/step-list.json` to `https://opensource.adobe.com/spectrum-tokens/schemas/components/steplist.json`
-   **title**: Changed from "Step list" to "Steplist"
-   **documentationUrl**: Changed from `https://spectrum.adobe.com/page/step-list/` to `https://spectrum.adobe.com/page/steplist/`

All other properties remain unchanged. This is a non-breaking rename at the schema level, though consumers referencing the old filename will need to update their imports.
