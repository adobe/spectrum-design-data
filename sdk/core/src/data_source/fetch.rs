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
//!   packages/design-data/mode-sets/          ← github only
//!   packages/design-data/components/
//!   packages/design-data/fields/
//!   .complete                                ← written last; signals complete extraction
//! ```
//!
//! The `<key>` for a github source is `github/<repo>@<kind>-<ref>`, where `<kind>`
//! is `tag`/`branch`/`sha` — so a tag and a same-named branch never collide.
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
//! | `github` | ✅ implemented  | Full (tokens + spec catalog); pins by tag/branch/sha |
//! | `npm`    | 🚧 stub         | Published npm packages are dataset-incomplete (no schemas) — use github |
//! | `git`    | 🚧 stub         | Arbitrary git hosts unsupported — use github tag/branch/sha |
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
    /// A `github` source did not pin exactly one of `tag` / `branch` / `sha`.
    #[error("github source must pin exactly one of `tag`, `branch`, or `sha` ({0})")]
    GithubRef(&'static str),
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
    /// The downloaded archive body exceeded [`MAX_DOWNLOAD_BYTES`].
    #[error(
        "downloaded archive from {url} exceeds the {} MB size limit — refusing to buffer it \
         in memory",
        MAX_DOWNLOAD_BYTES / 1_000_000
    )]
    DownloadTooLarge { url: String },
    /// The archive, once decompressed, exceeded [`MAX_EXTRACTED_BYTES`] or
    /// [`MAX_EXTRACTED_ENTRIES`] — a likely decompression-bomb / runaway
    /// remote repo, rather than a legitimate platform-manifest tree.
    #[error(
        "archive from {url} exceeds extraction limits ({} MB / {} entries) — refusing to \
         extract further",
        MAX_EXTRACTED_BYTES / 1_000_000,
        MAX_EXTRACTED_ENTRIES
    )]
    ExtractTooLarge { url: String },
}

/// Hard cap on a downloaded archive's response body, before it's buffered in
/// memory. A legitimate Spectrum release tarball or platform-manifest repo
/// archive is single-digit MB; this is a generous but finite ceiling against a
/// misconfigured or hostile `[platforms.<id>]` remote entry (`fetch_platform_repo`
/// extracts a whole, filter-less tree, unlike the foundation fetch path's
/// fixed `packages/**` filter).
const MAX_DOWNLOAD_BYTES: u64 = 200 * 1_000_000; // 200 MB

/// Hard cap on total bytes written during tarball extraction — guards against
/// a gzip decompression bomb (a small download expanding to a huge tree).
const MAX_EXTRACTED_BYTES: u64 = 500 * 1_000_000; // 500 MB

/// Hard cap on the number of extracted entries — guards against a tarball
/// with an enormous number of tiny files exhausting inodes/handles even while
/// staying under the byte cap.
const MAX_EXTRACTED_ENTRIES: usize = 50_000;

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
        SourceConfig::Github {
            repo,
            tag,
            branch,
            sha,
        } => {
            let git_ref =
                GithubRef::from_fields(tag.as_deref(), branch.as_deref(), sha.as_deref())?;
            fetch_github(&base, repo, &git_ref)
        }
        SourceConfig::Npm { .. } => Err(FetchError::NotYetSupported {
            source_type: "npm",
            reason: "the published npm packages are dataset-incomplete for the cascade \
                     (@adobe/spectrum-tokens ships tokens only; @adobe/spectrum-design-data \
                     omits packages/tokens/schemas). Use source.type = \"github\", which \
                     serves the full dataset (incl. schemas) over plain HTTPS with no Node \
                     required, and pins by tag/branch/sha.",
        }),
        SourceConfig::Git { .. } => Err(FetchError::NotYetSupported {
            source_type: "git",
            reason: "arbitrary git hosts are not supported. Use source.type = \"github\" \
                     and pin by tag, branch, or sha — it covers branch/commit tracking of \
                     the foundation repo over plain HTTPS.",
        }),
        // `Path` is handled by the resolver directly and never reaches fetch.
        SourceConfig::Path { .. } => unreachable!("path source does not go through fetch"),
    }
}

/// Ensure a **platform-manifest** repo is fetched/cached (h890.27.5), and return
/// its root path. Unlike [`ensure_cached`] (foundation datasets, filtered to
/// `packages/**`), this extracts the entire tree — see [`fetch_platform_repo`].
///
/// `cache_dir_override` comes from `[cache].dir` in `.design-data.toml`; pass
/// `None` to fall back to the env var / OS cache dir.
pub fn ensure_cached_platform_repo(
    repo: &str,
    tag: Option<&str>,
    branch: Option<&str>,
    sha: Option<&str>,
    cache_dir_override: Option<&Path>,
) -> Result<PathBuf, FetchError> {
    let base = resolve_cache_base(cache_dir_override)?;
    let git_ref = GithubRef::from_fields(tag, branch, sha)?;
    fetch_platform_repo(&base, repo, &git_ref)
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

/// A resolved GitHub ref to fetch: exactly one of tag/branch/sha.
///
/// GitHub serves an archive tarball for any ref, not just release tags, so a
/// single code path covers immutable pins (`tag`, `sha`) and mutable branch
/// tracking. `branch` refs are refetched on every run (see [`fetch_github`]).
enum GithubRef {
    Tag(String),
    Branch(String),
    Sha(String),
}

impl GithubRef {
    /// Validate that exactly one of tag/branch/sha is set.
    fn from_fields(
        tag: Option<&str>,
        branch: Option<&str>,
        sha: Option<&str>,
    ) -> Result<Self, FetchError> {
        match (tag, branch, sha) {
            (Some(t), None, None) => Ok(Self::Tag(t.to_string())),
            (None, Some(b), None) => Ok(Self::Branch(b.to_string())),
            (None, None, Some(s)) => Ok(Self::Sha(s.to_string())),
            (None, None, None) => Err(FetchError::GithubRef("none set")),
            _ => Err(FetchError::GithubRef("more than one set")),
        }
    }

    /// The archive path segment for `https://github.com/{repo}/archive/{...}.tar.gz`.
    fn archive_path(&self) -> String {
        match self {
            Self::Tag(t) => format!("refs/tags/{t}"),
            Self::Branch(b) => format!("refs/heads/{b}"),
            Self::Sha(s) => s.clone(),
        }
    }

    /// Cache-key segment, kind-prefixed so a tag and same-named branch don't collide.
    fn cache_segment(&self) -> String {
        let (kind, val) = match self {
            Self::Tag(t) => ("tag", t),
            Self::Branch(b) => ("branch", b),
            Self::Sha(s) => ("sha", s),
        };
        format!("{kind}-{}", val.replace(['/', '@'], "-"))
    }

    /// A branch is a mutable ref: its tip moves, so the cache must not pin it.
    fn is_mutable(&self) -> bool {
        matches!(self, Self::Branch(_))
    }
}

/// Fetch/cache a **platform-manifest** repo (h890.27.5) — an incubating or
/// already-ejected `[platforms.<id>]` remote, e.g. a future
/// `adobe/react-spectrum-design-data`. Unlike [`fetch_github`] (which only
/// extracts the fixed `packages/tokens/**` foundation-dataset shape), this
/// extracts the **entire** tree, since a platform-manifest repo has no fixed
/// layout — it may be just `manifest.json` + `extensions/**` at the tree root,
/// exactly as `design-data platform eject` would produce.
///
/// Cached under a distinct `platform/` key namespace (vs. `github/` for
/// foundation sources) so a platform-manifest fetch and a foundation fetch of
/// the *same* repo (unlikely, but possible during incubation) never collide.
fn fetch_platform_repo(
    base: &Path,
    repo: &str,
    git_ref: &GithubRef,
) -> Result<PathBuf, FetchError> {
    let safe_repo = repo.replace('/', "-");
    let key = format!("platform/{safe_repo}@{}", git_ref.cache_segment());
    let root = base.join(&key);
    let sentinel = root.join(".complete");

    if sentinel.exists() && !git_ref.is_mutable() {
        return Ok(root);
    }

    let url = format!(
        "https://github.com/{repo}/archive/{}.tar.gz",
        git_ref.archive_path()
    );

    let bytes = download_bytes(&url)?;
    extract_github_tarball(&bytes, &url, &root, |_rel: &Path| true)?;
    evict_stale_versions(&root, &base.join("platform"), &format!("{safe_repo}@"));

    Ok(root)
}

fn fetch_github(base: &Path, repo: &str, git_ref: &GithubRef) -> Result<PathBuf, FetchError> {
    // Sanitize repo for use as a filesystem path component. Keep an `@` separator
    // between the repo slug and the kind-prefixed ref segment so that distinct
    // refs (and repos) never collide after sanitization.
    let safe_repo = repo.replace('/', "-");
    let key = format!("github/{safe_repo}@{}", git_ref.cache_segment());
    let root = base.join(&key);
    let sentinel = root.join(".complete");

    // ponytail: immutable refs (tag/sha) served from cache; branch tips move, so
    // always refetch (~2MB). Upgrade path: ETag/If-None-Match conditional GET if
    // the per-run refetch cost ever matters.
    if sentinel.exists() && !git_ref.is_mutable() {
        return Ok(root);
    }

    let url = format!(
        "https://github.com/{repo}/archive/{}.tar.gz",
        git_ref.archive_path()
    );

    let bytes = download_bytes(&url)?;
    extract_github_tarball(&bytes, &url, &root, should_extract)?;
    // Entries are flat under `github/` as `{safe_repo}@{segment}`, so scan that dir
    // and prune only *this repo's* other refs — the `{safe_repo}@` prefix keeps a
    // fetch of one repo from evicting another repo's cache.
    evict_stale_versions(&root, &base.join("github"), &format!("{safe_repo}@"));

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
/// is well within typical memory budgets. [`MAX_DOWNLOAD_BYTES`] still bounds it:
/// an advertised `Content-Length` over the cap is rejected up front, and the
/// body is otherwise read chunk-by-chunk so a response that lies about its
/// length (or omits the header) can't buffer past the cap either.
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
        if resp
            .content_length()
            .is_some_and(|len| len > MAX_DOWNLOAD_BYTES)
        {
            return Err(FetchError::DownloadTooLarge {
                url: url.to_string(),
            });
        }

        let mut body = resp;
        let mut buf = Vec::new();
        while let Some(chunk) = body.chunk().await.map_err(|e| FetchError::Network {
            url: url.to_string(),
            source: e,
        })? {
            buf.extend_from_slice(&chunk);
            if buf.len() as u64 > MAX_DOWNLOAD_BYTES {
                return Err(FetchError::DownloadTooLarge {
                    url: url.to_string(),
                });
            }
        }
        Ok(buf)
    })
}

/// Extract a GitHub release tarball (`.tar.gz`) into `dest`, keeping only entries
/// for which `filter` returns `true`.
///
/// GitHub tarballs have a single top-level directory whose name is derived from
/// the repo name and tag (e.g. `spectrum-design-data--adobe-spectrum-tokens-14.11.0/`).
/// This function strips that prefix dynamically by reading the first path component.
/// The foundation-dataset fetch path ([`fetch_github`]) passes [`should_extract`]
/// (only `packages/tokens/**` etc.); a platform-manifest repo fetch
/// ([`fetch_platform_repo`]) passes `|_| true` since an incubating/ejected platform
/// repo has no fixed monorepo shape — it may be just `manifest.json` + `extensions/`
/// at the tree root.
///
/// Uses the same atomic tmp-rename + `.complete`-sentinel pattern as
/// [`super::embedded::materialize_to`].
fn extract_github_tarball(
    bytes: &[u8],
    url: &str,
    dest: &Path,
    filter: impl Fn(&Path) -> bool,
) -> Result<(), FetchError> {
    // Ensure the parent directory exists before creating the tmp dir.
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(FetchError::Io)?;
    }

    let tmp = dest.with_extension("tmp");
    if tmp.exists() {
        std::fs::remove_dir_all(&tmp).map_err(FetchError::Io)?;
    }

    extract_tarball_inner(bytes, url, &tmp, filter)?;

    if dest.exists() {
        std::fs::remove_dir_all(dest).map_err(FetchError::Io)?;
    }
    std::fs::rename(&tmp, dest).map_err(FetchError::Io)?;
    std::fs::write(dest.join(".complete"), "").map_err(FetchError::Io)?;

    Ok(())
}

fn extract_tarball_inner(
    bytes: &[u8],
    url: &str,
    dest: &Path,
    filter: impl Fn(&Path) -> bool,
) -> Result<(), FetchError> {
    extract_tarball_inner_with_limits(
        bytes,
        url,
        dest,
        filter,
        MAX_EXTRACTED_BYTES,
        MAX_EXTRACTED_ENTRIES,
    )
}

/// Same as [`extract_tarball_inner`] but with injectable limits, so tests can
/// exercise the `ExtractTooLarge` path with a small, fast fixture instead of
/// needing to actually build a multi-hundred-MB tarball.
fn extract_tarball_inner_with_limits(
    bytes: &[u8],
    url: &str,
    dest: &Path,
    filter: impl Fn(&Path) -> bool,
    max_extracted_bytes: u64,
    max_extracted_entries: usize,
) -> Result<(), FetchError> {
    use flate2::read::GzDecoder;
    use tar::Archive;

    let cursor = io::Cursor::new(bytes);
    let gz = GzDecoder::new(cursor);
    let mut archive = Archive::new(gz);

    // Determine the top-level prefix by peeking at the first entry.
    // We'll strip it from every path before writing.
    let mut prefix: Option<String> = None;
    // Runs against max_extracted_bytes/max_extracted_entries to guard against a
    // gzip decompression bomb or a tarball with an enormous entry count —
    // most relevant to fetch_platform_repo's filter-less `|_| true` extraction
    // of an arbitrary `[platforms.<id>]` remote repo.
    let mut extracted_bytes: u64 = 0;
    let mut extracted_entries: usize = 0;

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
        if !filter(&rel) {
            continue;
        }

        extracted_entries += 1;
        extracted_bytes = extracted_bytes.saturating_add(entry.header().size().unwrap_or(0));
        if extracted_entries > max_extracted_entries || extracted_bytes > max_extracted_bytes {
            return Err(FetchError::ExtractTooLarge {
                url: url.to_string(),
            });
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
        (Some("packages"), Some("design-data-spec")) => {
            // schemas/ — Layer-1 spec schemas (manifest.schema.json et al.) used to
            // validate a fetched foundation. Other subdirs (docs, audits, scripts…) are not needed.
            let third = components
                .next()
                .map(|c| c.as_os_str().to_string_lossy().into_owned());
            matches!(third.as_deref(), Some("schemas"))
        }
        _ => false,
    }
}

// ---------------------------------------------------------------------------
// Stale-version eviction
// ---------------------------------------------------------------------------

/// Remove sibling version directories under `parent_dir` whose name starts with
/// `prefix` but differs from `current`, keeping the cache footprint bounded across
/// version upgrades. The `prefix` scopes eviction to one logical source (e.g. one
/// github repo) so pruning one repo's stale refs never touches another repo's cache.
/// Best-effort: errors are silently ignored.
fn evict_stale_versions(current: &Path, parent_dir: &Path, prefix: &str) {
    if !parent_dir.is_dir() {
        return;
    }
    let current_name = match current.file_name().and_then(|n| n.to_str()) {
        Some(n) => n,
        None => return,
    };
    let Ok(entries) = std::fs::read_dir(parent_dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if name.starts_with(prefix) && name != current_name && path.is_dir() {
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
    fn should_extract_spec_schemas() {
        assert!(should_extract(Path::new(
            "packages/design-data-spec/schemas/manifest.schema.json"
        )));
        assert!(should_extract(Path::new(
            "packages/design-data-spec/schemas/token.schema.json"
        )));
        assert!(should_extract(Path::new(
            "packages/design-data-spec/schemas/value-types/color.schema.json"
        )));
        // Other design-data-spec dirs are NOT extracted.
        assert!(!should_extract(Path::new(
            "packages/design-data-spec/rules/rules.yaml"
        )));
        assert!(!should_extract(Path::new(
            "packages/design-data-spec/docs/README.md"
        )));
        assert!(!should_extract(Path::new(
            "packages/design-data-spec/package.json"
        )));
    }

    #[test]
    fn should_not_extract_other_spec_dirs() {
        assert!(!should_extract(Path::new(
            "packages/component-schemas/index.js"
        )));
        assert!(!should_extract(Path::new("sdk/cli/src/main.rs")));
        assert!(!should_extract(Path::new("README.md")));
    }

    #[test]
    fn github_ref_requires_exactly_one() {
        // Exactly one → Ok, with the right archive path + kind-prefixed cache segment.
        let t = GithubRef::from_fields(Some("@adobe/spectrum-tokens@15.0.0"), None, None).unwrap();
        assert_eq!(t.archive_path(), "refs/tags/@adobe/spectrum-tokens@15.0.0");
        assert_eq!(t.cache_segment(), "tag--adobe-spectrum-tokens-15.0.0");
        assert!(!t.is_mutable());

        let b = GithubRef::from_fields(None, Some("main"), None).unwrap();
        assert_eq!(b.archive_path(), "refs/heads/main");
        assert_eq!(b.cache_segment(), "branch-main");
        assert!(b.is_mutable());

        let s = GithubRef::from_fields(None, None, Some("abc123")).unwrap();
        assert_eq!(s.archive_path(), "abc123");
        assert_eq!(s.cache_segment(), "sha-abc123");
        assert!(!s.is_mutable());

        // A tag and a same-named branch must not collide in the cache.
        let tag_x = GithubRef::from_fields(Some("x"), None, None).unwrap();
        let branch_x = GithubRef::from_fields(None, Some("x"), None).unwrap();
        assert_ne!(tag_x.cache_segment(), branch_x.cache_segment());

        // Zero or more-than-one → error.
        assert!(matches!(
            GithubRef::from_fields(None, None, None),
            Err(FetchError::GithubRef(_))
        ));
        assert!(matches!(
            GithubRef::from_fields(Some("t"), Some("b"), None),
            Err(FetchError::GithubRef(_))
        ));
    }

    #[test]
    fn evict_prunes_same_repo_other_refs_only() {
        let tmp = tempfile::TempDir::new().unwrap();
        let gh = tmp.path().join("github");
        std::fs::create_dir_all(&gh).unwrap();
        // Flat entries: two refs of repo A, one ref of repo B.
        let current = gh.join("adobe-spectrum-design-data@tag-new");
        let stale = gh.join("adobe-spectrum-design-data@tag-old");
        let other = gh.join("adobe-spectrum-tokens@tag-x");
        for d in [&current, &stale, &other] {
            std::fs::create_dir_all(d).unwrap();
        }

        evict_stale_versions(&current, &gh, "adobe-spectrum-design-data@");

        assert!(current.is_dir(), "current ref must be kept");
        assert!(!stale.is_dir(), "same-repo stale ref must be pruned");
        assert!(other.is_dir(), "another repo's cache must be untouched");
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

    /// Build an in-memory `.tar.gz` with `entry_count` tiny entries (each
    /// `content` bytes), all nested under a single top-level `prefix/` dir
    /// the way GitHub-generated release/source tarballs are shaped —
    /// [`extract_tarball_inner`] strips that prefix dynamically.
    fn make_test_tarball(prefix: &str, entry_count: usize, content: &[u8]) -> Vec<u8> {
        use flate2::write::GzEncoder;
        use flate2::Compression;
        use tar::{Builder, Header};

        let mut builder = Builder::new(GzEncoder::new(Vec::new(), Compression::fast()));
        for i in 0..entry_count {
            let mut header = Header::new_gnu();
            header.set_size(content.len() as u64);
            header.set_mode(0o644);
            header.set_cksum();
            builder
                .append_data(&mut header, format!("{prefix}/file-{i}.txt"), content)
                .unwrap();
        }
        builder.into_inner().unwrap().finish().unwrap()
    }

    #[test]
    fn extract_rejects_too_many_entries() {
        let bytes = make_test_tarball("repo-v1", 5, b"hi");
        let dest = tempfile::TempDir::new().unwrap();

        let err = extract_tarball_inner_with_limits(
            &bytes,
            "https://example.test/archive.tar.gz",
            &dest.path().join("out"),
            |_rel: &Path| true,
            u64::MAX,
            3, // cap below the 5 entries in the fixture
        )
        .unwrap_err();

        assert!(
            matches!(err, FetchError::ExtractTooLarge { .. }),
            "expected ExtractTooLarge, got {err:?}"
        );
    }

    #[test]
    fn extract_rejects_too_many_bytes() {
        // 5 entries of 100 bytes each declared size, but a 200-byte cap.
        let bytes = make_test_tarball("repo-v1", 5, &[0u8; 100]);
        let dest = tempfile::TempDir::new().unwrap();

        let err = extract_tarball_inner_with_limits(
            &bytes,
            "https://example.test/archive.tar.gz",
            &dest.path().join("out"),
            |_rel: &Path| true,
            200,
            usize::MAX,
        )
        .unwrap_err();

        assert!(
            matches!(err, FetchError::ExtractTooLarge { .. }),
            "expected ExtractTooLarge, got {err:?}"
        );
    }

    #[test]
    fn extract_succeeds_within_limits() {
        let bytes = make_test_tarball("repo-v1", 3, b"hello");
        let dest = tempfile::TempDir::new().unwrap();
        let out = dest.path().join("out");

        extract_tarball_inner_with_limits(
            &bytes,
            "https://example.test/archive.tar.gz",
            &out,
            |_rel: &Path| true,
            u64::MAX,
            usize::MAX,
        )
        .unwrap();

        assert!(out.join("file-0.txt").is_file());
        assert!(out.join("file-2.txt").is_file());
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
            tag: Some("@adobe/spectrum-tokens@14.11.0".into()),
            branch: None,
            sha: None,
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
