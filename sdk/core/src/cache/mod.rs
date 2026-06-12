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
//! - `tokens_version`: [`EMBEDDED_DATA_VERSION`] — cascade data version; upgrades self-invalidate.
//! - `dataset_key`: hash of the tokens root absolute path plus any configured
//!   catalog directory paths (`mode-sets`, `components`), so distinct datasets
//!   and catalog configurations do not thrash a single shared cache file.
//!
//! ## redb schema (v2)
//!
//! | table          | kind        | key            | value                          |
//! |----------------|-------------|----------------|--------------------------------|
//! | `meta`         | table       | `"meta"`       | MessagePack [`CacheMeta`]      |
//! | `tokens`       | table       | graph key      | MessagePack [`TokenRecord`]    |
//! | `uuid_index`   | table       | uuid           | graph key                      |
//! | `mode_sets`    | table       | ordinal        | MessagePack [`ModeSetRecord`]  |
//! | `components`   | table       | ordinal        | MessagePack [`ComponentRecord`]|
//! | `idx_<field>`  | multimap    | field value    | graph keys (one per query key) |
//!
//! `tokens` drives hydration; `mode_sets` / `components` preserve inline mode-set
//! docs and spec catalog entries; the `uuid_index` / `idx_*` tables exist so a
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
//! ## Catalog-aware caching
//!
//! [`open_cached_with_catalogs`] / [`open_cached_with_index_with_catalogs`] accept
//! optional `mode-sets` and `components` catalog directories (resolved separately
//! from `tokens_root`). Catalog JSON files are folded into the content hash and
//! the cache file key so edits self-invalidate. Inline mode-set docs co-located in
//! the tokens tree are persisted automatically.
//!
//! ## Known limitations (schema v2)
//!
//! - Sidecar name directories merged by [`TokenGraph::from_json_dir_with_names`] are
//!   not part of the cache build path; callers using sidecars should keep loading
//!   from JSON or extend the cache inputs explicitly.
//! - [`open_cached`] (no catalog dirs) and [`open_cached_with_catalogs`] write
//!   separate cache files for the same tokens root. CLI/TUI always pass catalogs;
//!   WASM/tools using plain [`build_bytes`] / [`open_cached`] maintain a distinct
//!   entry unless they adopt the `*_with_catalogs` APIs.
//! - `dataset_key` uses [`std::collections::hash_map::DefaultHasher`] (not stable
//!   across Rust versions). Fine for local dev caches; do not share cache dirs
//!   across heterogeneous CI runners expecting identical keys.

// redb::TransactionError is 160 bytes (external); all CacheError-returning functions are private
#![allow(clippy::result_large_err)]

mod mem_backend;

pub use mem_backend::MemBackend;

use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};

use redb::{
    Database, MultimapTableDefinition, ReadableMultimapTable, ReadableTable, TableDefinition,
};
use serde::{Deserialize, Serialize};

use crate::data_source::embedded::EMBEDDED_DATA_VERSION;
use crate::discovery::discover_json_files;
use crate::graph::{ComponentRecord, FieldRecord, ModeSetRecord, TokenGraph, TokenRecord};
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
const CACHE_SCHEMA_VERSION: u32 = 3;

const META: TableDefinition<&str, &[u8]> = TableDefinition::new("meta");
const TOKENS: TableDefinition<&str, &[u8]> = TableDefinition::new("tokens");
const UUID_INDEX: TableDefinition<&str, &str> = TableDefinition::new("uuid_index");
const MODE_SETS: TableDefinition<&str, &[u8]> = TableDefinition::new("mode_sets");
const COMPONENTS: TableDefinition<&str, &[u8]> = TableDefinition::new("components");
const FIELDS: TableDefinition<&str, &[u8]> = TableDefinition::new("fields");

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
/// For spec catalog dirs, use [`open_cached_with_catalogs`].
///
/// Never fails because of the cache; only a JSON load error propagates.
pub fn open_cached(tokens_root: &Path) -> Result<TokenGraph, CoreError> {
    open_cached_with_catalogs(tokens_root, None, None)
}

/// Load a graph with optional spec catalog directories.
pub fn open_cached_with_catalogs(
    tokens_root: &Path,
    mode_sets_dir: Option<&Path>,
    components_dir: Option<&Path>,
) -> Result<TokenGraph, CoreError> {
    open_cached_with_index_with_catalogs(tokens_root, mode_sets_dir, components_dir)
        .map(|loaded| loaded.graph)
}

/// Load a graph **and** its query index for `tokens_root`.
///
/// On a cache hit both are hydrated from the redb file — including the `idx_*`
/// multimap tables — without rebuilding the index in memory. On a miss or any
/// cache error the graph is built from JSON (source of truth), the index is
/// built from that graph, and the cache is rewritten best-effort.
pub fn open_cached_with_index(tokens_root: &Path) -> Result<CachedDataset, CoreError> {
    open_cached_with_index_with_catalogs(tokens_root, None, None)
}

/// Load a graph and query index with optional spec catalog directories.
pub fn open_cached_with_index_with_catalogs(
    tokens_root: &Path,
    mode_sets_dir: Option<&Path>,
    components_dir: Option<&Path>,
) -> Result<CachedDataset, CoreError> {
    match load_from_disk(tokens_root, mode_sets_dir, components_dir) {
        Ok(Some(loaded)) => return Ok(loaded),
        Ok(None) => {}
        Err(e) => debug_log(format_args!("read failed ({e}); rebuilding from json")),
    }

    let graph =
        TokenGraph::from_json_dir_with_catalogs(tokens_root, mode_sets_dir, components_dir)?;
    let index = TokenIndex::build(&graph);
    if let Err(e) = write_to_disk(tokens_root, mode_sets_dir, components_dir, &graph) {
        debug_log(format_args!("write failed ({e}); cache not updated"));
    }
    Ok(CachedDataset { graph, index })
}

/// Serialize a freshly built cache for `tokens_root` into an in-memory byte
/// buffer (no filesystem). Use this as a build step to emit a `index.redb`
/// static asset for WASM web tools.
pub fn build_bytes(tokens_root: &Path) -> Result<Vec<u8>, CoreError> {
    build_bytes_with_catalogs(tokens_root, None, None)
}

/// Build cache bytes including optional spec catalog directories.
pub fn build_bytes_with_catalogs(
    tokens_root: &Path,
    mode_sets_dir: Option<&Path>,
    components_dir: Option<&Path>,
) -> Result<Vec<u8>, CoreError> {
    let graph =
        TokenGraph::from_json_dir_with_catalogs(tokens_root, mode_sets_dir, components_dir)?;
    let hash =
        content_hash(tokens_root, mode_sets_dir, components_dir, None).map_err(CoreError::Io)?;
    build_bytes_from_graph(&graph, hash).map_err(into_core)
}

/// Build a cache for `tokens_root` and write it to an explicit `.redb` file.
///
/// Build-step primitive for emitting a shippable cache asset. Unlike
/// [`open_cached`], the destination is caller-controlled rather than the OS
/// cache directory.
pub fn build_file(tokens_root: &Path, out_path: &Path) -> Result<(), CoreError> {
    build_file_with_catalogs(tokens_root, None, None, out_path)
}

/// Build a cache file including optional spec catalog directories.
pub fn build_file_with_catalogs(
    tokens_root: &Path,
    mode_sets_dir: Option<&Path>,
    components_dir: Option<&Path>,
    out_path: &Path,
) -> Result<(), CoreError> {
    let graph =
        TokenGraph::from_json_dir_with_catalogs(tokens_root, mode_sets_dir, components_dir)?;
    let hash =
        content_hash(tokens_root, mode_sets_dir, components_dir, None).map_err(CoreError::Io)?;
    write_db_file(out_path, &graph, hash).map_err(into_core)
}

/// Build cache bytes including optional spec catalog directories and the fields catalog.
///
/// Use this variant when you need [`TokenGraph::fields`] and [`TokenGraph::manifest`]
/// persisted in the blob — e.g. when building the embedded WASM asset so that
/// [`Dataset::primer()`] can return taxonomy fields and manifest without disk access.
pub fn build_bytes_with_all_catalogs(
    tokens_root: &Path,
    mode_sets_dir: Option<&Path>,
    components_dir: Option<&Path>,
    fields_dir: Option<&Path>,
) -> Result<Vec<u8>, CoreError> {
    let graph = TokenGraph::from_json_dir_with_all_catalogs(
        tokens_root,
        mode_sets_dir,
        components_dir,
        fields_dir,
    )?;
    let hash = content_hash(tokens_root, mode_sets_dir, components_dir, fields_dir)
        .map_err(CoreError::Io)?;
    build_bytes_from_graph(&graph, hash).map_err(into_core)
}

/// Build a cache file including optional spec catalog directories and the fields catalog.
///
/// Like [`build_file_with_catalogs`] but also bakes the fields catalog and the
/// manifest into the blob so that consumers without filesystem access (WASM) can
/// answer primer requests entirely from the prebuilt asset.
pub fn build_file_with_all_catalogs(
    tokens_root: &Path,
    mode_sets_dir: Option<&Path>,
    components_dir: Option<&Path>,
    fields_dir: Option<&Path>,
    out_path: &Path,
) -> Result<(), CoreError> {
    let graph = TokenGraph::from_json_dir_with_all_catalogs(
        tokens_root,
        mode_sets_dir,
        components_dir,
        fields_dir,
    )?;
    let hash = content_hash(tokens_root, mode_sets_dir, components_dir, fields_dir)
        .map_err(CoreError::Io)?;
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

fn cache_db_path(
    tokens_root: &Path,
    mode_sets_dir: Option<&Path>,
    components_dir: Option<&Path>,
) -> Option<PathBuf> {
    let base = if let Ok(p) = std::env::var("DESIGN_DATA_CACHE_DIR") {
        PathBuf::from(p)
    } else {
        dirs::cache_dir()?.join("design-data")
    };
    // Namespace by absolute dataset + catalog paths so distinct configs get distinct files.
    let abs = tokens_root
        .canonicalize()
        .unwrap_or_else(|_| tokens_root.to_path_buf());
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    abs.to_string_lossy().hash(&mut hasher);
    if let Some(dir) = mode_sets_dir {
        let abs_ms = dir.canonicalize().unwrap_or_else(|_| dir.to_path_buf());
        abs_ms.to_string_lossy().hash(&mut hasher);
    }
    if let Some(dir) = components_dir {
        let abs_c = dir.canonicalize().unwrap_or_else(|_| dir.to_path_buf());
        abs_c.to_string_lossy().hash(&mut hasher);
    }
    let dataset_key = format!("{:016x}", hasher.finish());
    Some(
        base.join("cache")
            .join(EMBEDDED_DATA_VERSION)
            .join(format!("{dataset_key}.redb")),
    )
}

fn hash_json_dir(
    hasher: &mut std::collections::hash_map::DefaultHasher,
    root: &Path,
) -> std::io::Result<()> {
    let mut paths = discover_json_files(root)?;
    paths.sort();
    for p in &paths {
        p.to_string_lossy().hash(hasher);
        let meta = std::fs::metadata(p)?;
        meta.len().hash(hasher);
        if let Ok(modified) = meta.modified() {
            if let Ok(dur) = modified.duration_since(std::time::UNIX_EPOCH) {
                dur.as_nanos().hash(hasher);
            }
        }
    }
    Ok(())
}

/// Content hash of the canonical inputs: per-file `(path, len, mtime)`, sorted.
/// `mtime + len` is used (rather than full content) for speed; a false-positive
/// match is impossible in practice and a false miss only forces a rebuild.
fn content_hash(
    tokens_root: &Path,
    mode_sets_dir: Option<&Path>,
    components_dir: Option<&Path>,
    fields_dir: Option<&Path>,
) -> std::io::Result<u64> {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    CACHE_SCHEMA_VERSION.hash(&mut hasher);
    EMBEDDED_DATA_VERSION.hash(&mut hasher);
    hash_json_dir(&mut hasher, tokens_root)?;
    if let Some(dir) = mode_sets_dir {
        if dir.is_dir() {
            hash_json_dir(&mut hasher, dir)?;
        }
    }
    if let Some(dir) = components_dir {
        if dir.is_dir() {
            hash_json_dir(&mut hasher, dir)?;
        }
    }
    if let Some(dir) = fields_dir {
        if dir.is_dir() {
            hash_json_dir(&mut hasher, dir)?;
        }
    }
    Ok(hasher.finish())
}

// ---------------------------------------------------------------------------
// Read path
// ---------------------------------------------------------------------------

/// Returns `Ok(Some(loaded))` on a fresh cache hit, `Ok(None)` on a miss
/// (absent/stale), or `Err` on a real cache error.
fn load_from_disk(
    tokens_root: &Path,
    mode_sets_dir: Option<&Path>,
    components_dir: Option<&Path>,
) -> Result<Option<CachedDataset>, CacheError> {
    let Some(path) = cache_db_path(tokens_root, mode_sets_dir, components_dir) else {
        return Ok(None);
    };
    if !path.exists() {
        return Ok(None);
    }
    let expected = content_hash(tokens_root, mode_sets_dir, components_dir, None)?;
    let db = Database::open(&path)?;
    let rtx = db.begin_read()?;

    let meta = read_meta(&rtx)?;
    let fresh = meta.is_some_and(|m| {
        m.schema_version == CACHE_SCHEMA_VERSION
            && m.tokens_version == EMBEDDED_DATA_VERSION
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

/// Rebuild the in-memory [`TokenGraph`] from persisted tables. `from_records`
/// rebuilds the UUID index, so the cached `uuid_index` table is not needed here.
fn hydrate(rtx: &redb::ReadTransaction) -> Result<TokenGraph, CacheError> {
    let table = rtx.open_table(TOKENS)?;
    let mut records: Vec<TokenRecord> = Vec::new();
    for item in table.iter()? {
        let (_key, value) = item?;
        let record: TokenRecord = rmp_serde::from_slice(value.value())?;
        records.push(record);
    }
    let mut graph = TokenGraph::from_records(records);
    graph.mode_sets = read_ordinal_table::<ModeSetRecord>(rtx, MODE_SETS)?;
    graph.components = read_ordinal_table::<ComponentRecord>(rtx, COMPONENTS)?;
    graph.fields = read_ordinal_table::<FieldRecord>(rtx, FIELDS)?;
    // Manifest is stored in the META table under "manifest" (schema v3+).
    // Gracefully ignore the key when absent (schema v2 or earlier caches).
    graph.manifest = read_manifest(rtx).unwrap_or(serde_json::Value::Null);
    Ok(graph)
}

/// Read the manifest value from the META table. Returns `None` when the key is absent.
fn read_manifest(rtx: &redb::ReadTransaction) -> Option<serde_json::Value> {
    let table = rtx.open_table(META).ok()?;
    let bytes = table.get("manifest").ok()??;
    rmp_serde::from_slice(bytes.value()).ok()
}

fn read_ordinal_table<T: serde::de::DeserializeOwned>(
    rtx: &redb::ReadTransaction,
    def: TableDefinition<'static, &str, &[u8]>,
) -> Result<Vec<T>, CacheError> {
    let table = match rtx.open_table(def) {
        Ok(t) => t,
        Err(redb::TableError::TableDoesNotExist(_)) => return Ok(Vec::new()),
        Err(e) => return Err(e.into()),
    };
    let mut entries: Vec<(String, T)> = Vec::new();
    for item in table.iter()? {
        let (key, value) = item?;
        let record: T = rmp_serde::from_slice(value.value())?;
        entries.push((key.value().to_string(), record));
    }
    entries.sort_by(|a, b| a.0.cmp(&b.0));
    Ok(entries.into_iter().map(|(_, record)| record).collect())
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

fn write_to_disk(
    tokens_root: &Path,
    mode_sets_dir: Option<&Path>,
    components_dir: Option<&Path>,
    graph: &TokenGraph,
) -> Result<(), CacheError> {
    let path =
        cache_db_path(tokens_root, mode_sets_dir, components_dir).ok_or(CacheError::NoCacheDir)?;
    let hash = content_hash(tokens_root, mode_sets_dir, components_dir, None)?;
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
            tokens_version: EMBEDDED_DATA_VERSION.to_string(),
            content_hash: hash,
        };
        let mut meta_t = wtx.open_table(META)?;
        let bytes = rmp_serde::to_vec(&meta)?;
        meta_t.insert("meta", bytes.as_slice())?;
        // Store manifest alongside the CacheMeta under a separate key.
        let manifest_bytes = rmp_serde::to_vec(&graph.manifest)?;
        meta_t.insert("manifest", manifest_bytes.as_slice())?;
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
    {
        let mut table = wtx.open_table(MODE_SETS)?;
        for (idx, record) in graph.mode_sets.iter().enumerate() {
            let key = format!("{idx:020}");
            let bytes = rmp_serde::to_vec(record)?;
            table.insert(key.as_str(), bytes.as_slice())?;
        }
    }
    {
        let mut table = wtx.open_table(COMPONENTS)?;
        for (idx, record) in graph.components.iter().enumerate() {
            let key = format!("{idx:020}");
            let bytes = rmp_serde::to_vec(record)?;
            table.insert(key.as_str(), bytes.as_slice())?;
        }
    }
    {
        let mut table = wtx.open_table(FIELDS)?;
        for (idx, record) in graph.fields.iter().enumerate() {
            let key = format!("{idx:020}");
            let bytes = rmp_serde::to_vec(record)?;
            table.insert(key.as_str(), bytes.as_slice())?;
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
        let path = cache_db_path(&root, None, None).unwrap();
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
        let hit = load_from_disk(&root, None, None).unwrap();
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
        let path = cache_db_path(&root, None, None).unwrap();
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

    #[test]
    fn inline_mode_set_survives_roundtrip() {
        let _env = crate::data_source::test_support::env_lock();
        let data = TempDir::new().unwrap();
        let cache = TempDir::new().unwrap();
        write_tokens(
            data.path(),
            "tokens.json",
            json!({
                "blue-100": {
                    "$schema": "https://example.com/color.json",
                    "value": "#00f",
                    "uuid": "11111111-1111-4111-8111-111111111111",
                    "name": {"property": "background-color", "component": "button"}
                }
            }),
        );
        write_tokens(
            data.path(),
            "color-scheme.json",
            json!({
                "name": "colorScheme",
                "modes": ["light", "dark"],
                "default": "light"
            }),
        );
        let root = data.path().to_path_buf();
        std::env::set_var("DESIGN_DATA_CACHE_DIR", cache.path());

        let _ = open_cached(&root).unwrap();
        let cached = open_cached(&root).unwrap();
        assert_eq!(cached.mode_sets.len(), 1);
        assert_eq!(cached.mode_sets[0].name, "colorScheme");
        assert_eq!(cached.mode_sets[0].modes, vec!["light", "dark"]);

        std::env::remove_var("DESIGN_DATA_CACHE_DIR");
    }

    #[test]
    fn catalog_mode_sets_and_components_roundtrip() {
        let _env = crate::data_source::test_support::env_lock();
        let data = TempDir::new().unwrap();
        let mode_sets = TempDir::new().unwrap();
        let components = TempDir::new().unwrap();
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
                }
            }),
        );
        write_tokens(
            mode_sets.path(),
            "color-scheme.json",
            json!({
                "name": "colorScheme",
                "modes": ["light", "dark"],
                "default": "light"
            }),
        );
        write_tokens(
            components.path(),
            "button.json",
            json!({
                "name": "button",
                "description": "Primary action"
            }),
        );

        let root = data.path().to_path_buf();
        std::env::set_var("DESIGN_DATA_CACHE_DIR", cache.path());

        let _ = open_cached_with_catalogs(&root, Some(mode_sets.path()), Some(components.path()))
            .unwrap();
        let cached =
            open_cached_with_catalogs(&root, Some(mode_sets.path()), Some(components.path()))
                .unwrap();
        assert_eq!(cached.mode_sets.len(), 1);
        assert_eq!(cached.mode_sets[0].name, "colorScheme");
        assert_eq!(cached.components.len(), 1);
        assert_eq!(cached.components[0].name, "button");

        std::env::remove_var("DESIGN_DATA_CACHE_DIR");
    }

    #[test]
    fn catalog_edit_invalidates_cache() {
        let _env = crate::data_source::test_support::env_lock();
        let data = TempDir::new().unwrap();
        let mode_sets = TempDir::new().unwrap();
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
                }
            }),
        );
        write_tokens(
            mode_sets.path(),
            "color-scheme.json",
            json!({
                "name": "colorScheme",
                "modes": ["light"],
                "default": "light"
            }),
        );

        let root = data.path().to_path_buf();
        std::env::set_var("DESIGN_DATA_CACHE_DIR", cache.path());

        let g1 = open_cached_with_catalogs(&root, Some(mode_sets.path()), None).unwrap();
        assert_eq!(g1.mode_sets[0].modes, vec!["light"]);

        std::thread::sleep(std::time::Duration::from_millis(10));
        write_tokens(
            mode_sets.path(),
            "scale.json",
            json!({
                "name": "scale",
                "modes": ["medium", "large"],
                "default": "medium"
            }),
        );

        let g2 = open_cached_with_catalogs(&root, Some(mode_sets.path()), None).unwrap();
        assert_eq!(g2.mode_sets.len(), 2);

        std::env::remove_var("DESIGN_DATA_CACHE_DIR");
    }

    #[test]
    fn stale_v1_cache_is_treated_as_miss() {
        let _env = crate::data_source::test_support::env_lock();
        let (_data, cache, root) = fixture();
        std::env::set_var("DESIGN_DATA_CACHE_DIR", cache.path());

        let _ = open_cached(&root).unwrap();
        let path = cache_db_path(&root, None, None).unwrap();

        {
            let db = Database::open(&path).unwrap();
            let wtx = db.begin_write().unwrap();
            {
                let mut meta_t = wtx.open_table(META).unwrap();
                let meta_bytes = meta_t.get("meta").unwrap().unwrap().value().to_vec();
                let mut meta: CacheMeta = rmp_serde::from_slice(&meta_bytes).unwrap();
                meta.schema_version = 1;
                let bytes = rmp_serde::to_vec(&meta).unwrap();
                meta_t.insert("meta", bytes.as_slice()).unwrap();
            }
            wtx.commit().unwrap();
        }

        let hit = load_from_disk(&root, None, None).unwrap();
        assert!(hit.is_none(), "v1 schema_version must invalidate cache");

        let g = open_cached(&root).unwrap();
        assert_eq!(g.tokens.len(), 2);

        std::env::remove_var("DESIGN_DATA_CACHE_DIR");
    }

    #[test]
    fn fields_and_manifest_survive_blob_roundtrip() {
        use std::io::Write;
        use tempfile::TempDir;

        let data = TempDir::new().unwrap();
        let fields_dir = TempDir::new().unwrap();

        // Write a minimal tokens file.
        write_tokens(
            data.path(),
            "color.json",
            json!({
                "blue-100": {
                    "value": "#00f",
                    "uuid": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                    "name": {"property": "background-color"}
                }
            }),
        );

        // Write a manifest.json alongside the tokens.
        let manifest_val = json!({ "platform": "test", "version": "1.0" });
        std::fs::write(
            data.path().join("manifest.json"),
            serde_json::to_string(&manifest_val).unwrap(),
        )
        .unwrap();

        // Write two field JSON files.
        {
            let mut f = std::fs::File::create(fields_dir.path().join("alignment.json")).unwrap();
            write!(
                f,
                r#"{{"name":"alignment","required":false,"description":"Alignment axis"}}"#
            )
            .unwrap();
        }
        {
            let mut f = std::fs::File::create(fields_dir.path().join("component.json")).unwrap();
            write!(f, r#"{{"name":"component","required":true}}"#).unwrap();
        }

        let bytes = build_bytes_with_all_catalogs(data.path(), None, None, Some(fields_dir.path()))
            .unwrap();
        assert!(!bytes.is_empty());

        let graph = load_from_bytes(&bytes).unwrap();

        // Manifest must survive the round-trip.
        assert!(
            !graph.manifest.is_null(),
            "manifest should be non-null after round-trip"
        );
        assert_eq!(
            graph.manifest["platform"].as_str(),
            Some("test"),
            "manifest.platform should survive round-trip"
        );

        // Fields must survive, sorted by name.
        assert_eq!(
            graph.fields.len(),
            2,
            "both fields should survive round-trip"
        );
        assert_eq!(graph.fields[0].name, "alignment");
        assert_eq!(graph.fields[0].required, false);
        assert_eq!(
            graph.fields[0].description.as_deref(),
            Some("Alignment axis")
        );
        assert_eq!(graph.fields[1].name, "component");
        assert_eq!(graph.fields[1].required, true);
    }
}
