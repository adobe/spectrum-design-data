// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Fetch-and-cache engine for remote design-data sources.
//!
//! This module is compiled only when the `fetch` feature is enabled.  Without the
//! feature the resolver's `github`/`npm`/`git` arms remain as `NotYetImplemented`
//! stubs, so a default `cargo build` always compiles cleanly.
//!
//! ## Cache layout
//!
//! Fetched datasets are cached under:
//! ```text
//! <base>/sources/<type>/<key>/
//!   packages/design-data/tokens/*.tokens.json
//!   packages/tokens/schemas/**
//!   packages/tokens/naming-exceptions.json
//!   packages/tokens/manifest.json
//!   packages/design-data/mode-sets/          ← github / git only
//!   packages/design-data/components/
//!   packages/design-data/fields/
//!   .complete                                ← written last; signals complete extraction
//! ```
//!
//! Where `<base>` is resolved in priority order:
//! 1. Explicit `cache_dir` argument (from `[cache].dir` in `.design-data.toml`)
//! 2. `DESIGN_DATA_CACHE_DIR` env var
//! 3. `dirs::cache_dir()/design-data`
//!
//! ## Implemented sources
//!
//! | Source   | Status          | Dataset          |
//! |----------|-----------------|------------------|
//! | `github` | ✅ implemented  | Full (tokens + spec catalog) |
//! | `npm`    | 🚧 stub         | Tokens only — no spec catalog in npm tarball |
//! | `git`    | 🚧 stub         | Planned: `gix` crate |
//!
//! ## Atomicity
//!
//! Follows the same pattern as [`super::embedded::materialize_to`]:
//! 1. Check for `<root>/.complete` sentinel (cache-hit fast-path, idempotent).
//! 2. Extract into `<root>.tmp`, removing any stale `tmp` first.
//! 3. Atomic rename `tmp` → `root`.
//! 4. Write `.complete` last.

use std::io;
use std::path::{Path, PathBuf};

use thiserror::Error;

use super::SourceConfig;

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/// Errors that can occur during remote fetch / cache operations.
#[derive(Debug, Error)]
pub enum FetchError {
    /// The source type is recognised but not yet implemented.
    #[error("source type '{source_type}' is not yet fully implemented: {reason}")]
    NotYetSupported {
        source_type: &'static str,
        reason: &'static str,
    },
    /// A network request failed.
    #[error("network error fetching {url}: {source}")]
    Network {
        url: String,
        #[source]
        source: reqwest::Error,
    },
    /// The downloaded archive could not be extracted.
    #[error("failed to extract archive from {url}: {source}")]
    Extract {
        url: String,
        #[source]
        source: io::Error,
    },
    /// A local filesystem operation failed.
    #[error("cache I/O error: {0}")]
    Io(#[from] io::Error),
    /// Could not determine the OS cache directory.
    #[error("cannot determine cache directory (no home directory?)")]
    NoCacheDir,
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/// Ensure a fetched dataset is present in the cache and return its root path.
///
/// This is the single call that the resolver makes.  It is **idempotent**: if
/// `<root>/.complete` exists the function returns immediately without touching
/// the network.
///
/// `cache_dir_override` comes from `[cache].dir` in `.design-data.toml`; pass
/// `None` to fall back to the env var / OS cache dir.
pub fn ensure_cached(
    source: &SourceConfig,
    cache_dir_override: Option<&Path>,
) -> Result<PathBuf, FetchError> {
    let base = resolve_cache_base(cache_dir_override)?;
    match source {
        SourceConfig::Github { repo, tag } => fetch_github(&base, repo, tag),
        SourceConfig::Npm { .. } => Err(FetchError::NotYetSupported {
            source_type: "npm",
            reason: "the @adobe/spectrum-tokens npm tarball contains only token data \
                     (no design-data-spec catalog). Use source.type = \"github\" for the \
                     full dataset. npm support is planned for a future release.",
        }),
        SourceConfig::Git { .. } => Err(FetchError::NotYetSupported {
            source_type: "git",
            reason: "git source support is planned (will use the gix crate). \
                     Use source.type = \"github\" for tagged releases.",
        }),
        // `Path` is handled by the resolver directly and never reaches fetch.
        SourceConfig::Path { .. } => unreachable!("path source does not go through fetch"),
    }
}

// ---------------------------------------------------------------------------
// Cache-base resolution
// ---------------------------------------------------------------------------

/// Resolve the base directory for all fetched sources:
/// `<base>/sources/<type>/<key>/`
fn resolve_cache_base(override_dir: Option<&Path>) -> Result<PathBuf, FetchError> {
    if let Some(p) = override_dir {
        return Ok(p.to_path_buf().join("sources"));
    }
    if let Ok(p) = std::env::var("DESIGN_DATA_CACHE_DIR") {
        return Ok(PathBuf::from(p).join("sources"));
    }
    dirs::cache_dir()
        .map(|d| d.join("design-data").join("sources"))
        .ok_or(FetchError::NoCacheDir)
}

// ---------------------------------------------------------------------------
// GitHub source
// ---------------------------------------------------------------------------

fn fetch_github(base: &Path, repo: &str, tag: &str) -> Result<PathBuf, FetchError> {
    // Sanitize repo and tag for use as filesystem path components.
    // We keep an `@` separator between the repo slug and the safe tag so that a
    // tag like `adobe/spectrum-tokens14.11.0` (no `@`) doesn't collide with
    // `@adobe/spectrum-tokens@14.11.0` after sanitization.
    let safe_repo = repo.replace('/', "-");
    let safe_tag = tag.replace(['/', '@'], "-");
    let key = format!("github/{safe_repo}@{safe_tag}");
    let root = base.join(&key);
    let sentinel = root.join(".complete");

    if sentinel.exists() {
        return Ok(root);
    }

    let url = format!("https://github.com/{repo}/archive/refs/tags/{tag}.tar.gz");

    let bytes = download_bytes(&url)?;
    extract_github_tarball(&bytes, &url, &root)?;
    evict_stale_versions(&root, &base.join("github").join(&safe_repo));

    Ok(root)
}

/// Download `url` and return the response body as bytes.
///
/// Uses async `reqwest` + a one-shot `tokio::Runtime` (same pattern as the Figma
/// client).  A 60-second overall timeout prevents silent hangs on slow or stuck
/// connections.
///
/// The body is buffered in memory before returning (~2 MB for a Spectrum release
/// tarball).  This is a deliberate tradeoff: streaming directly into a `tar`
/// decoder would complicate the API and error paths, and the current tarball size
/// is well within typical memory budgets.
fn download_bytes(url: &str) -> Result<Vec<u8>, FetchError> {
    let rt = tokio::runtime::Runtime::new().map_err(FetchError::Io)?;
    rt.block_on(async {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .map_err(|e| FetchError::Network {
                url: url.to_string(),
                source: e,
            })?;
        let resp = client
            .get(url)
            .send()
            .await
            .map_err(|e| FetchError::Network {
                url: url.to_string(),
                source: e,
            })?;
        let status = resp.status();
        if !status.is_success() {
            return Err(FetchError::Network {
                url: url.to_string(),
                source: resp
                    .error_for_status()
                    .expect_err("non-success status confirmed"),
            });
        }
        let bytes = resp.bytes().await.map_err(|e| FetchError::Network {
            url: url.to_string(),
            source: e,
        })?;
        Ok(bytes.to_vec())
    })
}

/// Extract a GitHub release tarball (`.tar.gz`) into `dest`.
///
/// GitHub tarballs have a single top-level directory whose name is derived from
/// the repo name and tag (e.g. `spectrum-design-data--adobe-spectrum-tokens-14.11.0/`).
/// This function strips that prefix dynamically by reading the first path component,
/// and only extracts entries under `packages/tokens/` and
/// `packages/design-data/{tokens,components,fields,mode-sets}/`.
///
/// Uses the same atomic tmp-rename + `.complete`-sentinel pattern as
/// [`super::embedded::materialize_to`].
fn extract_github_tarball(bytes: &[u8], url: &str, dest: &Path) -> Result<(), FetchError> {
    // Ensure the parent directory exists before creating the tmp dir.
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(FetchError::Io)?;
    }

    let tmp = dest.with_extension("tmp");
    if tmp.exists() {
        std::fs::remove_dir_all(&tmp).map_err(FetchError::Io)?;
    }

    extract_tarball_inner(bytes, url, &tmp)?;

    if dest.exists() {
        std::fs::remove_dir_all(dest).map_err(FetchError::Io)?;
    }
    std::fs::rename(&tmp, dest).map_err(FetchError::Io)?;
    std::fs::write(dest.join(".complete"), "").map_err(FetchError::Io)?;

    Ok(())
}

fn extract_tarball_inner(bytes: &[u8], url: &str, dest: &Path) -> Result<(), FetchError> {
    use flate2::read::GzDecoder;
    use tar::Archive;

    let cursor = io::Cursor::new(bytes);
    let gz = GzDecoder::new(cursor);
    let mut archive = Archive::new(gz);

    // Determine the top-level prefix by peeking at the first entry.
    // We'll strip it from every path before writing.
    let mut prefix: Option<String> = None;

    let entries = archive.entries().map_err(|e| FetchError::Extract {
        url: url.to_string(),
        source: e,
    })?;

    for entry_result in entries {
        let mut entry = entry_result.map_err(|e| FetchError::Extract {
            url: url.to_string(),
            source: e,
        })?;
        let raw_path = entry
            .path()
            .map_err(|e| FetchError::Extract {
                url: url.to_string(),
                source: e,
            })?
            .to_path_buf();

        // Establish the top-level prefix from the first *regular* entry.
        // Skip PAX extended header entries ("pax_global_header", "pax_header")
        // which appear before actual content in GitHub-generated tarballs.
        if prefix.is_none() {
            let entry_type = entry.header().entry_type();
            let is_pax = entry_type == tar::EntryType::XGlobalHeader
                || entry_type == tar::EntryType::XHeader;
            if !is_pax {
                if let Some(first_component) = raw_path.components().next() {
                    prefix = Some(first_component.as_os_str().to_string_lossy().into_owned());
                }
            }
        }

        // Skip entries before we've established the prefix (PAX headers, etc.)
        let Some(ref pfx) = prefix else { continue };

        // Strip the top-level prefix to get the repo-relative path.
        let rel = match raw_path.strip_prefix(pfx.as_str()) {
            Ok(r) => r.to_path_buf(),
            Err(_) => continue,
        };

        if rel.as_os_str().is_empty() {
            continue;
        }

        // Only extract paths we need:
        //   packages/tokens/**
        //   packages/design-data/mode-sets/**
        //   packages/design-data/components/**
        //   packages/design-data/fields/**
        if !should_extract(&rel) {
            continue;
        }

        let target = dest.join(&rel);

        if entry.header().entry_type().is_dir() {
            std::fs::create_dir_all(&target).map_err(|e| FetchError::Extract {
                url: url.to_string(),
                source: e,
            })?;
        } else {
            if let Some(parent) = target.parent() {
                std::fs::create_dir_all(parent).map_err(|e| FetchError::Extract {
                    url: url.to_string(),
                    source: e,
                })?;
            }
            entry.unpack(&target).map_err(|e| FetchError::Extract {
                url: url.to_string(),
                source: e,
            })?;
        }
    }

    Ok(())
}

/// Returns true for paths we want to extract from the GitHub tarball.
fn should_extract(rel: &Path) -> bool {
    let mut components = rel.components();
    let first = components
        .next()
        .map(|c| c.as_os_str().to_string_lossy().into_owned());
    let second = components
        .next()
        .map(|c| c.as_os_str().to_string_lossy().into_owned());

    match (first.as_deref(), second.as_deref()) {
        // Retain all of packages/tokens/** (schemas, naming-exceptions, manifest, and
        // any legacy tokens/src that may appear in older remote tarballs).  The token
        // data itself now lives under packages/design-data/tokens (arm below), but
        // schemas and metadata still live here — so the whole parent is kept by design.
        (Some("packages"), Some("tokens")) => true,
        (Some("packages"), Some("design-data")) => {
            // tokens/ — cascade-format token data; components/, fields/, mode-sets/ — Spectrum catalog.
            let third = components
                .next()
                .map(|c| c.as_os_str().to_string_lossy().into_owned());
            matches!(
                third.as_deref(),
                Some("tokens") | Some("components") | Some("fields") | Some("mode-sets")
            )
        }
        _ => false,
    }
}

// ---------------------------------------------------------------------------
// Stale-version eviction
// ---------------------------------------------------------------------------

/// Remove sibling version directories under `parent_dir` that differ from
/// `current`, keeping the cache footprint bounded across version upgrades.
/// Best-effort: errors are silently ignored.
fn evict_stale_versions(current: &Path, parent_dir: &Path) {
    if !parent_dir.is_dir() {
        return;
    }
    let current_name = match current.file_name() {
        Some(n) => n,
        None => return,
    };
    let Ok(entries) = std::fs::read_dir(parent_dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.file_name() != Some(current_name) && path.is_dir() {
            let _ = std::fs::remove_dir_all(&path);
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data_source::test_support::env_lock;

    #[test]
    fn should_extract_tokens_src() {
        assert!(should_extract(Path::new("packages/tokens/src/color.json")));
        assert!(should_extract(Path::new(
            "packages/tokens/schemas/token-file.json"
        )));
        assert!(should_extract(Path::new(
            "packages/tokens/schemas/token-types/color.json"
        )));
        assert!(should_extract(Path::new(
            "packages/tokens/naming-exceptions.json"
        )));
        assert!(should_extract(Path::new("packages/tokens/manifest.json")));
    }

    #[test]
    fn should_extract_cascade_tokens() {
        assert!(should_extract(Path::new(
            "packages/design-data/tokens/color-palette.tokens.json"
        )));
        assert!(should_extract(Path::new(
            "packages/design-data/tokens/layout.tokens.json"
        )));
        // Other design-data paths are NOT extracted.
        assert!(!should_extract(Path::new("packages/design-data/README.md")));
        assert!(!should_extract(Path::new(
            "packages/design-data/package.json"
        )));
    }

    #[test]
    fn should_extract_spec_catalog_dirs() {
        assert!(should_extract(Path::new(
            "packages/design-data/mode-sets/color-scheme.json"
        )));
        assert!(should_extract(Path::new(
            "packages/design-data/components/button.json"
        )));
        assert!(should_extract(Path::new(
            "packages/design-data/fields/variant.json"
        )));
    }

    #[test]
    fn should_not_extract_other_spec_dirs() {
        assert!(!should_extract(Path::new(
            "packages/design-data-spec/schemas/token.schema.json"
        )));
        assert!(!should_extract(Path::new(
            "packages/design-data-spec/rules/rules.yaml"
        )));
        assert!(!should_extract(Path::new(
            "packages/component-schemas/index.js"
        )));
        assert!(!should_extract(Path::new("sdk/cli/src/main.rs")));
        assert!(!should_extract(Path::new("README.md")));
    }

    #[test]
    fn npm_source_returns_not_yet_supported() {
        let _guard = env_lock();
        let tmp = tempfile::TempDir::new().unwrap();
        std::env::set_var("DESIGN_DATA_CACHE_DIR", tmp.path());
        let source = SourceConfig::Npm {
            package: None,
            version: "14.11.0".into(),
        };
        let err = ensure_cached(&source, None).unwrap_err();
        std::env::remove_var("DESIGN_DATA_CACHE_DIR");
        assert!(matches!(
            err,
            FetchError::NotYetSupported {
                source_type: "npm",
                ..
            }
        ));
    }

    #[test]
    fn git_source_returns_not_yet_supported() {
        let _guard = env_lock();
        let tmp = tempfile::TempDir::new().unwrap();
        std::env::set_var("DESIGN_DATA_CACHE_DIR", tmp.path());
        let source = SourceConfig::Git {
            url: "https://github.com/adobe/spectrum-design-data.git".into(),
            git_ref: "main".into(),
        };
        let err = ensure_cached(&source, None).unwrap_err();
        std::env::remove_var("DESIGN_DATA_CACHE_DIR");
        assert!(matches!(
            err,
            FetchError::NotYetSupported {
                source_type: "git",
                ..
            }
        ));
    }

    // Integration test — requires network; skipped in offline/CI environments.
    // Run with: cargo test -p design-data-core fetch_github_downloads -- --ignored
    #[test]
    #[ignore = "requires network access"]
    fn fetch_github_downloads_and_caches() {
        let _guard = env_lock();
        let tmp = tempfile::TempDir::new().unwrap();
        std::env::set_var("DESIGN_DATA_CACHE_DIR", tmp.path());

        let source = SourceConfig::Github {
            repo: "adobe/spectrum-design-data".into(),
            tag: "@adobe/spectrum-tokens@14.11.0".into(),
        };

        // First call — downloads.
        let root = ensure_cached(&source, None).expect("first fetch failed");
        assert!(
            root.join("packages/tokens/src").is_dir(),
            "tokens/src missing"
        );
        assert!(
            root.join("packages/tokens/schemas/token-types").is_dir(),
            "schemas/token-types missing"
        );
        assert!(
            root.join("packages/design-data/components").is_dir(),
            "components missing"
        );
        assert!(root.join(".complete").is_file(), "sentinel missing");

        // Second call — cache hit, sentinel still present.
        let root2 = ensure_cached(&source, None).expect("cache hit failed");
        assert_eq!(root, root2);
        std::env::remove_var("DESIGN_DATA_CACHE_DIR");
    }
}
