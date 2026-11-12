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

## Building from a checkout

Run `pnpm install` from the repository root, then `moon run sdk-wasm:build`.
The workspace provides a pinned `wasm-pack`; no global installation is needed.
pnpm allows this tool's installation script to download its native executable.
The pinned Rust toolchain is still required.

## Release verification

Run `moon run sdk-wasm:verify-package` to build both targets and check the
packed package before publishing. The check installs the tarball in a temporary
consumer outside the workspace and runs embedded-data queries through the Node
and web entrypoints. It also checks that the bindings, types, and wasm binaries
are present and valid. It does not publish packages.

Snapshot and stable release workflows run the same check after downloading
their wasm build artifacts.

## Usage

### Node.js (synchronous — no `init()` required)

The `node` export condition resolves to a synchronous CommonJS build; named
imports work in ESM via cjs-module-lexer.

```js
import { Dataset, getValues, findValue } from "@adobe/design-data-wasm";

// Use the canonical embedded Spectrum dataset (zero config):
const ds = Dataset.embedded();

// Or build a dataset from your own token objects:
const tokens = JSON.parse(fs.readFileSync("my-tokens.json", "utf-8"));
const customDs = Dataset.fromTokens(tokens);

// Query
const colorTokens = ds.query("property=color,colorScheme=dark");
console.log(colorTokens[0].name, colorTokens[0].raw.value);

// Validate (relational rules — structural/JSON-Schema checks require the CLI)
const { valid, errors } = ds.validate();

// Resolve a property in a given context
const result = ds.resolve("background", {
  colorScheme: "dark",
  scale: "medium",
});
if (result)
  console.log(result.token.raw.value, "specificity:", result.specificity);

// Diff two datasets
const oldDs = Dataset.fromTokens(oldTokens);
const newDs = Dataset.fromTokens(newTokens);
const diff = oldDs.diff(newDs);
console.log(`${diff.added.length} added, ${diff.deleted.length} deleted`);
```

### Browser / bundler (requires `await init()`)

The `browser` export condition resolves to a browser ESM build. Call `init()`
with the URL of the `.wasm` file before using any API.

> **Note for Deno, Bun, and non-standard bundlers:** the package's `default` export
> condition also resolves to the web (browser ESM) build, so runtimes or bundlers that
> don't honour the `node` or `browser` condition will get this build and **must** call
> `await init()` before using any API.

```js
import init, { Dataset } from "@adobe/design-data-wasm";
// or explicit browser path:
import init, {
  Dataset,
} from "@adobe/design-data-wasm/web";

await init(); // pass wasm URL if needed: await init(new URL('./wasm/design_data_wasm_bg.wasm', import.meta.url))

const ds = Dataset.fromTokens(tokens);
const results = ds.query("property=color");
```

For bundlers that emit assets, import
`@adobe/design-data-wasm/module.wasm?url` and pass that URL to `init()`.
Keep initialization and large queries in a worker when they would otherwise
block the browser's main thread.

## API

### Reusable batch value resolution

`ValueResolver` shares the native CLI's `resolve-values` implementation. It
accepts source-keyed records and custom mode declarations, then reuses its
prepared graph across query batches. It does not replace structural
JSON-schema validation or provide file locations for embedded tokens.

```js
import { ValueResolver } from '@adobe/design-data-wasm';

const resolver = new ValueResolver({
  records: [
    { id: 'tokens/example.json#example', source: 'tokens/example.json',
      raw: { uuid: 'example', name: { property: 'size' }, value: 8 } },
  ],
  modeSets: [],
});
try {
  const rows = resolver.resolveValues([
    { id: 'tokens/example.json#example', context: {}, selectConcept: true },
  ]);
  console.log(rows[0].value, rows[0].chain, rows[0].issue);
} finally {
  resolver.free();
}
```

Results retain the query ID, selected record ID, label, context, structured
value, alias chain and diagnostic. Missing optional results are `null`.
Ambiguous identities, cycles and missing references remain diagnostics, not
silently selected values. Free replaced resolvers to release their Rust memory.

### Legacy compatibility output

`ds.legacyOutput()` returns a plain object keyed by legacy output filename.
Each file contains token entries keyed by legacy name, including reconstructed
mode sets and aliases. The embedded dataset includes component/token relationships.
Non-default contrast records are excluded, matching native graph legacy output.

```js
const byFile = ds.legacyOutput();
const flat = Object.assign({}, ...Object.values(byFile));
console.log(flat['picker-border-width'].value);
```

### `Dataset`

| Method                          | Returns                      | Description                                                                                                                                                                                                                   |
| ------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dataset.embedded()`            | `Dataset`                    | Open the canonical embedded Spectrum dataset (prebuilt `.redb` cache — zero config). The full token dataset is compiled into the `.wasm` binary via `include_bytes!`; use `fromTokens()` instead if binary size is a concern. |
| `Dataset.fromTokens(tokens)`    | `Dataset`                    | Build a dataset from an array of raw token JSON objects                                                                                                                                                                       |
| `ds.query(filterExpr)`          | `TokenResult[]`              | Filter tokens. Syntax: `key=value` pairs joined with `,` (AND) or `\|` (OR); `!=` negation; `*` wildcard                                                                                                                      |
| `ds.validate()`                 | `ValidationResult`           | Relational validation. `valid`, `errors[]`, `warnings[]`                                                                                                                                                                      |
| `ds.resolve(property, context)` | `ResolveResult \| undefined` | Resolve a property in a mode-set context, e.g. `{ colorScheme: 'dark' }`                                                                                                                                                      |
| `ds.diff(otherDataset)`         | `DiffResult`                 | Semantic diff. Fields: `renamed`, `deprecated`, `reverted`, `added`, `deleted`, `updated`                                                                                                                                     |
| `ds.tokenCount()`               | `number`                     | Number of tokens in the dataset                                                                                                                                                                                               |

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
import type {
  TokenResult,
  ValidationResult,
  DiffResult,
  ResolveResult,
} from "@adobe/design-data-wasm";
```

## License

Apache-2.0 — see [LICENSE](../../LICENSE).

### Third-party notices

The visual renderer's default text-measurement table (glyph advances and kerning) is measured from Source Sans 3, Copyright 2010-2024 Adobe (<http://www.adobe.com/>), with Reserved Font Name "Source", licensed under the [SIL Open Font License 1.1](https://openfontlicense.org/open-font-license-official-text/). The full text is in `sdk/core/src/text-metrics/OFL-SourceSans3.txt` in the repository.
