// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Derived embedded-database cache over the canonical token JSON.
//!
//! The JSON files on disk remain the single source of truth. This module builds
//! a compact, indexed [redb](https://www.redb.org) database from them and caches
//! it so the CLI/TUI can skip re-parsing ~2 MB of JSON on every invocation. The
//! cache is **never authoritative**: it is content-addressed, rebuilt whenever
//! the JSON changes, and any cache error falls back to loading from JSON.
//!
//! ## Why this layer exists
//!
//! Every CLI subcommand previously called [`TokenGraph::from_json_dir`], walking
//! the dataset and `serde_json`-parsing every file on each run. [`open_cached`]
//! is a drop-in replacement that hydrates the same [`TokenGraph`] from the redb
//! cache on a hit, and rebuilds + caches on a miss.
//!
//! ## Cache layout
//!
//! ```text
//! <cache_base>/cache/<tokens_version>/<dataset_key>.redb
//! ```
//!
//! - `cache_base`: `DESIGN_DATA_CACHE_DIR` env override, else `dirs::cache_dir()/design-data`.
//! - `tokens_version`: [`EMBEDDED_TOKENS_VERSION`] — upgrades self-invalidate.
//! - `dataset_key`: hash of the dataset's absolute path, so distinct datasets do
//!   not thrash a single shared cache file.
//!
//! ## redb schema
//!
//! | table          | kind        | key            | value                          |
//! |----------------|-------------|----------------|--------------------------------|
//! | `meta`         | table       | `"meta"`       | MessagePack [`CacheMeta`]      |
//! | `tokens`       | table       | graph key      | MessagePack [`TokenRecord`]    |
//! | `uuid_index`   | table       | uuid           | graph key                      |
//! | `idx_<field>`  | multimap    | field value    | graph keys (one per query key) |
//!
//! `tokens` drives hydration; the `uuid_index` / `idx_*` tables exist so a
//! read-only consumer (e.g. a WASM web tool via [`load_index_from_bytes`]) can
//! answer indexed equality queries without materializing the whole graph.
//!
//! ## WASM
//!
//! [`build_bytes`] serializes a cache to an in-memory byte buffer and
//! [`load_from_bytes`] / [`load_index_from_bytes`] open it again with no
//! filesystem, via [`mem_backend::MemBackend`].
//!
//! ## Invalidation
//!
//! Cache freshness uses per-file **size + mtime** (not a full content hash) for
//! speed. A stale miss only forces a rebuild (safe). A false hit requires a
//! same-size edit with an unchanged mtime — unlikely in normal editor/git
//! workflows, but possible in CI that preserves mtimes aggressively.
//!
//! ## Known limitations (schema v1)
//!
//! - **Inline mode sets** discovered by [`TokenGraph::from_json_dir`] inside the
//!   tokens tree are not persisted; hydration uses [`TokenGraph::from_records`],
//!   which clears `mode_sets`. The canonical Spectrum layout (mode sets under
//!   `design-data-spec/mode-sets`) is unaffected.
//! - **`components` / `mode_sets` catalog tables** from the plan are deferred;
//!   only tokens and query indexes are cached today.

mod mem_backend;

pub use mem_backend::MemBackend;

use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};

use redb::{
    Database, MultimapTableDefinition, ReadableMultimapTable, ReadableTable, TableDefinition,
};
use serde::{Deserialize, Serialize};

use crate::data_source::embedded::EMBEDDED_TOKENS_VERSION;
use crate::discovery::discover_json_files;
use crate::graph::{TokenGraph, TokenRecord};
use crate::query::{self, TokenIndex, ALLOWED_KEYS};
use crate::CoreError;

/// A token graph plus its query index, loaded together from cache or JSON.
#[derive(Debug)]
pub struct CachedDataset {
    pub graph: TokenGraph,
    pub index: TokenIndex,
}

/// Bump when the on-disk schema or value encoding changes, to invalidate caches
/// written by older binaries (in addition to the tokens-version namespace).
const CACHE_SCHEMA_VERSION: u32 = 1;

const META: TableDefinition<&str, &[u8]> = TableDefinition::new("meta");
const TOKENS: TableDefinition<&str, &[u8]> = TableDefinition::new("tokens");
const UUID_INDEX: TableDefinition<&str, &str> = TableDefinition::new("uuid_index");

// One multimap index table per query field (see `query::ALLOWED_KEYS`).
const IDX_PROPERTY: MultimapTableDefinition<&str, &str> =
    MultimapTableDefinition::new("idx_property");
const IDX_COMPONENT: MultimapTableDefinition<&str, &str> =
    MultimapTableDefinition::new("idx_component");
const IDX_VARIANT: MultimapTableDefinition<&str, &str> =
    MultimapTableDefinition::new("idx_variant");
const IDX_STATE: MultimapTableDefinition<&str, &str> = MultimapTableDefinition::new("idx_state");
const IDX_COLOR_SCHEME: MultimapTableDefinition<&str, &str> =
    MultimapTableDefinition::new("idx_colorScheme");
const IDX_SCALE: MultimapTableDefinition<&str, &str> = MultimapTableDefinition::new("idx_scale");
const IDX_CONTRAST: MultimapTableDefinition<&str, &str> =
    MultimapTableDefinition::new("idx_contrast");
const IDX_UUID: MultimapTableDefinition<&str, &str> = MultimapTableDefinition::new("idx_uuid");
const IDX_SCHEMA: MultimapTableDefinition<&str, &str> = MultimapTableDefinition::new("idx_schema");

/// Map a query field name to its multimap index table definition.
fn index_table(
    field: &str,
) -> Option<MultimapTableDefinition<'static, &'static str, &'static str>> {
    Some(match field {
        "property" => IDX_PROPERTY,
        "component" => IDX_COMPONENT,
        "variant" => IDX_VARIANT,
        "state" => IDX_STATE,
        "colorScheme" => IDX_COLOR_SCHEME,
        "scale" => IDX_SCALE,
        "contrast" => IDX_CONTRAST,
        "uuid" => IDX_UUID,
        "$schema" => IDX_SCHEMA,
        _ => return None,
    })
}

/// Provenance + invalidation metadata stored in the `meta` table.
#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
struct CacheMeta {
    schema_version: u32,
    tokens_version: String,
    /// Hash of the canonical JSON inputs (path + size + mtime).
    content_hash: u64,
}

/// Internal cache errors. These are intentionally **not** surfaced to callers of
/// [`open_cached`]: a cache problem simply triggers a rebuild / JSON fallback.
#[derive(Debug, thiserror::Error)]
enum CacheError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("redb open: {0}")]
    Db(#[from] redb::DatabaseError),
    #[error("redb txn: {0}")]
    Txn(#[from] redb::TransactionError),
    #[error("redb table: {0}")]
    Table(#[from] redb::TableError),
    #[error("redb storage: {0}")]
    Storage(#[from] redb::StorageError),
    #[error("redb commit: {0}")]
    Commit(#[from] redb::CommitError),
    #[error("messagepack encode: {0}")]
    Encode(#[from] rmp_serde::encode::Error),
    #[error("messagepack decode: {0}")]
    Decode(#[from] rmp_serde::decode::Error),
    #[error("build from json: {0}")]
    Build(#[from] CoreError),
    #[error("no cache directory available")]
    NoCacheDir,
}

/// Emit a one-line warning only under `DESIGN_DATA_LOG=debug` (mirrors the
/// embedded-snapshot module). Cache failures are non-fatal and would otherwise
/// be noisy in scripts.
fn debug_log(args: std::fmt::Arguments<'_>) {
    if std::env::var("DESIGN_DATA_LOG").as_deref() == Ok("debug") {
        eprintln!("design-data: cache: {args}");
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Load a [`TokenGraph`] for `tokens_root`, using the on-disk cache when fresh.
///
/// Drop-in replacement for [`TokenGraph::from_json_dir`]. Prefer
/// [`open_cached_with_index`] when you also need the persisted query index.
///
/// Never fails because of the cache; only a JSON load error propagates.
pub fn open_cached(tokens_root: &Path) -> Result<TokenGraph, CoreError> {
    open_cached_with_index(tokens_root).map(|loaded| loaded.graph)
}

/// Load a graph **and** its query index for `tokens_root`.
///
/// On a cache hit both are hydrated from the redb file — including the `idx_*`
/// multimap tables — without rebuilding the index in memory. On a miss or any
/// cache error the graph is built from JSON (source of truth), the index is
/// built from that graph, and the cache is rewritten best-effort.
pub fn open_cached_with_index(tokens_root: &Path) -> Result<CachedDataset, CoreError> {
    match load_from_disk(tokens_root) {
        Ok(Some(loaded)) => return Ok(loaded),
        Ok(None) => {}
        Err(e) => debug_log(format_args!("read failed ({e}); rebuilding from json")),
    }

    let graph = TokenGraph::from_json_dir(tokens_root)?;
    let index = TokenIndex::build(&graph);
    if let Err(e) = write_to_disk(tokens_root, &graph) {
        debug_log(format_args!("write failed ({e}); cache not updated"));
    }
    Ok(CachedDataset { graph, index })
}

/// Serialize a freshly built cache for `tokens_root` into an in-memory byte
/// buffer (no filesystem). Use this as a build step to emit a `index.redb`
/// static asset for WASM web tools.
pub fn build_bytes(tokens_root: &Path) -> Result<Vec<u8>, CoreError> {
    let graph = TokenGraph::from_json_dir(tokens_root)?;
    let hash = content_hash(tokens_root).map_err(CoreError::Io)?;
    build_bytes_from_graph(&graph, hash).map_err(into_core)
}

/// Build a cache for `tokens_root` and write it to an explicit `.redb` file.
///
/// Build-step primitive for emitting a shippable cache asset. Unlike
/// [`open_cached`], the destination is caller-controlled rather than the OS
/// cache directory.
pub fn build_file(tokens_root: &Path, out_path: &Path) -> Result<(), CoreError> {
    let graph = TokenGraph::from_json_dir(tokens_root)?;
    let hash = content_hash(tokens_root).map_err(CoreError::Io)?;
    write_db_file(out_path, &graph, hash).map_err(into_core)
}

/// Hydrate a [`TokenGraph`] from cache bytes (read-only, no filesystem).
///
/// The WASM read path: open a cache blob produced by [`build_bytes`].
pub fn load_from_bytes(bytes: &[u8]) -> Result<TokenGraph, CoreError> {
    let backend = MemBackend::from_bytes(bytes.to_vec());
    let db = Database::builder()
        .create_with_backend(backend)
        .map_err(into_core_db)?;
    let rtx = db.begin_read().map_err(|e| into_core(CacheError::Txn(e)))?;
    hydrate(&rtx).map_err(into_core)
}

/// Reconstruct a [`TokenIndex`] from the multimap index tables in a cache blob.
///
/// Lets a read-only consumer answer indexed equality queries straight from the
/// cached tables, without first hydrating the whole graph.
pub fn load_index_from_bytes(bytes: &[u8]) -> Result<TokenIndex, CoreError> {
    let backend = MemBackend::from_bytes(bytes.to_vec());
    let db = Database::builder()
        .create_with_backend(backend)
        .map_err(into_core_db)?;
    let rtx = db.begin_read().map_err(|e| into_core(CacheError::Txn(e)))?;
    read_index(&rtx).map_err(into_core)
}

// ---------------------------------------------------------------------------
// Disk path resolution + invalidation
// ---------------------------------------------------------------------------

fn cache_db_path(tokens_root: &Path) -> Option<PathBuf> {
    let base = if let Ok(p) = std::env::var("DESIGN_DATA_CACHE_DIR") {
        PathBuf::from(p)
    } else {
        dirs::cache_dir()?.join("design-data")
    };
    // Namespace by absolute dataset path so distinct datasets get distinct files.
    let abs = tokens_root
        .canonicalize()
        .unwrap_or_else(|_| tokens_root.to_path_buf());
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    abs.to_string_lossy().hash(&mut hasher);
    let dataset_key = format!("{:016x}", hasher.finish());
    Some(
        base.join("cache")
            .join(EMBEDDED_TOKENS_VERSION)
            .join(format!("{dataset_key}.redb")),
    )
}

/// Content hash of the canonical inputs: per-file `(path, len, mtime)`, sorted.
/// `mtime + len` is used (rather than full content) for speed; a false-positive
/// match is impossible in practice and a false miss only forces a rebuild.
fn content_hash(tokens_root: &Path) -> std::io::Result<u64> {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    CACHE_SCHEMA_VERSION.hash(&mut hasher);
    EMBEDDED_TOKENS_VERSION.hash(&mut hasher);
    let mut paths = discover_json_files(tokens_root)?;
    paths.sort();
    for p in &paths {
        p.to_string_lossy().hash(&mut hasher);
        let meta = std::fs::metadata(p)?;
        meta.len().hash(&mut hasher);
        if let Ok(modified) = meta.modified() {
            if let Ok(dur) = modified.duration_since(std::time::UNIX_EPOCH) {
                dur.as_nanos().hash(&mut hasher);
            }
        }
    }
    Ok(hasher.finish())
}

// ---------------------------------------------------------------------------
// Read path
// ---------------------------------------------------------------------------

/// Returns `Ok(Some(loaded))` on a fresh cache hit, `Ok(None)` on a miss
/// (absent/stale), or `Err` on a real cache error.
fn load_from_disk(tokens_root: &Path) -> Result<Option<CachedDataset>, CacheError> {
    let Some(path) = cache_db_path(tokens_root) else {
        return Ok(None);
    };
    if !path.exists() {
        return Ok(None);
    }
    let expected = content_hash(tokens_root)?;
    let db = Database::open(&path)?;
    let rtx = db.begin_read()?;

    let meta = read_meta(&rtx)?;
    let fresh = meta.is_some_and(|m| {
        m.schema_version == CACHE_SCHEMA_VERSION
            && m.tokens_version == EMBEDDED_TOKENS_VERSION
            && m.content_hash == expected
    });
    if !fresh {
        return Ok(None);
    }

    Ok(Some(CachedDataset {
        graph: hydrate(&rtx)?,
        index: read_index(&rtx)?,
    }))
}

fn read_meta(rtx: &redb::ReadTransaction) -> Result<Option<CacheMeta>, CacheError> {
    let table = rtx.open_table(META)?;
    let Some(bytes) = table.get("meta")? else {
        return Ok(None);
    };
    Ok(Some(rmp_serde::from_slice(bytes.value())?))
}

/// Rebuild the in-memory [`TokenGraph`] from the `tokens` table. `from_records`
/// rebuilds the UUID index, so the cached `uuid_index` table is not needed here.
fn hydrate(rtx: &redb::ReadTransaction) -> Result<TokenGraph, CacheError> {
    let table = rtx.open_table(TOKENS)?;
    let mut records: Vec<TokenRecord> = Vec::new();
    for item in table.iter()? {
        let (_key, value) = item?;
        let record: TokenRecord = rmp_serde::from_slice(value.value())?;
        records.push(record);
    }
    Ok(TokenGraph::from_records(records))
}

fn read_index(rtx: &redb::ReadTransaction) -> Result<TokenIndex, CacheError> {
    let mut index = TokenIndex::default();
    for field in ALLOWED_KEYS {
        let Some(def) = index_table(field) else {
            continue;
        };
        let table = match rtx.open_multimap_table(def) {
            Ok(t) => t,
            // A missing index table just means no entries for that field.
            Err(redb::TableError::TableDoesNotExist(_)) => continue,
            Err(e) => return Err(e.into()),
        };
        for entry in table.iter()? {
            let (value_guard, keys) = entry?;
            let value = value_guard.value().to_string();
            for key in keys {
                let key = key?;
                index.insert(field, &value, key.value());
            }
        }
    }
    Ok(index)
}

// ---------------------------------------------------------------------------
// Write path
// ---------------------------------------------------------------------------

fn write_to_disk(tokens_root: &Path, graph: &TokenGraph) -> Result<(), CacheError> {
    let path = cache_db_path(tokens_root).ok_or(CacheError::NoCacheDir)?;
    let hash = content_hash(tokens_root)?;
    write_db_file(&path, graph, hash)?;
    evict_stale_versions(&path);
    Ok(())
}

/// Write a cache database to `path` atomically: build into a sibling `.tmp`
/// file, then rename over the destination (mirrors `embedded::materialize_to`).
fn write_db_file(path: &Path, graph: &TokenGraph, hash: u64) -> Result<(), CacheError> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let tmp = path.with_extension("redb.tmp");
    let _ = std::fs::remove_file(&tmp);

    {
        let db = Database::create(&tmp)?;
        write_tables(&db, graph, hash)?;
        // `db` drops here, flushing and releasing the file lock before rename.
    }

    if path.exists() {
        let _ = std::fs::remove_file(path);
    }
    std::fs::rename(&tmp, path)?;
    Ok(())
}

/// Serialize a cache entirely in memory and return the bytes.
fn build_bytes_from_graph(graph: &TokenGraph, hash: u64) -> Result<Vec<u8>, CacheError> {
    let backend = MemBackend::new();
    let handle = backend.clone();
    {
        let db = Database::builder().create_with_backend(backend)?;
        write_tables(&db, graph, hash)?;
    }
    Ok(handle.snapshot())
}

fn write_tables(db: &Database, graph: &TokenGraph, hash: u64) -> Result<(), CacheError> {
    let wtx = db.begin_write()?;
    {
        let meta = CacheMeta {
            schema_version: CACHE_SCHEMA_VERSION,
            tokens_version: EMBEDDED_TOKENS_VERSION.to_string(),
            content_hash: hash,
        };
        let mut meta_t = wtx.open_table(META)?;
        let bytes = rmp_serde::to_vec(&meta)?;
        meta_t.insert("meta", bytes.as_slice())?;
    }
    {
        let mut tokens_t = wtx.open_table(TOKENS)?;
        let mut uuid_t = wtx.open_table(UUID_INDEX)?;
        for (key, record) in &graph.tokens {
            let bytes = rmp_serde::to_vec(record)?;
            tokens_t.insert(key.as_str(), bytes.as_slice())?;
            if let Some(uuid) = &record.uuid {
                // First-seen wins, matching TokenGraph's uuid_index semantics.
                if uuid_t.get(uuid.as_str())?.is_none() {
                    uuid_t.insert(uuid.as_str(), key.as_str())?;
                }
            }
        }
    }
    for field in ALLOWED_KEYS {
        let Some(def) = index_table(field) else {
            continue;
        };
        let mut table = wtx.open_multimap_table(def)?;
        for (key, record) in &graph.tokens {
            if let Some(value) = query::resolve_key(&record.raw, field) {
                table.insert(value.as_str(), key.as_str())?;
            }
        }
    }
    wtx.commit()?;
    Ok(())
}

/// Best-effort removal of cache files for other tokens-versions, keeping the
/// footprint bounded as the binary is upgraded. Errors are ignored.
fn evict_stale_versions(current: &Path) {
    // `current` = <base>/cache/<version>/<key>.redb — its grandparent is `cache/`.
    let Some(version_dir) = current.parent() else {
        return;
    };
    let Some(cache_dir) = version_dir.parent() else {
        return;
    };
    let Ok(entries) = std::fs::read_dir(cache_dir) else {
        return;
    };
    for entry in entries.flatten() {
        let p = entry.path();
        if p != version_dir && p.is_dir() {
            let _ = std::fs::remove_dir_all(&p);
        }
    }
}

// ---------------------------------------------------------------------------
// Error mapping (internal CacheError → public CoreError) for the byte APIs
// ---------------------------------------------------------------------------

fn into_core(e: CacheError) -> CoreError {
    match e {
        CacheError::Io(io) => CoreError::Io(io),
        CacheError::Decode(d) => CoreError::ParseError(format!("cache decode: {d}")),
        CacheError::Build(c) => c,
        other => CoreError::ParseError(format!("cache: {other}")),
    }
}

fn into_core_db(e: redb::DatabaseError) -> CoreError {
    CoreError::ParseError(format!("cache: redb open: {e}"))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::io::Write;
    use tempfile::TempDir;

    fn write_tokens(dir: &Path, file: &str, value: serde_json::Value) {
        let path = dir.join(file);
        let mut f = std::fs::File::create(&path).unwrap();
        write!(f, "{value}").unwrap();
    }

    /// A dataset dir plus an isolated cache dir wired via `DESIGN_DATA_CACHE_DIR`.
    fn fixture() -> (TempDir, TempDir, PathBuf) {
        let data = TempDir::new().unwrap();
        let cache = TempDir::new().unwrap();
        write_tokens(
            data.path(),
            "color.json",
            json!({
                "blue-100": {
                    "$schema": "https://example.com/color.json",
                    "value": "#00f",
                    "uuid": "11111111-1111-4111-8111-111111111111",
                    "name": {"property": "background-color", "component": "button"}
                },
                "blue-200": {
                    "$schema": "https://example.com/color.json",
                    "value": "#00e",
                    "uuid": "22222222-2222-4222-8222-222222222222",
                    "name": {"property": "color", "component": "button"}
                }
            }),
        );
        let root = data.path().to_path_buf();
        (data, cache, root)
    }

    #[test]
    fn miss_then_hit_roundtrip() {
        let _env = crate::data_source::test_support::env_lock();
        let (_data, cache, root) = fixture();
        std::env::set_var("DESIGN_DATA_CACHE_DIR", cache.path());

        // First load builds + writes the cache (miss).
        let g1 = open_cached(&root).unwrap();
        let path = cache_db_path(&root).unwrap();
        assert!(path.exists(), "cache file should be written on first load");

        // Second load is a hit; graph must match the JSON-built one.
        let g2 = open_cached(&root).unwrap();
        let g_json = TokenGraph::from_json_dir(&root).unwrap();
        assert_eq!(g1.tokens.len(), g_json.tokens.len());
        assert_eq!(g2.tokens.len(), g_json.tokens.len());
        assert!(g2.tokens.contains_key("blue-100"));

        std::env::remove_var("DESIGN_DATA_CACHE_DIR");
    }

    #[test]
    fn disk_hit_serves_from_cache_not_fallback() {
        let _env = crate::data_source::test_support::env_lock();
        let (_data, cache, root) = fixture();
        std::env::set_var("DESIGN_DATA_CACHE_DIR", cache.path());

        // Prime the cache.
        let _ = open_cached(&root).unwrap();

        // load_from_disk must report a genuine hit (Some) — proving the redb
        // read + MessagePack hydration path works, not the JSON fallback.
        let hit = load_from_disk(&root).unwrap();
        let loaded = hit.expect("expected a cache hit after priming");
        assert_eq!(loaded.graph.tokens.len(), 2);
        assert!(loaded.graph.tokens.contains_key("blue-100"));
        assert!(loaded.graph.tokens.contains_key("blue-200"));

        // Index must come from the persisted multimap tables, not a rebuild.
        let expr = query::parse("component=button").unwrap();
        let via_index = query::filter_with_index(&loaded.graph, &loaded.index, &expr);
        assert_eq!(via_index.len(), 2);

        std::env::remove_var("DESIGN_DATA_CACHE_DIR");
    }

    #[test]
    fn edit_invalidates_cache() {
        let _env = crate::data_source::test_support::env_lock();
        let (data, cache, root) = fixture();
        std::env::set_var("DESIGN_DATA_CACHE_DIR", cache.path());

        let g1 = open_cached(&root).unwrap();
        assert_eq!(g1.tokens.len(), 2);

        // Mutate the dataset; the content hash must change → rebuild.
        // Sleep briefly so mtime advances on coarse-grained filesystems.
        std::thread::sleep(std::time::Duration::from_millis(10));
        write_tokens(
            data.path(),
            "extra.json",
            json!({
                "green-100": {
                    "$schema": "https://example.com/color.json",
                    "value": "#0f0",
                    "uuid": "33333333-3333-4333-8333-333333333333",
                    "name": {"property": "border-color"}
                }
            }),
        );

        let g2 = open_cached(&root).unwrap();
        assert_eq!(
            g2.tokens.len(),
            3,
            "edited dataset must reload, not serve stale cache"
        );

        std::env::remove_var("DESIGN_DATA_CACHE_DIR");
    }

    #[test]
    fn corrupt_cache_falls_back_to_json() {
        let _env = crate::data_source::test_support::env_lock();
        let (_data, cache, root) = fixture();
        std::env::set_var("DESIGN_DATA_CACHE_DIR", cache.path());

        // Prime the cache, then corrupt the file.
        let _ = open_cached(&root).unwrap();
        let path = cache_db_path(&root).unwrap();
        std::fs::write(&path, b"not a redb database").unwrap();

        // Must not error — falls back to JSON and rewrites the cache.
        let g = open_cached(&root).unwrap();
        assert_eq!(g.tokens.len(), 2);

        std::env::remove_var("DESIGN_DATA_CACHE_DIR");
    }

    #[test]
    fn in_memory_bytes_roundtrip() {
        let (_data, _cache, root) = fixture();
        let bytes = build_bytes(&root).unwrap();
        assert!(!bytes.is_empty());

        let graph = load_from_bytes(&bytes).unwrap();
        assert_eq!(graph.tokens.len(), 2);
        assert!(graph.tokens.contains_key("blue-200"));
    }

    #[test]
    fn in_memory_index_uses_multimap_tables() {
        let (_data, _cache, root) = fixture();
        let bytes = build_bytes(&root).unwrap();

        // The index is reconstructed purely from the cached multimap tables.
        let index = load_index_from_bytes(&bytes).unwrap();
        let graph = load_from_bytes(&bytes).unwrap();

        let expr = query::parse("component=button").unwrap();
        let via_index = query::filter_with_index(&graph, &index, &expr);
        assert_eq!(via_index.len(), 2);

        let expr = query::parse("property=color").unwrap();
        let via_index = query::filter_with_index(&graph, &index, &expr);
        assert_eq!(via_index.len(), 1);
        assert_eq!(
            via_index[0].uuid.as_deref(),
            Some("22222222-2222-4222-8222-222222222222")
        );
    }
}
