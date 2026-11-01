---
"@adobe/design-data-wasm": minor
---

Render a component through a platform's `componentAliases` and recipes.

- `design-data render <component> --platform <id>` and `design-data site --platform <id>` look
  recipes up in the graph through `canonical_component`. An alias key such as `button` draws the
  recipe of its target (`button-ios`); `render button-ios` still works.
- A platform's `extensions/visuals` recipes now reach `render` and `site`. Foundation recipes load
  into the graph before the platform is applied, so a platform recipe replaces them.
- The site lists the alias key with the target's data and adds `source` and `aliasOf` to
  `data.json` under a platform. The raw alias target is hidden from the list.
- A malformed recipe file now fails with its path.
- WASM: `renderScene` and `renderSvg` map `request.component` through the applied platform's
  aliases. No API change; without a platform, output is unchanged.
