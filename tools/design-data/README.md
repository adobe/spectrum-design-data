# @adobe/design-data

Node.js helpers over `@adobe/design-data-wasm`: filesystem dataset loading,
validation, and guideline and component lookups.

```js
import { loadDataset } from "@adobe/design-data/load";
```

Entry points: `.`, `./load`, `./validate`, `./guideline`, `./component`.

Token writes and authoring sessions were removed in 3.0.0. Use the
`design-data write` and `design-data authoring-session` CLI commands instead.
