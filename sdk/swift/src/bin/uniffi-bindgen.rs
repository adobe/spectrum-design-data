// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `uniffi-bindgen` entry point.
//!
//! Run via `cargo run --bin uniffi-bindgen -- generate ...` to generate Swift
//! (or Kotlin / Python) bindings from the compiled `design-data-swift` library.
//!
//! Example:
//! ```sh
//! cargo build --release -p design-data-swift --features embedded
//! cargo run --bin uniffi-bindgen -- generate \
//!     --library target/release/libdesign_data_swift.dylib \
//!     --language swift \
//!     --out-dir sdk/swift/generated/
//! ```

fn main() {
    uniffi::uniffi_bindgen_main()
}
