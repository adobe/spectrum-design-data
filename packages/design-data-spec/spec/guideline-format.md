# Guideline format

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines **guideline documents**: standalone JSON files representing non-component Spectrum guidance pages — topics like color, typography, motion, spacing, principles, and the S2 app frame. Each guideline wraps page metadata and a `documentBlocks` body, making design guidance machine-readable and queryable by agents alongside components and tokens.

Guideline documents live in the `guidelines/` directory of a dataset (one file per page, named `<slug>.json`) and conform to [`guideline.schema.json`](../schemas/guideline.schema.json).

Scoped under Phase 10. See also [Document blocks](document-blocks.md) for the block shape used as the body.

## Guideline document shape

A guideline document is a JSON object conforming to [`guideline.schema.json`](../schemas/guideline.schema.json). It is a **root document** (carries `$id` + optional `specVersion`, like a component declaration) residing one-per-file in `guidelines/`.

### Required fields

| Field            | Type                     | Description                                                                        |
| ---------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| `$id`            | string (uri)             | Canonical identifier for this guideline document.                                  |
| `name`           | string (kebab-case)      | Machine identifier matching the filename (e.g. `colors`, `app-frame-overview`).    |
| `title`          | string                   | Human-readable page title (e.g. `"Colors"`).                                       |
| `category`       | string (enum)            | High-level category — one of `designing`, `fundamentals`, `developing`, `support`. |
| `documentBlocks` | array of document blocks | Body prose (minimum 1 block). See [Document blocks](document-blocks.md).           |

### Optional fields

| Field         | Type                | Description                                                                                                |
| ------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `$schema`     | string (uri)        | JSON Schema reference for authoring tool support.                                                          |
| `specVersion` | string              | Spec version this document targets (e.g. `"1.0.0-draft"`). RECOMMENDED for self-identification.            |
| `sourceUrl`   | string (uri)        | Canonical URL of the upstream source page.                                                                 |
| `lastUpdated` | string (date)       | ISO 8601 date of the most recent source-page update.                                                       |
| `status`      | string              | Publication status (e.g. `"published"`). Open string — not constrained to an enum.                         |
| `tags`        | string\[]           | Free-form tags for discovery and filtering. Unique items.                                                  |
| `related`     | relatedReference\[] | Cross-references to related components or other guidelines. See [Related references](#related-references). |

### `category` enum

| Value          | Meaning                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `designing`    | Visual and interaction design guidance (colors, typography, motion, spacing, app frame, etc.). |
| `fundamentals` | Foundation principles and introduction to the design system.                                   |
| `developing`   | Developer-focused onboarding and technical overview.                                           |
| `support`      | FAQs, resources, and supplemental support content.                                             |

**NORMATIVE:** The `category` field MUST be one of the four values above. A guideline with an unknown category value MUST fail Layer 1 schema validation.

## Related references

The `related` array holds cross-references to entities that are semantically related to this guideline. Each entry is a `relatedReference` object:

| Field  | Type           | Required | Description                                                                                          |
| ------ | -------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `ref`  | string (kebab) | Yes      | The `name` of the related component or guideline document.                                           |
| `kind` | string (enum)  | No       | Optional hint: `"component"` or `"guideline"`. When omitted, tooling resolves against both catalogs. |

**NORMATIVE:** Layer 1 does NOT require `related[].ref` values to resolve to existing entities. A guideline document that references a slug not yet present in the dataset is still a conformant Layer 1 document. Tooling SHOULD warn on dangling references (see SPEC-046).

**Rationale:** `related` slugs may point at another guideline page, a component, or a page not yet migrated to the structured format. Making resolution a warning (not an error) prevents authoring friction during incremental migration.

## `documentBlocks` body

**NORMATIVE:** Every guideline document MUST carry a `documentBlocks` array with at least one block (`minItems: 1`). A guideline file with an empty or absent `documentBlocks` array MUST fail Layer 1 schema validation.

**Rationale:** A guideline document whose sole purpose is to carry prose guidance is meaningless with zero blocks. This is a stricter constraint than the embedded `documentBlocks` property on tokens and components (which is optional), because a guideline file — unlike a token or component — has no other structured content to offer.

**RECOMMENDED:** A guideline document SHOULD include at least one block of type `purpose` that explains the design intent of the topic (see SPEC-045).

See [Document blocks](document-blocks.md) for the full block shape and type descriptions.

## Example guideline document

```json
{
  "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/v0/guideline.schema.json",
  "specVersion": "1.0.0-draft",
  "$id": "https://opensource.adobe.com/spectrum-design-data/guidelines/colors.json",
  "name": "colors",
  "title": "Colors",
  "category": "designing",
  "sourceUrl": "https://s2.spectrum.corp.adobe.com/page/colors/",
  "lastUpdated": "2026-02-02",
  "status": "published",
  "tags": ["designing", "design-tokens", "color"],
  "related": [
    { "ref": "grays", "kind": "guideline" },
    { "ref": "background-layers", "kind": "guideline" }
  ],
  "documentBlocks": [
    {
      "type": "purpose",
      "content": "The Spectrum 2 color system defines a perceptually balanced, accessible palette with semantically named tokens for surfaces, text, icons, and interactive elements across light and dark schemes.",
      "agents": "Use Spectrum color tokens — not raw hex values — for all UI elements. The system ensures accessible contrast ratios and consistent brand expression across themes."
    },
    {
      "type": "guideline",
      "content": "Accent colors establish hierarchy by drawing attention to the highest-priority interactive element in a focal area. Limit accent usage to one element per region to preserve signal strength."
    }
  ]
}
```

## File naming and placement

**NORMATIVE:** Each guideline document MUST be placed in the `guidelines/` directory of the dataset root and named `<name>.json`, where `<name>` matches the document's `name` field (kebab-case slug). One file per guideline; the `guidelines/` directory MUST NOT be nested.

**NORMATIVE:** The `guidelines/` directory is an **optional registered** directory in the dataset layout. When present, every `*.json` file it contains MUST conform to `guideline.schema.json`. When absent, no error is produced. See [Dataset layout](dataset-layout.md) for directory registration rules.

## SPEC rules

| Rule ID  | Severity | Name                       | Assert                                                                                                                                               |
| -------- | -------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| SPEC-045 | warning  | guideline-missing-purpose  | A guideline document SHOULD include at least one `documentBlocks` block of type `purpose`.                                                           |
| SPEC-046 | warning  | guideline-related-resolves | Every `related[].ref` SHOULD resolve to a known component or guideline `name` in the dataset. When `kind` is set, resolve only against that catalog. |

Both rules are `warning` severity and do not block validation. See `rules/rules.yaml` for full rule definitions.

## References

* [Document blocks](document-blocks.md) — the `documentBlocks` block shape reused by guideline documents.
* [Dataset layout](dataset-layout.md) — normative directory structure including the registered `guidelines/` directory.
* [`guideline.schema.json`](../schemas/guideline.schema.json) — Layer 1 JSON Schema.
