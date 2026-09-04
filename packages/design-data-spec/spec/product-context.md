# Product context

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the **product context document**: a machine-readable record that a product-layer working copy keeps alongside its token and component files. It preserves the rationale behind the working copy's existence and records the intent of each override and extension it introduces.

## Purpose

The cascade model defines three layers (Foundation → Platform → Product; see [Cascade](cascade.md)). The Platform layer has a context document — the [manifest](manifest.md) — that declares its relationship to the foundation. The Product layer has no equivalent until this document.

When a designer or engineer overrides a token or adds a component at the product layer, the intent behind those changes is currently lost. The product context document preserves that context as a machine-readable, human-editable file that travels with the product-layer dataset and can be consumed by agent tools.

## Document

A product context document **MUST** conform to [`product-context.schema.json`](../schemas/product-context.schema.json) (canonical `$id`: `https://opensource.adobe.com/spectrum-design-data/schemas/v0/product-context.schema.json`).

**RECOMMENDED:** A product-layer working copy **SHOULD** include a `product-context.json` file whenever it contains overrides or extensions.

## Required fields

| Field         | Type   | Description                                                   |
| ------------- | ------ | ------------------------------------------------------------- |
| `specVersion` | string | **MUST** be `1.0.0-draft` for documents targeting this draft. |
| `layer`       | string | **MUST** be `"product"`.                                      |

## Optional fields

| Field        | Type   | Description                                                                                                                       |
| ------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `rationale`  | string | Why this product-layer working copy exists (e.g. feature name, project, team).                                                    |
| `createdBy`  | object | Tool or agent attribution (see [createdBy shape](#createdby-shape)).                                                              |
| `createdAt`  | string | ISO 8601 datetime when the document was **first** created. Implementations SHOULD NOT overwrite this field on subsequent updates. |
| `overrides`  | array  | Overrides of foundation or platform tokens (see [overrides](#overrides)).                                                         |
| `extensions` | object | Net-new tokens and components added at this layer (see [extensions](#extensions)).                                                |

### `createdBy` shape

| Field   | Type   | Description                                                             |
| ------- | ------ | ----------------------------------------------------------------------- |
| `type`  | string | `"agent"` or `"human"`.                                                 |
| `tool`  | string | Tool name (e.g. `"design-data"`, `"figma-plugin"`, `"manual"`).         |
| `model` | string | Model identifier when `type` is `"agent"` (e.g. `"claude-sonnet-4-6"`). |

### `overrides`

Each entry in `overrides` is an object that records a product-layer value override of an existing token:

| Field       | Required | Type   | Description                                                                           |
| ----------- | -------- | ------ | ------------------------------------------------------------------------------------- |
| `uuid`      | yes      | string | UUID of the token being overridden. **MUST** match a token in the merged cascade.     |
| `value`     | yes      | any    | The overriding value. **MUST** be type-compatible with the original token value type. |
| `rationale` | no       | string | Why this specific value was chosen.                                                   |

### `extensions`

The `extensions` object contains net-new tokens and components that do not exist in the foundation or platform layers:

| Field        | Type  | Description                                                                                                                      |
| ------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| `tokens`     | array | Token objects conforming to [`token.schema.json`](../schemas/token.schema.json). Each token **MAY** include a `rationale` field. |
| `components` | array | Component objects conforming to [`component.schema.json`](../schemas/component.schema.json).                                     |

## Example

```json
{
  "specVersion": "1.0.0-draft",
  "layer": "product",
  "rationale": "Checkout flow redesign — Q3 2026.",
  "createdBy": {
    "type": "agent",
    "tool": "design-data",
    "model": "claude-sonnet-4-6"
  },
  "createdAt": "2026-05-13T14:30:00Z",
  "overrides": [
    {
      "uuid": "aaaaaaaa-0001-4000-8000-000000000001",
      "value": "#f8f8f8",
      "rationale": "Off-white card background to distinguish from pure-white page without elevation shadow."
    }
  ],
  "extensions": {
    "tokens": [
      {
        "name": { "component": "checkout-summary", "property": "background-color" },
        "value": "#f0f0f0",
        "rationale": "Nested surface; lighter to create hierarchy without adding a border.",
        "uuid": "bbbbbbbb-0002-4000-8000-000000000002"
      }
    ]
  }
}
```

## Agent capture behavior

**RECOMMENDED:** Agent tools that create or modify product-layer tokens (`write_token`, `write_component`) **SHOULD** capture a `rationale` from session context and record it in:

1. The token's inline `rationale` field (see [Token format — rationale](token-format.md#lifecycle-and-metadata)).
2. The product context document's `overrides[].rationale` (for overrides) or `extensions.tokens[].rationale` (for new tokens).

This makes the product context document self-maintaining during agent-assisted authoring sessions.

## Relationship to platform manifest

The platform manifest (Layer 2) declares which foundation tokens a platform includes, excludes, or overrides at a structural level. The product context document (Layer 3) records the *intent* behind a product team's specific value choices. The two documents are complementary and independent.

| Document               | Layer | Primary audience                    | Records                                |
| ---------------------- | ----- | ----------------------------------- | -------------------------------------- |
| `manifest.json`        | 2     | Platform engineers                  | Version pins, filters, typed overrides |
| `product-context.json` | 3     | Product designers/engineers, agents | Rationale for overrides and extensions |

## References

* [Cascade — Layers](cascade.md#layers)
* [Platform manifest](manifest.md)
* [Token format — rationale field](token-format.md#lifecycle-and-metadata)
* [Agent-readable surface — write operations](agent-surface.md#tool-catalog)
* [#847 — Phase 8.x: Product context document](https://github.com/adobe/spectrum-design-data/issues/847)
