---
"@adobe/spectrum-tokens": minor
---

Propagate size taxonomy refinements from the cascade source into the legacy token package.

- **tokens/src**: Regenerated from `packages/design-data` to add shared `banner-*` layout
	tokens and mark consolidated size tokens `deprecated` with a `renamed` migration target.
- **Component multiplier and size tokens**: 19 tokens that already had a `renamed` target
	(for example `button-minimum-width-multiplier`) are now also marked `deprecated`.
