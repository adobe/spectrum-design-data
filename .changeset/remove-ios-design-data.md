---
"@adobe/spectrum-design-data": minor
---

Remove iOS-specific component and platform-extension data now served from the
external `spectrum-ios-design-data` repo via the manifest cascade (closes bead
h890.22.5).

- **components/tab-bar-ios.json**: removed — canonical copy now lives external,
  wired through `extensions.components`.
- **registry/platform-extensions/ios-states.json**: removed — canonical copy
  now lives external, wired through `extensions.platformExtensions`.
