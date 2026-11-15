---
"@adobe/design-data-wasm": minor
---

Refuse a relationship whose `scope.options` holds a value shape the engine does not understand,
when a platform manifest adds or overrides a relationship (`applyPlatform`). The error names the
record and says the data is newer than the engine. Every shape in use today is still accepted.

The embedded relationship data goes through the same check when the engine loads it, so a build
that embeds data newer than its own code fails at startup instead of rendering wrong output.
