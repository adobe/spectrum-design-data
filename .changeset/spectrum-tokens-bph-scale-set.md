---
"@adobe/spectrum-tokens": minor
---

## Token sync from Spectrum Tokens Studio

**Original implementer:** @NateBaldwinDesign

### Design motivation

Updated `base-padding-horizontal` tokens to follow S2 Web 2.0 design team's recommendations. Original values looked irregular when applied to Buttons. New values work for Buttons and all other base components per their review.

### Token changes

## Tokens Changed (24)
**Original Branch:** `396f5f8b`
**New Branch:** `f84bce21`

<details open><summary><strong>Added (9)</strong></summary>
  
- `group-gap-extra-large-spacious`
- `group-gap-extra-small-spacious`
- `group-gap-large-spacious`
- `group-gap-medium-spacious`
- `group-gap-small-spacious`
- `form-item-gap-extra-large`
- `form-item-gap-large`
- `form-item-gap-medium`
- `form-item-gap-small`
</details>
  
### Updated (15)
  
<details open><summary><strong>Added Properties (5)</strong></summary>
  
- `base-padding-horizontal-2x-large`
	- `desktop.schema`: `dimension.json`
	- `desktop.value`: `18px`
	- `desktop.uuid`: `1a49e758-b070-4d85-97c5-0f9cc786999b`
	- `mobile.schema`: `dimension.json`
	- `mobile.value`: `14px`
	- `mobile.uuid`: `4f4ff59b-d91a-46fa-9388-b5ae49445d6f`
- `base-padding-horizontal-extra-large`
	- `desktop.schema`: `dimension.json`
	- `desktop.value`: `16px`
	- `desktop.uuid`: `b32fb20b-31a7-43da-ba38-b9a177d0cffa`
	- `mobile.schema`: `dimension.json`
	- `mobile.value`: `12px`
	- `mobile.uuid`: `698fa3d4-32dc-4cd2-bb79-d320effd8674`
- `base-padding-horizontal-large`
	- `desktop.schema`: `dimension.json`
	- `desktop.value`: `14px`
	- `desktop.uuid`: `ece70425-e509-45cc-8336-76fc8afdb921`
	- `mobile.schema`: `dimension.json`
	- `mobile.value`: `12px`
	- `mobile.uuid`: `38e5af78-cb3e-4ff4-9849-28f9d4c56a38`
- `base-padding-horizontal-medium`
	- `desktop.schema`: `dimension.json`
	- `desktop.value`: `12px`
	- `desktop.uuid`: `52a75511-eb1b-4de2-a1bb-959365d8dc1a`
	- `mobile.schema`: `dimension.json`
	- `mobile.value`: `10px`
	- `mobile.uuid`: `71731484-e759-4a5f-89ed-9fe04ac19aed`
- `base-padding-horizontal-small`
	- `desktop.schema`: `dimension.json`
	- `desktop.value`: `10px`
	- `desktop.uuid`: `ba072414-2cdd-4773-86a5-11ca47c08e23`
	- `mobile.schema`: `dimension.json`
	- `mobile.value`: `8px`
	- `mobile.uuid`: `6b43633d-8f29-4c24-b26e-687d6f161bce`
</details>
<details open><summary><strong>Deleted Properties (5)</strong></summary>
  
- `base-padding-horizontal-2x-large`
	- `value`:  -> `14px`
- `base-padding-horizontal-extra-large`
	- `value`:  -> `12px`
- `base-padding-horizontal-large`
	- `value`:  -> `12px`
- `base-padding-horizontal-medium`
	- `value`:  -> `10px`
- `base-padding-horizontal-small`
	- `value`:  -> `8px`
</details>
<details open><summary><strong>Updated Properties (5)</strong></summary>
  
- `base-padding-horizontal-2x-large`
	- `schema`: `dimension.json` -> `scale-set.json`
- `base-padding-horizontal-extra-large`
	- `schema`: `dimension.json` -> `scale-set.json`
- `base-padding-horizontal-large`
	- `schema`: `dimension.json` -> `scale-set.json`
- `base-padding-horizontal-medium`
	- `schema`: `dimension.json` -> `scale-set.json`
- `base-padding-horizontal-small`
	- `schema`: `dimension.json` -> `scale-set.json`
</details>

### References
- Tokens Studio PR: https://github.com/adobe/spectrum-tokens-studio-data/pull/306
- Spectrum Tokens PR: https://github.com/adobe/spectrum-design-data/pull/1150
