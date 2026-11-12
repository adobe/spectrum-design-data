---
"@adobe/design-data-wasm": minor
---

<!-- Copyright 2026 Adobe. All rights reserved. -->

Add reusable batch value resolution with the native SDK's context and alias semantics.

- **ValueResolver**: reuse prepared records and custom modes across batches, retaining diagnostics.
- **Package exports**: expose typed browser bindings and the WASM asset for lazy bundler loading.
- **Build setup**: provide pinned local wasm-pack so dependent builds need no global installation.
