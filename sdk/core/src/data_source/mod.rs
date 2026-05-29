// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Data source resolution for the design-data CLI.
//!
//! Determines where token data, schemas, and spec catalog files live at runtime.
//! Resolution precedence (first match wins per path field):
//!
//! 1. **Explicit CLI flags / positional args** — passed via [`CliPathOverrides`].
//!    `Some` values are used directly; `None` falls through to the next tier.
//! 2. **`.design-data.toml` config file** — discovered by walking up from `cwd`.
//!    Only the `path` source type is active in this release; `npm`/`github`/`git`
//!    return [`DataSourceError::NotYetImplemented`] until `#1050` lands.
//! 3. **CWD-relative probing** — tries `packages/tokens/…` and
//!    `packages/design-data-spec/…` relative to `cwd`.  Preserves the original
//!    in-monorepo behaviour when run from inside a checkout.
//! 4. **Embedded snapshot** — baked into the binary at compile time via
//!    `include_dir!`; materialized to the OS cache dir on first use.
//!    This is the zero-config offline default for designers running outside the repo.
//!
//! [`resolve`] returns a [`ResolvedData`] with concrete [`PathBuf`]s for every
//! location the CLI needs.

pub(crate) mod embedded;
#[cfg(feature = "fetch")]
pub(crate) mod fetch;

use std::path::{Path, PathBuf};

use serde::Deserialize;
use thiserror::Error;

// ---------------------------------------------------------------------------
// Config file structs — `.design-data.toml`
// ---------------------------------------------------------------------------

/// Top-level structure of an optional `.design-data.toml` project config.
///
/// Absent file → fall through to CWD-relative probing (tier 3).
#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DesignDataConfig {
    /// Where to obtain design data.
    pub source: Option<SourceConfig>,
    /// Cache location overrides.
    pub cache: Option<CacheConfig>,
}

/// Describes where to obtain or locate the design data.
///
/// Serialised as `type = "npm"` / `"github"` / `"git"` / `"path"` in the TOML.
#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum SourceConfig {
    /// A local filesystem path; the root of a repo that follows the standard
    /// monorepo layout (`packages/tokens/`, `packages/design-data-spec/`, …).
    ///
    /// This is the only source type active in this release.  The `root` is
    /// resolved relative to the directory containing `.design-data.toml`.
    Path {
        /// Path to the local design-data repo root (absolute, or relative to
        /// the directory containing `.design-data.toml`).
        root: PathBuf,
    },
    /// `@adobe/spectrum-tokens` (and matching `design-data-spec`) from the npm
    /// registry.  **Not yet implemented — planned for `#1050`.**
    Npm {
        /// Package name (default: `@adobe/spectrum-tokens`).
        package: Option<String>,
        /// Exact version to resolve.
        version: String,
    },
    /// A GitHub release tarball.  **Not yet implemented — planned for `#1050`.**
    Github {
        /// `owner/repo` slug, e.g. `adobe/spectrum-design-data`.
        repo: String,
        /// Release tag to download.
        tag: String,
    },
    /// A git repository (clone / fetch at a ref).
    /// **Not yet implemented — planned for `#1050`.**
    Git {
        /// Repository URL.
        url: String,
        /// Branch, tag, or commit SHA.
        #[serde(rename = "ref")]
        git_ref: String,
    },
}

/// Cache configuration.  Defaults to `dirs::cache_dir()/design-data`.
#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CacheConfig {
    /// Override the cache directory path.
    pub dir: Option<PathBuf>,
}

// ---------------------------------------------------------------------------
// Resolver input / output types
// ---------------------------------------------------------------------------

/// Path overrides coming from explicit CLI flags or positional args (tier 1).
///
/// A `None` field means "not specified by the caller; fall through to tiers 2–N".
#[derive(Debug, Default)]
pub struct CliPathOverrides {
    /// Token dataset root (the primary positional argument, default `.`).
    pub tokens_root: Option<PathBuf>,
    /// `--schema-path` / `DESIGN_DATA_SCHEMA_ROOT` env var.
    pub schema_root: Option<PathBuf>,
    /// `--mode-sets-path`.
    pub mode_sets: Option<PathBuf>,
    /// `--components-path`.
    pub components: Option<PathBuf>,
    /// `--fields-path`.
    pub fields: Option<PathBuf>,
    /// Naming-exceptions file (`--exceptions-path`).
    pub exceptions: Option<PathBuf>,
}

/// Records how the paths were determined so callers and diagnostics can report it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Provenance {
    /// CWD-relative probing — original in-monorepo behaviour.
    InRepo,
    /// Resolved from a `.design-data.toml` `[source]` block.
    Config {
        /// Absolute path to the config file that was found.
        config_path: PathBuf,
    },
    /// Fetched from a remote source and cached on disk (`#1050`).
    Cache {
        /// Directory where the cached data lives.
        cache_dir: PathBuf,
    },
    /// Materialized from the binary's embedded snapshot (`#1049`).
    Embedded {
        /// Semver string of the baked-in `@adobe/spectrum-tokens` release.
        version: &'static str,
    },
}

/// All resolved paths that the CLI needs to operate on a dataset.
///
/// Returned by [`resolve`].  Every field that is `Some` is guaranteed to point
/// to an existing file or directory at the time `resolve` returned.
/// `schemas_root` is always present (with a sensible default) so callers may
/// attempt to load schemas and gracefully handle failure.
#[derive(Debug)]
pub struct ResolvedData {
    /// Root directory of the token JSON files (the "dataset").
    pub tokens_root: PathBuf,
    /// Directory containing JSON schema files (`token-types/`, `token-file.json`, …).
    pub schemas_root: PathBuf,
    /// Directory containing mode-set declaration JSONs.
    pub mode_sets: Option<PathBuf>,
    /// Directory containing component declaration JSONs.
    pub components: Option<PathBuf>,
    /// Directory containing taxonomy field JSONs.
    pub fields: Option<PathBuf>,
    /// `naming-exceptions.json` path.
    pub exceptions: Option<PathBuf>,
    /// Build `manifest.json` path (the token-source file list, not the platform manifest).
    /// Populated here but consumed by #1049 (embedded snapshot provenance tracking).
    #[allow(dead_code)]
    pub manifest: Option<PathBuf>,
    /// How these paths were determined.
    pub provenance: Provenance,
}

/// Errors that can occur during data-source resolution.
#[derive(Debug, Error)]
pub enum DataSourceError {
    /// A `[source]` type that requires network/fetch is not yet wired up.
    #[error("data source type '{source_type}' is not yet supported (planned for issue #1050)")]
    NotYetImplemented {
        /// The source type string from the config, e.g. `"npm"`.
        source_type: String,
    },
    /// The `.design-data.toml` file was found but could not be read.
    #[error("`.design-data.toml` found at {path} but could not be read: {source}")]
    ConfigRead {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },
    /// The `.design-data.toml` file contains invalid TOML or unexpected fields.
    #[error("`.design-data.toml` at {path} is invalid: {source}")]
    ConfigParse {
        path: PathBuf,
        #[source]
        source: toml::de::Error,
    },
    /// `source.type = "path"` but the `root` directory does not exist.
    #[error(
        "source.root '{root}' in `.design-data.toml` does not exist or is not a directory"
    )]
    PathNotFound {
        /// The resolved (possibly absolute) path that was probed.
        root: PathBuf,
    },
    /// A remote fetch (github / npm / git) failed.
    #[cfg(feature = "fetch")]
    #[error("fetch failed: {0}")]
    Fetch(#[from] fetch::FetchError),
}

// ---------------------------------------------------------------------------
// Public resolver
// ---------------------------------------------------------------------------

/// Resolve all data paths for a CLI invocation.
///
/// `cwd` is the working directory from which ancestor-walk and CWD-relative
/// probing are performed.  Pass `std::env::current_dir()?` at call sites.
///
/// `overrides` carries any explicit CLI flags.  A `None` field means the CLI
/// did not specify it; the resolver will fill it in from the config file or
/// CWD probing.
///
/// # Errors
///
/// Returns [`DataSourceError`] when:
/// - A `.design-data.toml` exists but cannot be read or parsed.
/// - `source.type = "path"` and `root` does not exist.
/// - `source.type` is `npm`, `github`, or `git` (not yet implemented).
pub fn resolve(
    cwd: &Path,
    overrides: &CliPathOverrides,
) -> Result<ResolvedData, DataSourceError> {
    // Tier 1 is handled per-field inside each helper (overrides win always).

    // Tier 2: look for `.design-data.toml` walking up from cwd.
    if let Some((config_path, config)) = find_config(cwd)? {
        if let Some(source) = &config.source {
            return match source {
                SourceConfig::Path { root } => {
                    // Resolve root relative to the config file's directory.
                    let config_dir = config_path.parent().unwrap_or(cwd);
                    let abs_root = if root.is_absolute() {
                        root.clone()
                    } else {
                        config_dir.join(root)
                    };
                    if !abs_root.is_dir() {
                        return Err(DataSourceError::PathNotFound { root: abs_root });
                    }
                    // Canonicalize to resolve `..` components before passing to from_root.
                    let canonical = abs_root.canonicalize().unwrap_or(abs_root);
                    Ok(from_root(&canonical, overrides, Provenance::Config { config_path }))
                }
                SourceConfig::Npm { .. }
                | SourceConfig::Github { .. }
                | SourceConfig::Git { .. } => {
                    fetch_source(source, config.cache.as_ref().and_then(|c| c.dir.as_deref()), overrides)
                }
            };
        }
        // Config file present but no [source] block → fall through to probing.
    }

    // Tier 3: CWD-relative probing — original in-monorepo behaviour.
    // If we are inside a monorepo checkout probe will find everything; return immediately.
    if is_in_repo(cwd) {
        return Ok(probe_cwd(cwd, overrides));
    }

    // Tier 4: Embedded snapshot — materialize to the OS cache dir on first use.
    // Non-fatal: if materialization fails (no cache dir, IO error, etc.) we fall
    // through so existing users outside a repo aren't broken.
    match embedded::materialize() {
        Ok(root) => {
            return Ok(from_root(
                &root,
                overrides,
                Provenance::Embedded {
                    version: embedded::EMBEDDED_TOKENS_VERSION,
                },
            ));
        }
        Err(e) => {
            // Only surface the warning under debug logging — materialisation
            // failures are non-fatal and the message would be noisy in scripts.
            if std::env::var("DESIGN_DATA_LOG").as_deref() == Ok("debug") {
                eprintln!(
                    "design-data: warning: embedded snapshot materialization failed ({e}); \
                     falling back to in-repo probing"
                );
            }
        }
    }

    // Tier 3 fallback: CWD probing (will likely find nothing outside a repo, but
    // callers handle None fields gracefully).
    Ok(probe_cwd(cwd, overrides))
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/// Returns `true` when `cwd` is inside a monorepo checkout.
///
/// Walks up the ancestor chain from `cwd` looking for a directory that contains
/// `packages/tokens/schemas/token-types`.  This works regardless of how deeply
/// nested `cwd` is inside the repo (repo root, `sdk/`, `packages/tokens/`, etc.).
///
/// When this returns `true` the resolver skips the embedded tier and uses
/// CWD-relative probing instead, preserving the original in-monorepo workflow.
fn is_in_repo(cwd: &Path) -> bool {
    cwd.ancestors()
        .any(|dir| dir.join("packages/tokens/schemas/token-types").is_dir())
}

/// Walk ancestors of `start` looking for `.design-data.toml`.
///
/// Returns `Ok(None)` when no file is found — that is not an error.
fn find_config(start: &Path) -> Result<Option<(PathBuf, DesignDataConfig)>, DataSourceError> {
    for dir in start.ancestors() {
        let candidate = dir.join(".design-data.toml");
        if candidate.is_file() {
            let text = std::fs::read_to_string(&candidate).map_err(|e| DataSourceError::ConfigRead {
                path: candidate.clone(),
                source: e,
            })?;
            let config: DesignDataConfig =
                toml::from_str(&text).map_err(|e| DataSourceError::ConfigParse {
                    path: candidate.clone(),
                    source: e,
                })?;
            return Ok(Some((candidate, config)));
        }
    }
    Ok(None)
}

/// Build [`ResolvedData`] from a known monorepo `root` directory (tier 2 path source).
///
/// Tier 1 overrides still win for any individually-set CLI flags.
fn from_root(root: &Path, overrides: &CliPathOverrides, provenance: Provenance) -> ResolvedData {
    let tokens_root = overrides
        .tokens_root
        .clone()
        .unwrap_or_else(|| root.to_path_buf());

    let schemas_root = resolve_schema_root(overrides, || root.join("packages/tokens/schemas"));

    let mode_sets = overrides.mode_sets.clone().or_else(|| {
        let c = root.join("packages/design-data-spec/mode-sets");
        c.is_dir().then_some(c)
    });

    let components = overrides.components.clone().or_else(|| {
        let c = root.join("packages/design-data-spec/components");
        c.is_dir().then_some(c)
    });

    let fields = overrides.fields.clone().or_else(|| {
        let c = root.join("packages/design-data-spec/fields");
        c.is_dir().then_some(c)
    });

    let exceptions = overrides.exceptions.clone().or_else(|| {
        let c = root.join("packages/tokens/naming-exceptions.json");
        c.is_file().then_some(c)
    });

    let manifest = {
        let c = root.join("packages/tokens/manifest.json");
        c.is_file().then_some(c)
    };

    ResolvedData {
        tokens_root,
        schemas_root,
        mode_sets,
        components,
        fields,
        exceptions,
        manifest,
        provenance,
    }
}

/// Tier 3: replicate the original `default_*_path()` probing logic verbatim.
///
/// Tries `packages/…` (run from repo root) and `../packages/…` (run from one
/// level below the root, e.g. `sdk/`).  Returns `None` for any path not found —
/// preserving the pre-resolver behaviour exactly for every existing working directory.
///
/// NOTE: `is_in_repo` uses an ancestor-walk so it returns `true` from ANY
/// subdirectory of the repo.  This function intentionally keeps the original
/// two-candidate probing so that callers running from deeply-nested dirs (e.g.
/// `packages/tokens/`) get `None` for spec dirs they can't reach — the same
/// result they got before the resolver was introduced.
fn probe_cwd(cwd: &Path, overrides: &CliPathOverrides) -> ResolvedData {
    // tokens_root — original default was PathBuf::from(".") i.e. CWD.
    let tokens_root = overrides
        .tokens_root
        .clone()
        .unwrap_or_else(|| cwd.to_path_buf());

    // schemas_root
    let schemas_root = resolve_schema_root(overrides, || {
        let candidates = [
            cwd.join("packages/tokens/schemas"),
            cwd.join("../packages/tokens/schemas"),
        ];
        candidates
            .into_iter()
            .find(|c| c.join("token-types").is_dir())
            .unwrap_or_else(|| cwd.join("packages/tokens/schemas"))
    });

    // mode_sets
    let mode_sets = overrides.mode_sets.clone().or_else(|| {
        let candidates = [
            cwd.join("packages/design-data-spec/mode-sets"),
            cwd.join("../packages/design-data-spec/mode-sets"),
        ];
        candidates.into_iter().find(|c| c.is_dir())
    });

    // components
    let components = overrides.components.clone().or_else(|| {
        let candidates = [
            cwd.join("packages/design-data-spec/components"),
            cwd.join("../packages/design-data-spec/components"),
        ];
        candidates.into_iter().find(|c| c.is_dir())
    });

    // fields
    let fields = overrides.fields.clone().or_else(|| {
        let candidates = [
            cwd.join("packages/design-data-spec/fields"),
            cwd.join("../packages/design-data-spec/fields"),
        ];
        candidates.into_iter().find(|c| c.is_dir())
    });

    // exceptions
    let exceptions = overrides.exceptions.clone().or_else(|| {
        let candidates = [
            cwd.join("packages/tokens/naming-exceptions.json"),
            cwd.join("../packages/tokens/naming-exceptions.json"),
        ];
        candidates.into_iter().find(|c| c.is_file())
    });

    // manifest (the build manifest.json file listing token sources)
    let manifest = {
        let candidates = [
            cwd.join("packages/tokens/manifest.json"),
            cwd.join("../packages/tokens/manifest.json"),
        ];
        candidates.into_iter().find(|c| c.is_file())
    };

    ResolvedData {
        tokens_root,
        schemas_root,
        mode_sets,
        components,
        fields,
        exceptions,
        manifest,
        provenance: Provenance::InRepo,
    }
}

/// Resolve the schema root: CLI override → `DESIGN_DATA_SCHEMA_ROOT` env → `fallback()`.
///
/// The env var is honoured at this level so it works regardless of which tier
/// resolved the other paths.
fn resolve_schema_root(overrides: &CliPathOverrides, fallback: impl FnOnce() -> PathBuf) -> PathBuf {
    overrides
        .schema_root
        .clone()
        .or_else(|| std::env::var("DESIGN_DATA_SCHEMA_ROOT").ok().map(PathBuf::from))
        .unwrap_or_else(fallback)
}

/// Dispatch a remote-fetch source through the fetch module (tier 2, config-driven).
///
/// When the `fetch` feature is disabled this always returns `NotYetImplemented`
/// so default builds still compile cleanly.
fn fetch_source(
    source: &SourceConfig,
    cache_dir_override: Option<&Path>,
    overrides: &CliPathOverrides,
) -> Result<ResolvedData, DataSourceError> {
    #[cfg(feature = "fetch")]
    {
        let cache_root = fetch::ensure_cached(source, cache_dir_override)?;
        Ok(from_root(
            &cache_root,
            overrides,
            Provenance::Cache { cache_dir: cache_root.clone() },
        ))
    }
    #[cfg(not(feature = "fetch"))]
    {
        let _ = (source, cache_dir_override, overrides);
        Err(DataSourceError::NotYetImplemented {
            source_type: "fetch feature not enabled in this build".into(),
        })
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::Mutex;
    use tempfile::TempDir;

    // Serialize all tests that mutate process-global env vars (DESIGN_DATA_CACHE_DIR,
    // DESIGN_DATA_SCHEMA_ROOT).  Rust runs tests in parallel by default, so without
    // this lock two tests setting the same var will race.
    static ENV_LOCK: Mutex<()> = Mutex::new(());

    fn make_monorepo(dir: &Path) {
        fs::create_dir_all(dir.join("packages/tokens/schemas/token-types")).unwrap();
        fs::write(dir.join("packages/tokens/schemas/token-file.json"), b"{}").unwrap();
        fs::create_dir_all(dir.join("packages/design-data-spec/mode-sets")).unwrap();
        fs::create_dir_all(dir.join("packages/design-data-spec/components")).unwrap();
        fs::create_dir_all(dir.join("packages/design-data-spec/fields")).unwrap();
        fs::write(dir.join("packages/tokens/naming-exceptions.json"), b"{}").unwrap();
        fs::write(dir.join("packages/tokens/manifest.json"), b"[]").unwrap();
    }

    // --- Tier 3: CWD probing (no config) ---

    #[test]
    fn probe_finds_schemas_in_repo_root() {
        let tmp = TempDir::new().unwrap();
        make_monorepo(tmp.path());

        let resolved = resolve(tmp.path(), &CliPathOverrides::default()).unwrap();
        assert_eq!(resolved.provenance, Provenance::InRepo);
        assert!(resolved.schemas_root.ends_with("packages/tokens/schemas"));
        assert!(resolved.mode_sets.is_some());
        assert!(resolved.components.is_some());
        assert!(resolved.fields.is_some());
        assert!(resolved.exceptions.is_some());
        assert!(resolved.manifest.is_some());
    }

    #[test]
    fn probe_tokens_root_defaults_to_cwd_when_in_repo() {
        // In-repo: tokens_root defaults to the CWD (original "." behaviour).
        let tmp = TempDir::new().unwrap();
        make_monorepo(tmp.path()); // creates schemas/token-types → is_in_repo = true
        let resolved = resolve(tmp.path(), &CliPathOverrides::default()).unwrap();
        assert_eq!(resolved.provenance, Provenance::InRepo);
        assert_eq!(resolved.tokens_root, tmp.path());
    }

    #[test]
    fn probe_returns_none_for_absent_spec_dirs_when_in_repo() {
        // When inside a repo (schemas/token-types present) but spec dirs are absent,
        // probe returns None fields for those paths.
        let tmp = TempDir::new().unwrap();
        // Only create the minimal structure to trigger is_in_repo — no spec dirs.
        fs::create_dir_all(tmp.path().join("packages/tokens/schemas/token-types")).unwrap();

        let resolved = resolve(tmp.path(), &CliPathOverrides::default()).unwrap();
        assert_eq!(resolved.provenance, Provenance::InRepo);
        assert!(resolved.mode_sets.is_none());
        assert!(resolved.components.is_none());
        assert!(resolved.fields.is_none());
        assert!(resolved.exceptions.is_none());
    }

    // --- Tier 1: CLI overrides ---

    #[test]
    fn cli_override_wins_over_probe() {
        let tmp = TempDir::new().unwrap();
        make_monorepo(tmp.path());

        let custom_schema = tmp.path().join("custom-schemas");
        fs::create_dir_all(&custom_schema).unwrap();

        let overrides = CliPathOverrides {
            schema_root: Some(custom_schema.clone()),
            ..Default::default()
        };
        let resolved = resolve(tmp.path(), &overrides).unwrap();
        assert_eq!(resolved.schemas_root, custom_schema);
    }

    #[test]
    fn cli_tokens_root_override() {
        let tmp = TempDir::new().unwrap();
        let dataset = tmp.path().join("my-tokens");
        fs::create_dir_all(&dataset).unwrap();

        let overrides = CliPathOverrides {
            tokens_root: Some(dataset.clone()),
            ..Default::default()
        };
        let resolved = resolve(tmp.path(), &overrides).unwrap();
        assert_eq!(resolved.tokens_root, dataset);
    }

    // --- Tier 2: Config file ---

    #[test]
    fn config_path_source_resolves_from_root() {
        let tmp = TempDir::new().unwrap();

        // Create a separate "external repo" with the monorepo layout.
        let ext_repo = tmp.path().join("spectrum-repo");
        make_monorepo(&ext_repo);

        // Create a project dir with a `.design-data.toml` pointing at the external repo.
        let project = tmp.path().join("my-project");
        fs::create_dir_all(&project).unwrap();
        fs::write(
            project.join(".design-data.toml"),
            format!("[source]\ntype = \"path\"\nroot = \"../spectrum-repo\"\n"),
        )
        .unwrap();

        let resolved = resolve(&project, &CliPathOverrides::default()).unwrap();
        assert!(matches!(resolved.provenance, Provenance::Config { .. }));
        // Canonicalize both sides: on macOS /tmp → /private/tmp via symlink.
        let canon_root = ext_repo.canonicalize().unwrap_or(ext_repo.clone());
        assert_eq!(resolved.tokens_root, canon_root);
        assert!(resolved.schemas_root.starts_with(&canon_root));
        assert!(resolved.components.is_some());
    }

    #[test]
    fn config_path_source_nonexistent_root_errors() {
        let tmp = TempDir::new().unwrap();
        fs::write(
            tmp.path().join(".design-data.toml"),
            "[source]\ntype = \"path\"\nroot = \"/does/not/exist\"\n",
        )
        .unwrap();

        let err = resolve(tmp.path(), &CliPathOverrides::default()).unwrap_err();
        assert!(matches!(err, DataSourceError::PathNotFound { .. }));
    }

    #[test]
    fn config_npm_source_returns_not_yet_supported() {
        let _guard = ENV_LOCK.lock().unwrap();
        let tmp = TempDir::new().unwrap();
        // Set DESIGN_DATA_CACHE_DIR so the fetch engine doesn't touch the real OS cache.
        std::env::set_var("DESIGN_DATA_CACHE_DIR", tmp.path());
        fs::write(
            tmp.path().join(".design-data.toml"),
            "[source]\ntype = \"npm\"\npackage = \"@adobe/spectrum-tokens\"\nversion = \"14.0.0\"\n",
        )
        .unwrap();

        let err = resolve(tmp.path(), &CliPathOverrides::default()).unwrap_err();
        std::env::remove_var("DESIGN_DATA_CACHE_DIR");

        // With the `fetch` feature enabled, npm returns DataSourceError::Fetch wrapping
        // FetchError::NotYetSupported; without the feature, NotYetImplemented.
        // Either way the resolve fails — verify via the Display message.
        let msg = err.to_string();
        assert!(
            msg.contains("not yet") || msg.contains("npm"),
            "expected an unsupported-source error message, got: {msg}"
        );
    }

    #[test]
    fn config_ancestor_walk_finds_toml_in_parent() {
        let tmp = TempDir::new().unwrap();
        let ext_repo = tmp.path().join("external");
        make_monorepo(&ext_repo);

        // Config lives in the parent; we resolve from a nested child dir.
        let parent = tmp.path().join("parent");
        fs::create_dir_all(&parent).unwrap();
        fs::write(
            parent.join(".design-data.toml"),
            format!("[source]\ntype = \"path\"\nroot = \"{}\"\n", ext_repo.display()),
        )
        .unwrap();

        let child = parent.join("sub").join("nested");
        fs::create_dir_all(&child).unwrap();

        let resolved = resolve(&child, &CliPathOverrides::default()).unwrap();
        assert!(matches!(resolved.provenance, Provenance::Config { .. }));
    }

    #[test]
    fn config_without_source_block_falls_through_to_probe() {
        let tmp = TempDir::new().unwrap();
        make_monorepo(tmp.path());
        fs::write(tmp.path().join(".design-data.toml"), "# no source block\n").unwrap();

        let resolved = resolve(tmp.path(), &CliPathOverrides::default()).unwrap();
        // Falls through to CWD probing.
        assert_eq!(resolved.provenance, Provenance::InRepo);
    }

    #[test]
    fn config_invalid_toml_errors() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join(".design-data.toml"), "not valid toml [[[").unwrap();

        let err = resolve(tmp.path(), &CliPathOverrides::default()).unwrap_err();
        assert!(matches!(err, DataSourceError::ConfigParse { .. }));
    }

    #[test]
    fn env_var_schema_root_wins_over_probe() {
        let _guard = ENV_LOCK.lock().unwrap();
        let tmp = TempDir::new().unwrap();
        make_monorepo(tmp.path());

        let custom = tmp.path().join("my-schemas");
        fs::create_dir_all(&custom).unwrap();

        // Set the env var; resolve must return its value even though CWD probing
        // would find packages/tokens/schemas instead.
        std::env::set_var("DESIGN_DATA_SCHEMA_ROOT", custom.to_str().unwrap());
        let resolved = resolve(tmp.path(), &CliPathOverrides::default()).unwrap();
        std::env::remove_var("DESIGN_DATA_SCHEMA_ROOT");

        assert_eq!(resolved.schemas_root, custom);
    }

    // --- Tier 4: Embedded snapshot ---

    #[test]
    fn resolve_outside_repo_uses_embedded_tier() {
        let _guard = ENV_LOCK.lock().unwrap();
        // A completely empty temp dir has no monorepo layout, so is_in_repo returns
        // false and the resolver must fall through to the embedded tier.
        // Set DESIGN_DATA_CACHE_DIR to a temp path to avoid writing to the real OS
        // cache during tests.
        let cache_tmp = TempDir::new().unwrap();
        std::env::set_var("DESIGN_DATA_CACHE_DIR", cache_tmp.path());

        let cwd_tmp = TempDir::new().unwrap();
        let resolved = resolve(cwd_tmp.path(), &CliPathOverrides::default()).unwrap();
        std::env::remove_var("DESIGN_DATA_CACHE_DIR");

        assert!(
            matches!(resolved.provenance, Provenance::Embedded { .. }),
            "expected Embedded provenance outside the repo, got {:?}",
            resolved.provenance
        );
        assert!(
            resolved.tokens_root.exists(),
            "tokens_root should be materialized"
        );
        assert!(
            resolved.schemas_root.join("token-types").is_dir(),
            "schemas_root/token-types should exist in the embedded snapshot"
        );
    }

    #[test]
    fn cli_override_wins_over_embedded() {
        let _guard = ENV_LOCK.lock().unwrap();
        // Set DESIGN_DATA_CACHE_DIR to a temp path to avoid writing to the real OS
        // cache during tests.
        let cache_tmp = TempDir::new().unwrap();
        std::env::set_var("DESIGN_DATA_CACHE_DIR", cache_tmp.path());

        let cwd_tmp = TempDir::new().unwrap();
        let custom_schema = cwd_tmp.path().join("custom-schemas");
        fs::create_dir_all(&custom_schema).unwrap();

        let overrides = CliPathOverrides {
            schema_root: Some(custom_schema.clone()),
            ..Default::default()
        };
        let resolved = resolve(cwd_tmp.path(), &overrides).unwrap();
        std::env::remove_var("DESIGN_DATA_CACHE_DIR");

        // Provenance is Embedded (we're outside the repo) but the schema override wins.
        assert!(matches!(resolved.provenance, Provenance::Embedded { .. }));
        assert_eq!(resolved.schemas_root, custom_schema);
    }
}
