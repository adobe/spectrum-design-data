# design-data-swift

Native Swift bindings for [`design-data-core`](../core), exposing the full Spectrum design-data
[`Dataset`](src/lib.rs) API — query, resolve, validate, diff, suggest, and primer — as an
idiomatic Swift class.

Distributed as a **universal XCFramework + Swift Package** for easy SPM integration.

## Prerequisites

| Tool                     | How to get                                                   |
| ------------------------ | ------------------------------------------------------------ |
| Xcode Command Line Tools | `xcode-select --install`                                     |
| Rust (Apple targets)     | `rustup target add aarch64-apple-darwin x86_64-apple-darwin` |
| Node.js ≥ 20             | (already required by the monorepo)                           |
| Moon                     | (already required by the monorepo)                           |

## Building

### 1. Generate the embedded token cache

```sh
moon run sdk-swift:cache-build
```

This bakes the canonical Spectrum token dataset into `src/embedded_cache.redb` (\~16 MB)
so `Dataset.embedded()` works without any network or filesystem access at runtime.

### 2. Build the XCFramework + Swift Package

```sh
moon run sdk-swift:build
# or directly:
node sdk/swift/scripts/build-swift.mjs
```

Outputs in `sdk/swift/dist/`:

```
dist/
  DesignData.xcframework/   ← universal static lib (arm64 + x86_64) + headers
  Package.swift             ← SPM manifest
  Sources/DesignData/       ← generated Swift glue (DesignDataSwift.swift)
```

### 3. (Optional) Run Rust unit tests

```sh
moon run sdk-swift:test
# or:
cargo test --package design-data-swift
```

Tests with `--features embedded` require step 1 first:

```sh
cargo test --package design-data-swift --features embedded
```

## Consuming via Swift Package Manager

Point SPM at the built `dist/` directory (local) or at a tagged GitHub Release (remote):

```swift
// Package.swift — local development
.package(path: "path/to/sdk/swift/dist")

// Package.swift — release (after publishing to a URL)
.package(url: "https://github.com/adobe/spectrum-design-data/releases/download/…", from: "0.1.0")
```

Add the product to your target:

```swift
.target(
    name: "MyApp",
    dependencies: [.product(name: "DesignData", package: "DesignData")]
)
```

## API Usage (Swift)

```swift
import DesignData

// Use the canonical embedded Spectrum dataset (no network, no filesystem):
let ds = try Dataset.embedded()

// Query tokens
let colorTokens = try ds.query(expr: "property=color,colorScheme=dark")
print("\(colorTokens.count) dark color tokens")

// Resolve the winning token for a property in a context
let result = ds.resolve(
    property: "background",
    context: ["colorScheme": "dark", "scale": "desktop"]
)
if let r = result {
    print("winner: \(r.token.name), specificity: \(r.specificity)")
    // r.token.raw is a JSON string — decode with Codable for structured access
}

// Resolve a legacy token reference
let chain = ds.resolveReference(
    tokenRef: "{accent-color-100}",
    context: ["colorScheme": "light"]
)
// chain.chain → ["{accent-color-100}", "{blue-100}", "rgb(245, 249, 255)"]

// Validate the dataset (relational rules)
let validation = ds.validate()
if !validation.valid {
    for error in validation.errors {
        print("Error: \(error.message)")
    }
}

// Suggest tokens for a natural-language intent
let suggestions = ds.suggest(
    intent: "primary button background",
    propertyHint: "color",
    limit: 5
)
for s in suggestions {
    print("\(s.tokenName) (\(s.confidence))")
}

// Diff two datasets
let oldDs = try Dataset.fromTokens(json: oldJson)
let newDs = try Dataset.fromTokens(json: newJson)
let diff = oldDs.diff(other: newDs)
print("\(diff.added.count) added, \(diff.deleted.count) deleted")

// Structural overview for tooling / agents
let primer = try ds.primer()  // JSON string → decode with Codable
```

## Data embedding

The `--features embedded` Cargo feature bakes the canonical Spectrum token dataset into the
binary as a prebuilt `.redb` cache blob (`src/embedded_cache.redb`, \~16 MB).

* **Sandbox-safe**: no `~/.cache` writes, no filesystem access after launch.
* **Zero-config offline**: `Dataset.embedded()` works immediately, even in App Store builds.
* **Versioned**: the blob is regenerated whenever the `@adobe/spectrum-design-data` package
  version changes (the `moon run sdk-swift:cache-build` task is gated on token file changes).

To update to a newer token version: bump `packages/design-data` and re-run `cache-build`.

## Architecture

```
sdk/swift/
├── Cargo.toml          — crate: design-data-swift (staticlib + cdylib + lib)
├── moon.yml            — cache-build, build, test, ci tasks
├── README.md           — this file
├── scripts/
│   └── build-swift.mjs — orchestrates cargo builds, lipo, uniffi-bindgen, xcodebuild
└── src/
    ├── lib.rs          — uniffi::setup_scaffolding!() + Dataset + types + conversions
    ├── bin/
    │   └── uniffi-bindgen.rs  — `cargo run --bin uniffi-bindgen` entry point
    └── embedded_cache.redb    — generated by cache-build (gitignored)
```

The crate depends on `design-data-core` with only the `cache` feature enabled (no
`schema-resolvers`, no `fetch`, no `figma`) — the same minimal feature set as the wasm crate.
This keeps the binary lean and avoids filesystem-dependent code paths.

## Generating Swift bindings (advanced)

The Swift glue is generated by `uniffi-bindgen` during `build-swift.mjs`. To regenerate
manually:

```sh
cargo build --release -p design-data-swift --features embedded
cargo run --bin uniffi-bindgen -- generate \
    --library target/release/libdesign_data_swift.dylib \
    --language swift \
    --out-dir sdk/swift/generated/
```

The generated `design_data_swift.swift` and `design_data_swiftFFI.h` / `.modulemap` live in
`generated/`. `build-swift.mjs` copies the Swift file to `dist/Sources/DesignData/` as part of
the XCFramework build.
