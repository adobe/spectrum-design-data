# [**@adobe/design-data-wasm**](https://github.com/adobe/design-data-wasm)

WebAssembly bindings for [`design-data-core`](../core/) — query, validate,
resolve, and diff Spectrum design tokens from JavaScript or TypeScript, with
zero native dependencies.

Generated TypeScript types are derived directly from the Rust types via
[tsify-next](https://github.com/nickel-lang/tsify-next) — no hand-maintained
parallel type surface.

## Installation

```sh
pnpm add @adobe/design-data-wasm
```

## Usage

### Node.js (synchronous — no `init()` required)

The `node` export condition resolves to a synchronous CommonJS build; named
imports work in ESM via cjs-module-lexer.

```js
import { Dataset, getValues, findValue } from '@adobe/design-data-wasm';

// Use the canonical embedded Spectrum dataset (zero config):
const ds = Dataset.embedded();

// Or build a dataset from your own token objects:
const tokens = JSON.parse(fs.readFileSync('my-tokens.json', 'utf-8'));
const ds = Dataset.fromTokens(tokens);

// Query
const colorTokens = ds.query('property=color,colorScheme=dark');
console.log(colorTokens[0].name, colorTokens[0].raw.value);

// Validate (relational rules — structural/JSON-Schema checks require the CLI)
const { valid, errors } = ds.validate();

// Resolve a property in a given context
const result = ds.resolve('background', { colorScheme: 'dark', scale: 'medium' });
if (result) console.log(result.token.raw.value, 'specificity:', result.specificity);

// Diff two datasets
const oldDs = Dataset.fromTokens(oldTokens);
const newDs = Dataset.fromTokens(newTokens);
const diff = oldDs.diff(newDs);
console.log(`${diff.added.length} added, ${diff.deleted.length} deleted`);
```

### Browser / bundler (requires `await init()`)

The `browser` export condition resolves to a browser ESM build. Call `init()`
with the URL of the `.wasm` file before using any API.

```js
import init, { Dataset } from '@adobe/design-data-wasm';
// or explicit browser path:
import init, { Dataset } from '@adobe/design-data-wasm/pkg/web/design_data_wasm.js';

await init(); // pass wasm URL if needed: await init(new URL('./wasm/design_data_wasm_bg.wasm', import.meta.url))

const ds = Dataset.fromTokens(tokens);
const results = ds.query('property=color');
```

## API

### `Dataset`

| Method                          | Returns                      | Description                                                                                              |
| ------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Dataset.embedded()`            | `Dataset`                    | Open the canonical embedded Spectrum dataset (prebuilt `.redb` cache — zero config) |
| `Dataset.fromTokens(tokens)`    | `Dataset`                    | Build a dataset from an array of raw token JSON objects                              |
| `ds.query(filterExpr)`          | `TokenResult[]`              | Filter tokens. Syntax: `key=value` pairs joined with `,` (AND) or `\|` (OR); `!=` negation; `*` wildcard |
| `ds.validate()`                 | `ValidationResult`           | Relational validation. `valid`, `errors[]`, `warnings[]`                             |
| `ds.resolve(property, context)` | `ResolveResult \| undefined` | Resolve a property in a mode-set context, e.g. `{ colorScheme: 'dark' }`            |
| `ds.diff(otherDataset)`         | `DiffResult`                 | Semantic diff. Fields: `renamed`, `deprecated`, `reverted`, `added`, `deleted`, `updated` |
| `ds.tokenCount()`               | `number`                     | Number of tokens in the dataset                                                      |

### Registry helpers

These match the deprecated `@adobe/design-system-registry` API, accepting the
`{ values: [...] }` JSON shape from `@adobe/spectrum-design-data/registry/*.json`.

| Function                    | Description                       |
| --------------------------- | --------------------------------- |
| `getValues(registry)`       | Return all value IDs              |
| `findValue(registry, term)` | Find an entry by ID or alias      |
| `hasValue(registry, term)`  | Check if an ID or alias exists    |
| `getDefault(registry)`      | Return the default entry          |
| `getActiveValues(registry)` | Return all non-deprecated entries |

### Embedded registry helpers

Fast lookups backed by the compile-time-embedded registry data (no JSON argument
needed):

| Function                          | Description                                                       |
| --------------------------------- | ----------------------------------------------------------------- |
| `getFieldValues(fieldName)`       | All IDs+aliases for a name field (`"property"`, `"component"`, …) |
| `hasFieldValue(fieldName, value)` | Membership check for a name field                                 |
| `getAdvisoryFields()`             | Names of advisory (non-normative) fields                          |

## TypeScript

Types are generated from the Rust structs; no parallel declaration needed.

```ts
import type { TokenResult, ValidationResult, DiffResult, ResolveResult } from '@adobe/design-data-wasm';
```

## License

Apache-2.0 — see [LICENSE](../../LICENSE).
