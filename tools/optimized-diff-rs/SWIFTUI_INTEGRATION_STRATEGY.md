# Rust → SwiftUI Integration Strategy

## 🚨 **WASM vs Native: The Key Decision**

**WASM does NOT work with SwiftUI** - iOS/macOS apps cannot run WebAssembly directly. You need native compilation targets for Apple platforms.

## 🎯 **Recommended Approach: UniFFI + Native Compilation**

Based on industry research, **UniFFI is the gold standard** for Rust ↔ Swift integration:

### ✅ **Why UniFFI Wins**

- **Automatic binding generation** (Swift, Kotlin, Python)
- **Type-safe interfaces** between Rust and Swift
- **Used by Mozilla** (Firefox, Thunderbird)
- **Active maintenance** and excellent documentation
- **Clean, idiomatic Swift APIs**

### 📊 **Comparison: Integration Methods**

| Method         | Complexity | Type Safety | Performance | Maintenance | Winner             |
| -------------- | ---------- | ----------- | ----------- | ----------- | ------------------ |
| **UniFFI**     | Low        | Excellent   | 100% native | Low         | **🏆**             |
| **Manual FFI** | High       | Manual      | 100% native | High        | ❌                 |
| **NAPI-RS**    | N/A        | N/A         | N/A         | N/A         | ❌ (Node.js only)  |
| **WASM**       | N/A        | N/A         | N/A         | N/A         | ❌ (Not supported) |

## 🚀 **UniFFI Implementation Plan**

### **Phase 1: Add UniFFI Dependencies**

```toml
# Cargo.toml
[dependencies]
uniffi = "0.25"

[build-dependencies]
uniffi = { version = "0.25", features = ["build"] }

[[bin]]
name = "uniffi-bindgen"
path = "uniffi-bindgen.rs"

[lib]
crate-type = ["staticlib", "cdylib"]
name = "optimized_diff"
```

### **Phase 2: Define UniFFI Interface**

```rust
// src/lib.rs
use uniffi;

// Define the interface that Swift will see
#[derive(uniffi::Record)]
pub struct DetailedDiffResult {
    pub added: HashMap<String, serde_json::Value>,
    pub updated: HashMap<String, serde_json::Value>,
    pub deleted: HashMap<String, serde_json::Value>,
}

#[uniffi::export]
pub fn detailed_diff(original: String, updated: String) -> Result<DetailedDiffResult, String> {
    let original_json: serde_json::Value = serde_json::from_str(&original)
        .map_err(|e| format!("Invalid original JSON: {}", e))?;
    let updated_json: serde_json::Value = serde_json::from_str(&updated)
        .map_err(|e| format!("Invalid updated JSON: {}", e))?;

    let engine = crate::engine::DiffEngine::new();
    let result = engine.detailed_diff(&original_json, &updated_json)
        .map_err(|e| format!("Diff error: {}", e))?;

    Ok(DetailedDiffResult {
        added: result.added,
        updated: result.updated,
        deleted: result.deleted,
    })
}

#[uniffi::export]
pub fn diff(original: String, updated: String) -> Result<HashMap<String, serde_json::Value>, String> {
    let original_json: serde_json::Value = serde_json::from_str(&original)
        .map_err(|e| format!("Invalid original JSON: {}", e))?;
    let updated_json: serde_json::Value = serde_json::from_str(&updated)
        .map_err(|e| format!("Invalid updated JSON: {}", e))?;

    let engine = crate::engine::DiffEngine::new();
    engine.diff(&original_json, &updated_json)
        .map_err(|e| format!("Diff error: {}", e))
}

// UniFFI setup
uniffi::setup_scaffolding!();
```

### **Phase 3: Interface Definition (UDL)**

```idl
// optimized_diff.udl
namespace optimized_diff {
    DetailedDiffResult detailed_diff(string original, string updated);
    record<string, string> diff(string original, string updated);
};

dictionary DetailedDiffResult {
    record<string, string> added;
    record<string, string> updated;
    record<string, string> deleted;
};
```

### **Phase 4: Build Script**

```rust
// uniffi-bindgen.rs
fn main() {
    uniffi::uniffi_bindgen_main()
}
```

```rust
// build.rs
fn main() {
    uniffi::generate_scaffolding("src/optimized_diff.udl").unwrap();
}
```

### **Phase 5: Cross-Compilation Targets**

```bash
# Add Apple targets
rustup target add aarch64-apple-ios          # iOS devices
rustup target add aarch64-apple-ios-sim      # iOS simulator (M1)
rustup target add x86_64-apple-ios           # iOS simulator (Intel)
rustup target add aarch64-apple-darwin       # macOS (M1)
rustup target add x86_64-apple-darwin        # macOS (Intel)
```

### **Phase 6: Build Script for Swift**

```bash
#!/bin/bash
# build-swift.sh

CRATE_NAME="optimized_diff"
LIB_NAME="lib${CRATE_NAME}.a"

# Build for all targets
cargo build --target aarch64-apple-ios --release
cargo build --target aarch64-apple-ios-sim --release
cargo build --target x86_64-apple-ios --release
cargo build --target aarch64-apple-darwin --release
cargo build --target x86_64-apple-darwin --release

# Generate Swift bindings
cargo run --bin uniffi-bindgen generate \
    --library target/aarch64-apple-ios/release/${LIB_NAME} \
    --language swift \
    --out-dir swift-bindings

# Create XCFramework (universal framework)
xcodebuild -create-xcframework \
    -library target/aarch64-apple-ios/release/${LIB_NAME} \
    -library target/aarch64-apple-ios-sim/release/${LIB_NAME} \
    -library target/x86_64-apple-ios/release/${LIB_NAME} \
    -library target/aarch64-apple-darwin/release/${LIB_NAME} \
    -library target/x86_64-apple-darwin/release/${LIB_NAME} \
    -output ${CRATE_NAME}.xcframework
```

## 📱 **SwiftUI Integration**

### **Generated Swift Code Usage**

After running the build script, you get:

- `optimized_diff.swift` - Swift bindings
- `optimized_diffFFI.h` - C headers
- `optimized_diff.xcframework` - Universal framework

### **SwiftUI Example**

```swift
// ContentView.swift
import SwiftUI
import optimized_diff

struct ContentView: View {
    @State private var originalJSON = "{\"a\": 1, \"b\": 2}"
    @State private var updatedJSON = "{\"a\": 1, \"b\": 3, \"c\": 4}"
    @State private var result: DetailedDiffResult?
    @State private var error: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Rust-Powered Diff Tool")
                .font(.title)
                .padding()

            Group {
                Text("Original JSON:")
                TextEditor(text: $originalJSON)
                    .font(.monospaced())
                    .border(Color.gray)

                Text("Updated JSON:")
                TextEditor(text: $updatedJSON)
                    .font(.monospaced())
                    .border(Color.gray)
            }

            Button("Calculate Diff (Rust)") {
                calculateDiff()
            }
            .buttonStyle(.borderedProminent)

            if let result = result {
                DiffResultView(result: result)
            }

            if let error = error {
                Text("Error: \(error)")
                    .foregroundColor(.red)
            }
        }
        .padding()
    }

    private func calculateDiff() {
        do {
            // Direct call to Rust function!
            result = try detailedDiff(
                original: originalJSON,
                updated: updatedJSON
            )
            error = nil
        } catch {
            self.error = error.localizedDescription
            result = nil
        }
    }
}

struct DiffResultView: View {
    let result: DetailedDiffResult

    var body: some View {
        VStack(alignment: .leading) {
            Text("Diff Results:")
                .font(.headline)

            Group {
                Text("Added: \(result.added.count) items")
                    .foregroundColor(.green)
                Text("Updated: \(result.updated.count) items")
                    .foregroundColor(.orange)
                Text("Deleted: \(result.deleted.count) items")
                    .foregroundColor(.red)
            }
            .font(.monospaced())
        }
    }
}
```

## 🏗️ **Moon Integration**

```yaml
# moon.yml for optimized-diff-rs
tasks:
  swift-build:
    command:
      - ./build-swift.sh
    platform: rust
    outputs:
      - swift-bindings/
      - optimized_diff.xcframework

  ios-framework:
    command:
      - cargo
      - build
      - --target
      - aarch64-apple-ios
      - --release
    platform: rust
    deps:
      - ~:swift-build
    outputs:
      - target/aarch64-apple-ios/release/
```

## 📊 **Performance Characteristics**

### **Expected Performance**

- **100% native performance** (no overhead like WASM)
- **Direct function calls** between Swift and Rust
- **Zero-copy data transfer** for most operations
- **Memory-safe** with automatic reference counting

### **Bundle Size Impact**

```
SwiftUI app alone:           ~2MB
+ Rust library:             ~3-5MB
Total app size:             ~5-7MB
```

## 🔧 **Development Workflow**

### **1. Rust Development**

```bash
# Standard Rust development
cargo test
cargo bench
```

### **2. Swift Integration**

```bash
# Rebuild Swift bindings after Rust changes
./build-swift.sh
```

### **3. iOS Testing**

```bash
# Test on iOS simulator
xcodebuild -scheme YourApp -destination 'platform=iOS Simulator,name=iPhone 15'
```

## 🌟 **Real-World Examples**

### **Companies Using Rust + Swift**

- **Mozilla**: Firefox iOS app with Rust components
- **Dropbox**: File sync engine in Rust, UI in Swift
- **1Password**: Crypto operations in Rust
- **Signal**: Cryptographic protocols in Rust

### **Open Source Projects**

- **LemmyApp**: iOS client with Rust backend
- **Portals**: macOS app using Ockam Rust library
- **Matrix SDK**: End-to-end encryption in Rust

## 🎯 **Advantages of This Approach**

### ✅ **Technical Benefits**

- **100% native performance** on iOS/macOS
- **Memory safety** guaranteed by Rust
- **Type-safe interfaces** with automatic generation
- **Universal binary** support for all Apple devices
- **No JavaScript bridge** overhead

### ✅ **Developer Experience**

- **Clean Swift APIs** that feel native
- **Excellent tooling** with Xcode integration
- **Hot reloading** during development
- **Familiar debugging** with lldb

### ✅ **Distribution**

- **App Store compatible** (statically linked)
- **No external dependencies** at runtime
- **Universal apps** for iOS/macOS with shared code
- **Offline functionality** (no web runtime needed)

## 🚀 **Getting Started Steps**

1. **Add UniFFI to your Rust project**
2. **Define your interface** in `.udl` file
3. **Add Apple compilation targets**
4. **Create the build script**
5. **Generate Swift bindings**
6. **Import into Xcode project**
7. **Use from SwiftUI** like any Swift library!

## 📈 **Why This Beats WASM for Mobile**

| Factor                     | UniFFI + Native | WASM            | Winner     |
| -------------------------- | --------------- | --------------- | ---------- |
| **Performance**            | 100% native     | 80-95%          | **Native** |
| **Bundle Size**            | ~3-5MB          | Not applicable  | **Native** |
| **iOS/macOS Support**      | Full support    | Not supported   | **Native** |
| **App Store**              | ✅ Approved     | ❌ Not allowed  | **Native** |
| **Development Experience** | Native tooling  | Web tooling     | **Native** |
| **Memory Usage**           | Optimal         | Higher overhead | **Native** |

## 🎯 **Bottom Line**

For SwiftUI applications:

- ❌ **WASM**: Not supported on iOS/macOS
- ❌ **Manual FFI**: Too complex and error-prone
- ✅ **UniFFI**: Perfect fit - type-safe, performant, well-maintained

**UniFFI gives you the best of both worlds**: Rust's performance and safety with Swift's excellent UI capabilities and native platform integration.

Would you like me to implement the UniFFI bindings for the optimized-diff package?
