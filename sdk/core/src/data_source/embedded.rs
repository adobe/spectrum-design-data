// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Compile-time embedded Spectrum design-data snapshot.
//!
//! The design-data binary carries a pinned copy of `@adobe/spectrum-design-data` (the
//! canonical cascade-format token corpus) and the matching `@adobe/design-data-spec`
//! catalog baked in at build time via [`include_dir!`].  On first use outside a monorepo
//! checkout, [`materialize`] writes the snapshot to a version-namespaced directory under
//! the OS cache dir so the disk-based loaders in `graph.rs`, `schema.rs`, and
//! `discovery.rs` can read it as normal.
//!
//! The cache layout mirrors the monorepo, so [`crate::data_source::from_root`] can build
//! a [`crate::data_source::ResolvedData`] from it unchanged:
//!
//! ```text
//! <cache_root>/
//!   packages/
//!     design-data/
//!       tokens/         ← cascade-format token JSON files (*.tokens.json)
//!       components/
//!       fields/
//!       guidelines/     ← structured guideline documents (*.json + manifest.json)
//!       mode-sets/
//!     tokens/
//!       schemas/        ← JSON Schema files (+ token-types/ subdir)
//!       naming-exceptions.json
//!       manifest.json
//!   .complete           ← written last; signals a complete extraction
//! ```
//!
//! [`materialize`] is idempotent: if `.complete` already exists the function returns
//! immediately without touching the filesystem.

use std::io;
use std::path::{Path, PathBuf};

use include_dir::{include_dir, Dir};
// Dir is used for the embedded static types; include_dir! for the macros.

// ---------------------------------------------------------------------------
// Embedded data (baked into the binary at compile time)
// ---------------------------------------------------------------------------

/// Cascade-format token source files (`packages/design-data/tokens/*.tokens.json`, 8 files).
static TOKENS_SRC: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/../../packages/design-data/tokens");

/// JSON Schema files for token validation (`packages/tokens/schemas/`, ~88 KB).
/// Includes the `token-types/` subdirectory.
static TOKENS_SCHEMAS: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/../../packages/tokens/schemas");

/// Mode-set declarations (`packages/design-data/mode-sets/`, 3 files, ~12 KB).
static MODE_SETS: Dir<'_> =
    include_dir!("$CARGO_MANIFEST_DIR/../../packages/design-data/mode-sets");

/// Component declaration JSONs (`packages/design-data/components/`, 81 files, ~620 KB).
static COMPONENTS: Dir<'_> =
    include_dir!("$CARGO_MANIFEST_DIR/../../packages/design-data/components");

/// Taxonomy field JSONs (`packages/design-data/fields/`, 24 files, ~96 KB).
static FIELDS: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/../../packages/design-data/fields");

/// Guideline documents (`packages/design-data/guidelines/`, 25 files + manifest.json).
static GUIDELINES: Dir<'_> =
    include_dir!("$CARGO_MANIFEST_DIR/../../packages/design-data/guidelines");

/// Naming exceptions list (`packages/tokens/naming-exceptions.json`, ~46 KB).
static NAMING_EXCEPTIONS: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../packages/tokens/naming-exceptions.json"
));

/// Token build manifest — lists the 8 source JSON file paths
/// (`packages/tokens/manifest.json`).
static TOKENS_MANIFEST: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../packages/tokens/manifest.json"
));

// ---------------------------------------------------------------------------
// Version provenance
// ---------------------------------------------------------------------------

/// The `@adobe/spectrum-design-data` (cascade) version baked into this binary.
///
/// Derived at compile time from `packages/design-data/package.json` via `build.rs`.
pub const EMBEDDED_DATA_VERSION: &str = env!("DESIGN_DATA_VERSION");

// ---------------------------------------------------------------------------
// Cache-dir resolution
// ---------------------------------------------------------------------------

/// Returns the root directory where the snapshot will be (or has been) materialized.
///
/// Resolution order (first `Some` wins):
/// 1. `DESIGN_DATA_CACHE_DIR` env var (test seam / user override)
/// 2. `dirs::cache_dir()/design-data/embedded/<version>/`
///
/// Returns `None` if neither yields a path (e.g. no home dir on a headless system).
pub fn cache_root() -> Option<PathBuf> {
    if let Ok(p) = std::env::var("DESIGN_DATA_CACHE_DIR") {
        return Some(
            PathBuf::from(p)
                .join("embedded")
                .join(EMBEDDED_DATA_VERSION),
        );
    }
    dirs::cache_dir().map(|d| {
        d.join("design-data")
            .join("embedded")
            .join(EMBEDDED_DATA_VERSION)
    })
}

// ---------------------------------------------------------------------------
// Materialization
// ---------------------------------------------------------------------------

/// Write the embedded snapshot to the default cache directory and return its path.
///
/// Resolves the destination via [`cache_root`], then delegates to [`materialize_to`].
///
/// # Errors
///
/// Returns an `io::Error` if the cache root cannot be determined, or if any write
/// fails.  Callers should treat errors as non-fatal and fall back to in-repo probing.
pub fn materialize() -> io::Result<PathBuf> {
    let root = cache_root().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            "cannot determine cache directory (no home directory?)",
        )
    })?;
    materialize_to(&root)?;
    evict_stale_versions(&root);
    Ok(root)
}

/// Remove sibling version directories under `embedded/` that don't match the
/// current [`EMBEDDED_DATA_VERSION`], keeping the cache footprint bounded as
/// the binary is updated across releases.  Errors are silently ignored — eviction
/// is best-effort and must never cause the calling `materialize` to fail.
fn evict_stale_versions(current: &Path) {
    let Some(parent) = current.parent() else {
        return;
    };
    let Ok(entries) = std::fs::read_dir(parent) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path != current && path.is_dir() {
            let _ = std::fs::remove_dir_all(&path);
        }
    }
}

/// Write the embedded snapshot into `root` and return when complete.
///
/// Idempotent: if `<root>/.complete` already exists, returns immediately without
/// touching the filesystem.  The sentinel is written **last** so a killed first
/// run cannot leave a partial tree that later invocations trust.
///
/// Layout after a successful call (see module-level doc for the full tree):
/// - `<root>/packages/design-data/tokens/` — cascade-format token JSON (`*.tokens.json`)
/// - `<root>/packages/tokens/schemas/` — schema JSON (+ `token-types/`)
/// - `<root>/packages/tokens/naming-exceptions.json`
/// - `<root>/packages/tokens/manifest.json`
/// - `<root>/packages/design-data/mode-sets/`
/// - `<root>/packages/design-data/components/`
/// - `<root>/packages/design-data/fields/`
/// - `<root>/packages/design-data/guidelines/`
/// - `<root>/.complete`
///
/// # Errors
///
/// Returns an `io::Error` if the cache dir cannot be created or any write fails.
pub fn materialize_to(root: &Path) -> io::Result<()> {
    let sentinel = root.join(".complete");
    if sentinel.exists() {
        return Ok(());
    }

    // Extract into a sibling tmp dir, then rename to avoid a half-written state
    // being read by a concurrent or restarted process.
    let tmp = root.with_extension("tmp");
    if tmp.exists() {
        std::fs::remove_dir_all(&tmp)?;
    }

    // `Dir::extract` writes every file maintaining structure relative to the
    // included-dir root, returning `std::io::Result<()>`.
    // The base directory must exist before calling extract.
    let extract = |dir: &Dir<'_>, dest: &Path| -> io::Result<()> {
        std::fs::create_dir_all(dest)?;
        dir.extract(dest)
    };
    extract(&TOKENS_SRC, &tmp.join("packages/design-data/tokens"))?;
    extract(&TOKENS_SCHEMAS, &tmp.join("packages/tokens/schemas"))?;
    extract(&MODE_SETS, &tmp.join("packages/design-data/mode-sets"))?;
    extract(&COMPONENTS, &tmp.join("packages/design-data/components"))?;
    extract(&FIELDS, &tmp.join("packages/design-data/fields"))?;
    extract(&GUIDELINES, &tmp.join("packages/design-data/guidelines"))?;

    write_file(
        &tmp.join("packages/tokens/naming-exceptions.json"),
        NAMING_EXCEPTIONS.as_bytes(),
    )?;
    write_file(
        &tmp.join("packages/tokens/manifest.json"),
        TOKENS_MANIFEST.as_bytes(),
    )?;

    // Rename tmp → root.  Atomic on POSIX (same filesystem); non-atomic on Windows
    // cross-device, but the sentinel guarantees correctness regardless.
    //
    // Known race window: if two processes reach this point simultaneously they
    // share the same `tmp` path (root.with_extension("tmp")).  The second
    // remove_dir_all(&tmp) at the top of materialize_to will delete the first
    // process's in-progress work, but both will eventually succeed in writing a
    // complete snapshot.  For a design tool this is acceptable; a PID-suffixed tmp
    // dir would eliminate the race if stricter isolation is needed in future.
    if root.exists() {
        std::fs::remove_dir_all(root)?;
    }
    std::fs::rename(&tmp, root)?;

    // Write sentinel last.
    std::fs::write(&sentinel, EMBEDDED_DATA_VERSION.as_bytes())?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/// Write `contents` to `path`, creating parent directories as needed.
fn write_file(path: &Path, contents: &[u8]) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(path, contents)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    /// Materialize into a fresh temp dir.  Does not touch env vars, so tests can
    /// run in parallel without interfering with each other.
    fn temp_root() -> (TempDir, PathBuf) {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().join("embedded");
        materialize_to(&root).expect("materialize_to failed");
        (tmp, root)
    }

    #[test]
    fn materialize_creates_expected_layout() {
        let (_tmp, root) = temp_root();

        assert!(
            root.join("packages/design-data/tokens").is_dir(),
            "design-data/tokens missing"
        );
        assert!(
            root.join("packages/tokens/schemas/token-types").is_dir(),
            "schemas/token-types missing"
        );
        assert!(
            root.join("packages/design-data/mode-sets").is_dir(),
            "mode-sets missing"
        );
        assert!(
            root.join("packages/design-data/components").is_dir(),
            "components missing"
        );
        assert!(
            root.join("packages/design-data/fields").is_dir(),
            "fields missing"
        );
        assert!(
            root.join("packages/design-data/guidelines").is_dir(),
            "guidelines missing"
        );
        assert!(
            root.join("packages/tokens/naming-exceptions.json")
                .is_file(),
            "naming-exceptions.json missing"
        );
        assert!(
            root.join("packages/tokens/manifest.json").is_file(),
            "manifest.json missing"
        );
        assert!(
            root.join(".complete").is_file(),
            ".complete sentinel missing"
        );
    }

    #[test]
    fn materialize_is_idempotent() {
        let (_tmp, root) = temp_root();

        // Corrupt the sentinel; a second call should return immediately (sentinel
        // exists) without re-extracting, so the corruption persists.
        let sentinel = root.join(".complete");
        fs::write(&sentinel, "DIRTY").unwrap();

        materialize_to(&root).expect("second materialize_to failed");

        assert_eq!(
            fs::read_to_string(&sentinel).unwrap(),
            "DIRTY",
            "second call should not have overwritten the sentinel"
        );
    }

    #[test]
    fn materialize_token_src_contains_json_files() {
        // Regression guard: if the number of embedded token source files changes
        // (files added/removed from packages/design-data/tokens/), this test fails
        // deliberately so the change is noticed and EMBEDDED_DATA_VERSION is
        // bumped alongside it.  Update the expected count if you've intentionally
        // added or removed token source files.
        let (_tmp, root) = temp_root();
        let json_files: Vec<_> = fs::read_dir(root.join("packages/design-data/tokens"))
            .unwrap()
            .flatten()
            .filter(|e| e.path().extension().is_some_and(|x| x == "json"))
            .collect();
        assert_eq!(
            json_files.len(),
            8,
            "expected 8 cascade token source files — update this count if you've added/removed \
             files from packages/design-data/tokens/ and bump EMBEDDED_DATA_VERSION"
        );
    }

    #[test]
    fn materialize_schemas_has_token_types_subdir() {
        let (_tmp, root) = temp_root();
        let schemas: Vec<_> = fs::read_dir(root.join("packages/tokens/schemas/token-types"))
            .unwrap()
            .flatten()
            .filter(|e| e.path().extension().is_some_and(|x| x == "json"))
            .collect();
        assert!(
            !schemas.is_empty(),
            "token-types/ should contain at least one JSON schema"
        );
    }

    #[test]
    fn materialize_guidelines_count() {
        // Regression guard: if a guideline is added to or removed from
        // packages/design-data/guidelines/, this test fails deliberately.
        // Update the expected count when you've intentionally changed the set.
        // manifest.json is excluded — it is not a guideline document.
        let (_tmp, root) = temp_root();
        let guidelines: Vec<_> = fs::read_dir(root.join("packages/design-data/guidelines"))
            .unwrap()
            .flatten()
            .filter(|e| {
                e.path().extension().is_some_and(|x| x == "json")
                    && e.file_name() != "manifest.json"
            })
            .collect();
        assert_eq!(
            guidelines.len(),
            25,
            "expected 25 guideline documents — update this count if you've added/removed \
             files from packages/design-data/guidelines/"
        );
    }

    #[test]
    fn materialize_components_count() {
        // Regression guard: if a component schema is added to or removed from
        // packages/design-data/components/, this test fails deliberately.
        // Update the expected count when you've intentionally changed the set.
        let (_tmp, root) = temp_root();
        let components: Vec<_> = fs::read_dir(root.join("packages/design-data/components"))
            .unwrap()
            .flatten()
            .filter(|e| e.path().extension().is_some_and(|x| x == "json"))
            .collect();
        assert_eq!(
            components.len(),
            81,
            "expected 81 component schemas — update this count if you've added/removed \
             schemas from packages/design-data/components/"
        );
    }
}
