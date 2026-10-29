# Category icons

Edit **`src/data/category-icons.json`** to change the workflow icon associated
with an app category. This is the only category-to-icon association file.
It does not change labels, tokens, taxonomy, saved data or generated output.

## Editing an association

Each `categories` entry maps a stable category key to the exact exported
Spectrum S2 workflow icon name. For example:

```json
{
  "foundations": "Shapes",
  "tokens": "Channel",
  "color": "Color",
  "spacing": "DistributeSpaceVertically"
}
```

Change the name on the right, save the JSON, and Vite updates the affected UI.
No component imports need editing. Available names are listed in
`src/features/icons/spectrumIconCatalog.generated.ts`; that generated catalog
is not an association file and should not be edited manually.

`aliases` make existing ids share a canonical association. For example
`colors` and `source.palette-color` point to `color`, so changing `color`
updates Foundation tabs, token filters and color-source change badges together.
Aliases must point directly to a `categories` key, not another alias.
To give one alias its own icon, remove it from `aliases` and add the same key
to `categories`.

Lookup trims whitespace and ignores case. Keys must therefore be unique even
after trimming and lowercasing. Lookup never guesses plurals or parses labels.
Screen wording stays with the screen: Color and Colors need not be renamed.

Context keys intentionally preserve different meanings:

| Key | Meaning |
| --- | --- |
| `analysis` / `view.analyze` | Analysis page / Analyze content view |
| `spacing` / `property.gap` | Spacing foundation / Gap field |
| `view.elements` | Elements content view; not the local Grid view action |
| `themes` | Theme field category; not the app-appearance toggle |
| `element.workflow-icon` | Element-type menu icon; not the authored glyph |
| `color-view.channels` | Color-picker Channels view; not Tokens' Channel icon |
| `component.definitions` / `component.parts` / `component.properties` / `component.options` / `component.states` | Components data tabs, including their native narrow-screen menu |

## Using the lookup

Use JSX where a component accepts an icon node:

```tsx
<CategoryIcon category="color" />
<CategoryIcon category={`source.${item.sourceKind}`} />
```

Use `getCategoryIcon("tokens")` where an API expects an icon component, such
as `NavSidebarItem.Icon`. Both exports are in `src/components/CategoryIcon.ts`.
The `.ts` file uses React `createElement` so existing non-JSX script consumers
of the token registry remain compatible.

The renderer forwards Spectrum icon props and participates in native icon
context, preserving sizing, styling and decorative accessibility. Icons are loaded
through the existing cached public workflow-icon loaders. Loading reserves
native icon space without suspending a table or navigation panel.

## Errors and checks

The fallback is **Circle**. Missing associations and invalid icon names report
a configuration error to the console and render Circle, rather than silently
showing nothing. Repeated identical errors are reported once. Loading failures
also report their cause and use Circle.

Run `pnpm test:category-icons` after editing. It checks installed icon names,
aliases, static consumer coverage, fallback/error behavior and important
exclusions. Build and type checking also validate the JSON, so an invalid
committed association cannot silently ship. Complete topic/source/element
coverage is checked by TypeScript.

The approved Category icon stories include all associations, icon-only controls,
a shared-configuration change and diagnostic fallback cases. Browser coverage
also compares native icon styling and verifies Circle with the exact reported
cause when an icon download fails. The shared fixture changes configuration in
memory; it never rewrites the app's JSON.

## Scope and exclusions

Included: app sections, Foundation/token categories, named content views,
Structure properties/alignment/element-type menu labels, color-picker models
and views, Home update types, and change-log topics/source types.

Excluded: add/edit/delete/revert/search/download actions, diagnostic/status
glyphs, the Adaptive controls button, Tokens All/List/Grid, individual-values
toggles, explicit mode/mode-set icons, authored element and typography sample
glyphs, custom padding SVGs, gradient illustrations, branding and the sample app.
The Platform picker represents Platform even when Foundations is selected.

Do not replace icons just because they share an import name: Home's Breaking
change category uses AlertTriangle, but ordinary warnings keep their local
AlertTriangle. A new ambiguous use needs an explicit include/exclude decision.
