// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Platform manifest application for the Foundation→Platform cascade.
//!
//! Reads a Layer 2 platform `manifest.json` declared in `.design-data.toml`
//! (top-level `manifest` key), optionally validates it against `manifest.schema.json`,
//! and applies it to a [`TokenGraph`] via
//! [`TokenGraph::apply_platform_manifest`](crate::graph::TokenGraph::apply_platform_manifest).

use std::collections::HashMap;
use std::path::{Component, Path, PathBuf};

use serde_json::{Map, Value};

use crate::data_source::{ResolvedData, SourceConfig};
use crate::discovery::discover_json_files;
use crate::graph::TokenGraph;
use crate::schema::SchemaRegistry;
use crate::CoreError;

/// Category subdirectories concatenated verbatim (sorted path order) into the
/// merged `extensions` object, keyed by directory name → manifest JSON key →
/// the object schema each entry is validated against (see
/// [`FragmentValidation::Item`]) — this is what stops an entry missing e.g.
/// "name" from silently vanishing in `apply_platform_manifest`'s own
/// `let Some(name) = ... else { continue }`, by failing loudly here instead.
/// `tokens/`, `relationships/`, and `mode-sets/` have their own handling below
/// and aren't here.
const CONCAT_CATEGORIES: &[(&str, &str, &str)] = &[
    ("components", "components", "component.schema.json"),
    ("fields", "fields", "field.schema.json"),
    ("guidelines", "guidelines", "guideline.schema.json"),
    (
        "platform-extensions",
        "platformExtensions",
        "platform-extension.json",
    ),
    (
        "implementations",
        "implementations",
        "implementation-mapping.schema.json",
    ),
];

/// Locate `packages/design-data-spec/schemas/manifest.schema.json` by walking up
/// from `schemas_root`.
pub fn locate_manifest_schema(schemas_root: &Path) -> Option<PathBuf> {
    schemas_root.ancestors().find_map(|p| {
        let candidate = p.join("packages/design-data-spec/schemas/manifest.schema.json");
        candidate.is_file().then_some(candidate)
    })
}

/// Locate `packages/design-data/registry/platform-implementations.json` by walking
/// up from `schemas_root` — the registry of known platform-manifest implementation
/// ids (see `spec/manifest.md#identity-fields`), distinct from the token-level
/// `platforms.json` device-target registry.
fn locate_platform_implementations_registry(schemas_root: &Path) -> Option<PathBuf> {
    schemas_root.ancestors().find_map(|p| {
        let candidate = p.join("packages/design-data/registry/platform-implementations.json");
        candidate.is_file().then_some(candidate)
    })
}

/// Who a configured platform manifest is: its `platform` id and a display name
/// (registry label, else `platformVersion`, else the id).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlatformIdentity {
    pub id: String,
    pub name: String,
}

/// The identity of the configured platform manifest, or `None` when no manifest is
/// configured. A manifest without a `platform` field is identified by its directory name.
pub fn platform_identity(resolved: &ResolvedData) -> Result<Option<PlatformIdentity>, CoreError> {
    let Some(path) = resolved.platform_manifest.as_ref() else {
        return Ok(None);
    };
    let manifest: Value = serde_json::from_str(&std::fs::read_to_string(path).map_err(|e| {
        CoreError::ParseError(format!(
            "failed to read platform manifest {}: {e}",
            path.display()
        ))
    })?)
    .map_err(|e| {
        CoreError::ParseError(format!(
            "failed to parse platform manifest {}: {e}",
            path.display()
        ))
    })?;
    let id = manifest
        .get("platform")
        .and_then(Value::as_str)
        .map(str::to_string)
        .or_else(|| {
            path.parent()
                .and_then(Path::file_name)
                .map(|n| n.to_string_lossy().into_owned())
        })
        .unwrap_or_else(|| "platform".to_string());
    let label = locate_platform_implementations_registry(&resolved.schemas_root)
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|t| serde_json::from_str::<Value>(&t).ok())
        .and_then(|r| {
            r.get("values")?
                .as_array()?
                .iter()
                .find(|v| v.get("id").and_then(Value::as_str) == Some(id.as_str()))?
                .get("label")?
                .as_str()
                .map(str::to_string)
        });
    let name = label
        .or_else(|| {
            manifest
                .get("platformVersion")
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .unwrap_or_else(|| id.clone());
    Ok(Some(PlatformIdentity { id, name }))
}

/// Check a manifest's optional `platform` field against the
/// platform-implementations registry, returning an advisory message when the id
/// isn't recognized. `platform` is a SHOULD, not a MUST (`manifest.schema.json`
/// places no `enum` constraint on it) — an unrecognized id is not a schema
/// violation, just something the caller may want to surface to the platform team
/// (e.g. `validate-manifest`'s pretty output, or `platform show`).
///
/// Returns `Ok(None)` when `platform` is absent, or present and recognized.
/// Returns `Err` only for I/O/parse failures reading the registry file — a
/// missing/malformed registry does not fail the manifest.
pub fn check_platform_identity(
    manifest: &Value,
    schemas_root: &Path,
) -> Result<Option<String>, CoreError> {
    let Some(platform) = manifest.get("platform").and_then(|v| v.as_str()) else {
        return Ok(None);
    };
    let Some(registry_path) = locate_platform_implementations_registry(schemas_root) else {
        return Ok(None);
    };
    let text = std::fs::read_to_string(&registry_path).map_err(|e| {
        CoreError::ParseError(format!(
            "failed to read platform-implementations registry {}: {e}",
            registry_path.display()
        ))
    })?;
    let registry: Value = serde_json::from_str(&text).map_err(|e| {
        CoreError::ParseError(format!(
            "failed to parse platform-implementations registry {}: {e}",
            registry_path.display()
        ))
    })?;
    let known = registry
        .get("values")
        .and_then(|v| v.as_array())
        .map(|values| {
            values
                .iter()
                .filter_map(|v| v.get("id").and_then(|id| id.as_str()))
                .any(|id| id == platform)
        })
        .unwrap_or(false);
    if known {
        Ok(None)
    } else {
        Ok(Some(format!(
            "manifest declares platform \"{platform}\" which is not in the \
             platform-implementations registry ({}) — this is advisory only, not a \
             validation failure",
            registry_path.display()
        )))
    }
}

/// Read a platform manifest.json's optional `formatting` block
/// (`manifest.schema.json#/properties/formatting`) as a
/// [`crate::naming::FormattingConfig`], for callers (e.g. `figma export
/// --code-syntax-manifest`) that only need per-platform token-name
/// serialization rules, not the full include/exclude/overrides cascade.
/// Returns `Ok(None)` when the manifest has no `formatting` block.
pub fn load_formatting_config(
    manifest_path: &Path,
) -> Result<Option<crate::naming::FormattingConfig>, CoreError> {
    let text = std::fs::read_to_string(manifest_path).map_err(|e| {
        CoreError::ParseError(format!(
            "failed to read platform manifest {}: {e}",
            manifest_path.display()
        ))
    })?;
    let manifest: Value = serde_json::from_str(&text).map_err(|e| {
        CoreError::ParseError(format!(
            "failed to parse platform manifest {}: {e}",
            manifest_path.display()
        ))
    })?;
    let Some(formatting) = manifest.get("formatting") else {
        return Ok(None);
    };
    let config = serde_json::from_value(formatting.clone()).map_err(|e| {
        CoreError::ParseError(format!(
            "platform manifest {} has an invalid `formatting` block: {e}",
            manifest_path.display()
        ))
    })?;
    Ok(Some(config))
}

/// Load the platform manifest declared in `.design-data.toml`, Layer 1 validated, with its
/// `extensions/` directory merged in under `extensions` (the document
/// [`TokenGraph::apply_platform_manifest`] expects). `None` when no manifest is configured.
pub fn load_configured_manifest(resolved: &ResolvedData) -> Result<Option<Value>, CoreError> {
    let Some(manifest_path) = resolved.platform_manifest.as_ref() else {
        return Ok(None);
    };
    let text = std::fs::read_to_string(manifest_path).map_err(|e| {
        CoreError::ParseError(format!(
            "failed to read platform manifest {}: {e}",
            manifest_path.display()
        ))
    })?;
    let mut manifest: serde_json::Value = serde_json::from_str(&text).map_err(|e| {
        CoreError::ParseError(format!(
            "failed to parse platform manifest {}: {e}",
            manifest_path.display()
        ))
    })?;

    let schema_path = locate_manifest_schema(&resolved.schemas_root).ok_or_else(|| {
        CoreError::ParseError(format!(
            "platform manifest {} is configured but manifest.schema.json could not be \
             located under {} — Layer 1 validation cannot run",
            manifest_path.display(),
            resolved.schemas_root.display()
        ))
    })?;
    let errors = SchemaRegistry::validate_manifest(&manifest, &schema_path)?;
    if !errors.is_empty() {
        return Err(CoreError::ParseError(format!(
            "platform manifest {} failed Layer 1 schema validation:\n  {}",
            manifest_path.display(),
            errors.join("\n  ")
        )));
    }

    // Layer 2's `extensions/` directory (spec/manifest.md#extensions-directory) is
    // glob+merged into the same `extensions` object shape the schema used to allow
    // inline, then spliced in post-validation — the manifest.json on disk no longer
    // carries `extensions` at all under the 26.1 schema, so validation above runs
    // clean, and `apply_platform_manifest` below is none the wiser.
    // manifest.schema.json's parent dir is the spec schemas/ dir, holding every
    // category schema fragments are validated against below.
    let schema_dir = schema_path
        .parent()
        .expect("schema_path is a file path, always has a parent");
    if let Some(ext) = build_extensions_value(manifest_path, &manifest, schema_dir)? {
        manifest
            .as_object_mut()
            .expect("manifest.json root is a JSON object (enforced by Layer 1 schema)")
            .insert("extensions".to_string(), ext);
    }

    Ok(Some(manifest))
}

/// Apply the Layer 2 platform manifest declared in `.design-data.toml`
/// (top-level `manifest` key) to `graph`, returning mode-set restrictions to feed
/// into a [`ResolutionContext`](crate::cascade::ResolutionContext).
///
/// A no-op (empty map) when no manifest is configured. When the spec's
/// `manifest.schema.json` is locatable, the manifest is first validated (Layer 1);
/// schema violations return an error.
pub fn apply_configured(
    graph: &mut TokenGraph,
    resolved: &ResolvedData,
) -> Result<HashMap<String, Vec<String>>, CoreError> {
    let Some(manifest) = load_configured_manifest(resolved)? else {
        return Ok(HashMap::new());
    };
    // Platform relationship `override`/`remove` target foundation records by uuid, so
    // the foundation set must be loaded first. Callers that already loaded it are skipped.
    if graph.relationships.is_empty() {
        if let Some(dir) = resolved.relationships.as_deref() {
            let rels = TokenGraph::load_spec_relationships(dir)?;
            *graph = std::mem::take(graph).with_relationships(rels);
        }
    }
    // The manifest file is known here and not inside `apply_platform_manifest`, so name it
    // when a relationship the manifest adds or overrides has a shape this engine refuses.
    if let Some(why) = unsupported_manifest_relationship(&manifest) {
        let file = resolved
            .platform_manifest
            .as_ref()
            .map_or_else(String::new, |p| format!(" {}", p.display()));
        return Err(CoreError::ParseError(format!(
            "platform manifest{file}: {why}"
        )));
    }
    let outcome = graph.apply_platform_manifest(&manifest)?;
    Ok(outcome.mode_set_restrictions)
}

/// The first relationship a manifest adds or overrides whose `scope.options` this engine
/// cannot read, as a message that names the entry. A `remove` entry has no scope.
fn unsupported_manifest_relationship(manifest: &Value) -> Option<String> {
    let entries = manifest
        .pointer("/extensions/relationships")
        .and_then(Value::as_array)?;
    entries.iter().enumerate().find_map(|(index, entry)| {
        let raw = match entry.get("op").and_then(Value::as_str) {
            None => Some(entry),
            Some("override") => entry.get("value"),
            _ => None,
        }?;
        crate::graph::unsupported_scope_shape(raw)
            .map(|why| format!("extensions.relationships entry {index}: {why}"))
    })
}

/// Glob+merge the Layer 2 manifest's `extensions/` directory (default name
/// `"extensions"`, overridable via the manifest's `extensionsDir` field) into the
/// merged `extensions` `Value` [`TokenGraph::apply_platform_manifest`] expects.
///
/// Returns `Ok(None)` when the directory doesn't exist (or exists but every
/// category subdirectory is missing/empty) — this is not an error; a platform
/// with no extensions simply omits the directory.
///
/// See `packages/design-data-spec/spec/manifest.md#extensions-directory` for the
/// normative discovery/merge/precedence rules this implements.
fn build_extensions_value(
    manifest_path: &Path,
    manifest: &Value,
    schema_dir: &Path,
) -> Result<Option<Value>, CoreError> {
    let dir_name = manifest
        .get("extensionsDir")
        .and_then(|v| v.as_str())
        .unwrap_or("extensions");
    if Path::new(dir_name).is_absolute()
        || Path::new(dir_name)
            .components()
            .any(|c| matches!(c, Component::ParentDir))
    {
        return Err(CoreError::ParseError(format!(
            "manifest extensionsDir \"{dir_name}\" must be a relative path inside the \
             platform directory (no absolute paths or \"..\" components)"
        )));
    }
    let ext_root = manifest_path
        .parent()
        .map_or_else(|| PathBuf::from(dir_name), |p| p.join(dir_name));
    if !ext_root.is_dir() {
        return Ok(None);
    }

    // "tokens", "relationships", and "mode-sets" have their own handling below
    // (not in CONCAT_CATEGORIES); every other recognized subdirectory is one of
    // CONCAT_CATEGORIES's entries, so derive the allowlist from there rather
    // than duplicating the category list a second time.
    let known_subdirs: Vec<&str> = std::iter::once("tokens")
        .chain(CONCAT_CATEGORIES.iter().map(|(dir_name, _, _)| *dir_name))
        .chain(std::iter::once("relationships"))
        .chain(std::iter::once("mode-sets"))
        .chain(std::iter::once("visuals"))
        .collect();
    for entry in std::fs::read_dir(&ext_root)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_dir() {
            // Tolerate stray non-directory files (.DS_Store, README.md, ...).
            continue;
        }
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if !known_subdirs.contains(&name.as_ref()) {
            return Err(CoreError::ParseError(format!(
                "extensions directory {} contains an unrecognized subdirectory \"{name}\" — \
                 expected one of: {}",
                ext_root.display(),
                known_subdirs.join(", ")
            )));
        }
    }

    let mut out = Map::new();

    // tokens/ — *.tokens.json cascade-format files, concatenated in sorted path
    // order into one array (cascade token files are themselves top-level arrays,
    // which is exactly what `apply_platform_manifest` reads for `extensions.tokens`).
    let tokens_dir = ext_root.join("tokens");
    if tokens_dir.is_dir() {
        let files: Vec<PathBuf> = discover_json_files(&tokens_dir)?
            .into_iter()
            .filter(|p| p.to_string_lossy().ends_with(".tokens.json"))
            .collect();
        let tokens = load_and_concat(
            &files,
            FragmentValidation::TokenFile(&schema_dir.join("cascade-file.schema.json")),
        )?;
        if !tokens.is_empty() {
            out.insert("tokens".to_string(), Value::Array(tokens));
        }
    }

    // components/, fields/, guidelines/, platform-extensions/, implementations/ — one artifact per
    // file (though a file holding an array of several is tolerated too), all files
    // in the subdirectory concatenated in sorted path order.
    for (dir_name, key, schema_file) in CONCAT_CATEGORIES {
        let dir = ext_root.join(dir_name);
        if !dir.is_dir() {
            continue;
        }
        let items = load_and_concat(
            &discover_json_files(&dir)?,
            FragmentValidation::Item(&schema_dir.join(schema_file)),
        )?;
        if !items.is_empty() {
            out.insert((*key).to_string(), Value::Array(items));
        }
    }

    // relationships/ — plain adds (no "op") must precede override/remove ops, so
    // that an override/remove in a later-sorted file can still target an add from
    // an earlier one; `apply_platform_manifest` processes this array strictly in
    // order. Partition is stable: within each group, sorted-path order is kept.
    let rel_dir = ext_root.join("relationships");
    if rel_dir.is_dir() {
        let items = load_and_concat(
            &discover_json_files(&rel_dir)?,
            FragmentValidation::RelationshipAdds(&schema_dir.join("relationship.schema.json")),
        )?;
        if !items.is_empty() {
            let (mut adds, ops): (Vec<Value>, Vec<Value>) =
                items.into_iter().partition(|v| v.get("op").is_none());
            adds.extend(ops);
            out.insert("relationships".to_string(), Value::Array(adds));
        }
    }

    // mode-sets/ — plain adds (no "op") must precede addMode/removeMode/
    // setDefault/remove ops, so that an op in a later-sorted file can still
    // target an add from an earlier one; `apply_platform_manifest` processes
    // this array strictly in order. Partition is stable: within each group,
    // sorted-path order is kept.
    let mode_sets_dir = ext_root.join("mode-sets");
    if mode_sets_dir.is_dir() {
        let items = load_and_concat(
            &discover_json_files(&mode_sets_dir)?,
            FragmentValidation::ModeSetAdds(&schema_dir.join("mode-set.schema.json")),
        )?;
        if !items.is_empty() {
            let (mut adds, ops): (Vec<Value>, Vec<Value>) =
                items.into_iter().partition(|v| v.get("op").is_none());
            adds.extend(ops);
            out.insert("modeSets".to_string(), Value::Array(adds));
        }
    }

    // visuals/ — one recipe per file, named <component>.json. Each entry keeps its
    // fragment path so `VisualRecord.file` can point at it.
    let visuals_dir = ext_root.join("visuals");
    if visuals_dir.is_dir() {
        let schema = schema_dir.join("component-visual.schema.json");
        let mut items = Vec::new();
        for f in discover_json_files(&visuals_dir)? {
            let text = std::fs::read_to_string(&f).map_err(|e| {
                CoreError::ParseError(format!(
                    "failed to read extension fragment {}: {e}",
                    f.display()
                ))
            })?;
            let recipe: Value = serde_json::from_str(&text).map_err(|e| {
                CoreError::ParseError(format!(
                    "failed to parse extension fragment {}: {e}",
                    f.display()
                ))
            })?;
            check_fragment(&f, &recipe, &schema)?;
            let stem = f.file_stem().and_then(|s| s.to_str()).unwrap_or_default();
            if recipe.get("component").and_then(|v| v.as_str()) != Some(stem) {
                return Err(CoreError::ParseError(format!(
                    "extension fragment {} has component {} but its file name must be \
                     <component>.json",
                    f.display(),
                    recipe.get("component").unwrap_or(&Value::Null)
                )));
            }
            items.push(serde_json::json!({ "file": f.to_string_lossy(), "recipe": recipe }));
        }
        if !items.is_empty() {
            out.insert("visuals".to_string(), Value::Array(items));
        }
    }

    Ok((!out.is_empty()).then_some(Value::Object(out)))
}

/// How a fragment file (or the entries flattened out of it) is schema-validated
/// during [`load_and_concat`]. Each variant names the schema file to validate
/// against; the difference is *what* value gets validated.
enum FragmentValidation<'a> {
    /// `tokens/*.tokens.json`: the whole parsed file is itself the cascade array
    /// `cascade-file.schema.json` describes — validated before flattening.
    TokenFile(&'a Path),
    /// `components/`, `fields/`, `guidelines/`, `platform-extensions/`, `implementations/`: each
    /// flattened entry is one object validated against the category schema.
    Item(&'a Path),
    /// `relationships/`: each flattened entry *without* an `"op"` key (a plain
    /// add) is validated against `relationship.schema.json`. Entries with `"op"`
    /// (override/remove) have no schema of their own — `relationship.schema.json`
    /// only models plain add/ref shapes — and are left to
    /// `apply_platform_manifest`'s own override/remove structural checks.
    RelationshipAdds(&'a Path),
    /// `mode-sets/`: each flattened entry *without* an `"op"` key (a plain
    /// whole-set add/replace) is validated against `mode-set.schema.json`.
    /// Entries with `"op"` (`addMode`/`removeMode`/`setDefault`/`remove`) have
    /// no schema of their own and are left to `apply_platform_manifest`'s own
    /// op-specific structural checks.
    ModeSetAdds(&'a Path),
}

/// Read and parse each file in `files`, flattening top-level arrays (cascade
/// token files, or a fragment file holding several entries) and pushing bare
/// objects as-is, preserving `files`' order throughout. `validation` determines
/// which values get checked against which category schema (see
/// [`FragmentValidation`]) via
/// [`SchemaRegistry::validate_value_against_schema_file`]; a violation fails
/// loudly here — naming both the offending file and the schema errors — rather
/// than silently vanishing in `apply_platform_manifest`'s own add-or-replace
/// lookups.
fn load_and_concat(
    files: &[PathBuf],
    validation: FragmentValidation<'_>,
) -> Result<Vec<Value>, CoreError> {
    let mut out = Vec::new();
    for f in files {
        let text = std::fs::read_to_string(f).map_err(|e| {
            CoreError::ParseError(format!(
                "failed to read extension fragment {}: {e}",
                f.display()
            ))
        })?;
        let val: Value = serde_json::from_str(&text).map_err(|e| {
            CoreError::ParseError(format!(
                "failed to parse extension fragment {}: {e}",
                f.display()
            ))
        })?;

        if let FragmentValidation::TokenFile(schema) = validation {
            check_fragment(f, &val, schema)?;
        }

        let items: Vec<Value> = match val {
            Value::Array(items) => items,
            other => vec![other],
        };

        match validation {
            FragmentValidation::Item(schema) => {
                for item in &items {
                    check_fragment(f, item, schema)?;
                }
            }
            FragmentValidation::RelationshipAdds(schema) => {
                // relationship.schema.json's top level is an *array* of entries
                // (its item def lives at `$defs/relationship`, not reachable as
                // its own schema file), so each plain-add entry is validated by
                // wrapping it in a single-element array.
                for item in &items {
                    if item.get("op").is_none() {
                        check_fragment(f, &Value::Array(vec![item.clone()]), schema)?;
                    }
                }
            }
            FragmentValidation::ModeSetAdds(schema) => {
                // mode-set.schema.json's top level is a single object (unlike
                // relationship.schema.json), so each plain-add entry validates
                // directly, unwrapped.
                for item in &items {
                    if item.get("op").is_none() {
                        check_fragment(f, item, schema)?;
                    }
                }
            }
            FragmentValidation::TokenFile(_) => {} // already validated above
        }

        out.extend(items);
    }
    Ok(out)
}

/// Validate `value` (a whole fragment file, or one entry flattened out of it)
/// against `schema_path`, returning a [`CoreError::ParseError`] naming `file`
/// and every schema violation when invalid.
fn check_fragment(file: &Path, value: &Value, schema_path: &Path) -> Result<(), CoreError> {
    let errors = SchemaRegistry::validate_value_against_schema_file(value, schema_path)?;
    if errors.is_empty() {
        return Ok(());
    }
    Err(CoreError::ParseError(format!(
        "extension fragment {} failed schema validation ({}):\n  {}",
        file.display(),
        schema_path.file_name().map_or_else(
            || schema_path.display().to_string(),
            |n| n.to_string_lossy().into_owned()
        ),
        errors.join("\n  ")
    )))
}

/// Component and guideline catalogs after the configured platform manifest
/// (if any) has been applied. Entries are sorted by name.
#[derive(Debug, Clone, Default)]
pub struct MergedCatalogs {
    pub components: Vec<(String, Value)>,
    /// `(name, document, from_platform)`; `from_platform` marks documents
    /// contributed by the platform manifest rather than the foundation catalog.
    pub guidelines: Vec<(String, Value, bool)>,
}

/// Load the foundation component and guideline catalogs and apply the
/// platform manifest from `resolved` through the same cascade as `resolve`
/// and `query`. With no platform manifest the result is the foundation
/// catalogs unchanged.
pub fn load_merged_catalogs(resolved: &ResolvedData) -> Result<MergedCatalogs, CoreError> {
    let mut graph = TokenGraph::from_json_dir_with_catalogs(
        &resolved.tokens_root,
        resolved.mode_sets.as_deref(),
        resolved.components.as_deref(),
    )?;
    if let Some(dir) = resolved.guidelines.as_deref().filter(|d| d.is_dir()) {
        graph.guidelines = TokenGraph::load_spec_guidelines(dir)?;
    }
    apply_configured(&mut graph, resolved)?;

    let mut components: Vec<(String, Value)> = graph
        .components
        .into_iter()
        .map(|c| (c.name, c.raw))
        .collect();
    components.sort_by(|a, b| a.0.cmp(&b.0));
    let mut guidelines: Vec<(String, Value, bool)> = graph
        .guidelines
        .into_iter()
        .map(|g| {
            let from_platform = g.file == Path::new("manifest.json");
            (g.name, g.raw, from_platform)
        })
        .collect();
    guidelines.sort_by(|a, b| a.0.cmp(&b.0));
    Ok(MergedCatalogs {
        components,
        guidelines,
    })
}

/// Whether a manifest's `foundationVersion` and the project's `[source]` pin name the same
/// release (the pin is written twice: GH #1741).
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(tag = "status", rename_all = "kebab-case")]
pub enum PinCheck {
    /// Both name this release.
    Agree { version: String },
    /// They name different releases.
    Mismatch { manifest: String, source: String },
    /// The source cannot be compared (a sha, branch or git ref, or a version that is not exact).
    Unverifiable { reason: String },
    /// Nothing to compare: no manifest pin, or a `path` or embedded dataset.
    Skipped { reason: String },
}

/// `@adobe/spectrum-design-data@3.15.1` and `3.15.1` both name release `3.15.1`.
pub fn bare_version(pin: &str) -> &str {
    pin.rsplit_once('@').map_or(pin, |(_, v)| v).trim()
}

/// The exact version a pin names (`@adobe/spectrum-design-data@3.15.1` or `3.15.1`), if it is one.
pub fn exact_version(pin: &str) -> Option<semver::Version> {
    semver::Version::parse(bare_version(pin)).ok()
}

/// The package a pin names, if it says: `@adobe/spectrum-design-data` for
/// `@adobe/spectrum-design-data@3.15.1`, nothing for `3.15.1`.
fn pin_package(pin: &str) -> Option<&str> {
    pin.rsplit_once('@')
        .map(|(pkg, _)| pkg.trim())
        .filter(|pkg| !pkg.is_empty())
}

/// Compare the manifest's `foundationVersion` with the `[source]` the project resolves.
///
/// A github `tag` and an npm `version` are compared once the package prefix is stripped from both.
pub fn check_foundation_pin(manifest_pin: Option<&str>, source: Option<&SourceConfig>) -> PinCheck {
    let skipped = |reason: &str| PinCheck::Skipped {
        reason: reason.to_string(),
    };
    let Some(manifest_pin) = manifest_pin else {
        return skipped("the manifest declares no `foundationVersion`");
    };
    let source_pin = match source {
        None => return skipped("no `[source]` pin: the project uses the embedded dataset"),
        Some(SourceConfig::Path { .. }) => {
            return skipped("the `[source]` is a local path, not a release pin")
        }
        Some(SourceConfig::Github { tag: Some(tag), .. }) => tag.as_str(),
        Some(SourceConfig::Npm { version, .. }) => version.as_str(),
        Some(SourceConfig::Github { .. } | SourceConfig::Git { .. }) => {
            return PinCheck::Unverifiable {
                reason: "the `[source]` is pinned by sha, branch or git ref, not a release".into(),
            }
        }
    };
    let (manifest, source) = (bare_version(manifest_pin), bare_version(source_pin));
    if semver::Version::parse(manifest).is_err() || semver::Version::parse(source).is_err() {
        return PinCheck::Unverifiable {
            reason: format!(
                "`foundationVersion` '{manifest_pin}' or the `[source]` pin '{source_pin}' is not an exact version"
            ),
        };
    }
    // Two pins that name different packages are not the same release even at one version.
    if let (Some(a), Some(b)) = (pin_package(manifest_pin), pin_package(source_pin)) {
        if a != b {
            return PinCheck::Mismatch {
                manifest: manifest_pin.trim().to_string(),
                source: source_pin.trim().to_string(),
            };
        }
    }
    // Build metadata (`3.15.1+meta`) does not make a different release: compare by precedence.
    let same = match (
        semver::Version::parse(manifest),
        semver::Version::parse(source),
    ) {
        (Ok(a), Ok(b)) => a.cmp_precedence(&b) == std::cmp::Ordering::Equal,
        _ => manifest == source,
    };
    if same {
        PinCheck::Agree {
            version: manifest.to_string(),
        }
    } else {
        PinCheck::Mismatch {
            manifest: manifest.to_string(),
            source: source.to_string(),
        }
    }
}

/// A manifest extension that replaces a foundation artifact of the same name, instead of adding
/// one. Replacing is allowed (it is how a platform owns a recipe), but it is also the sign of
/// something the foundation might adopt, so `platform doctor` lists them.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct Shadow {
    /// `components`, `visuals`, `fields` or `guidelines`: the extension categories that
    /// add-or-replace by name.
    pub category: &'static str,
    pub name: String,
}

/// The extension entries in `manifest` whose name is already in `foundation` (the graph loaded
/// without the manifest applied).
pub fn shadowed_artifacts(foundation: &TokenGraph, manifest: &Value) -> Vec<Shadow> {
    fn entries<'a>(manifest: &'a Value, category: &str) -> impl Iterator<Item = &'a Value> {
        manifest
            .get("extensions")
            .and_then(|e| e.get(category))
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
    }
    let mut out = Vec::new();
    let mut check = |category: &'static str, name: Option<&str>, known: &[&String]| {
        if let Some(name) = name.filter(|n| known.iter().any(|k| k.as_str() == *n)) {
            out.push(Shadow {
                category,
                name: name.to_string(),
            });
        }
    };
    let components: Vec<&String> = foundation.components.iter().map(|c| &c.name).collect();
    let visuals: Vec<&String> = foundation.visuals.iter().map(|v| &v.component).collect();
    let fields: Vec<&String> = foundation.fields.iter().map(|f| &f.name).collect();
    let guidelines: Vec<&String> = foundation.guidelines.iter().map(|g| &g.name).collect();
    for e in entries(manifest, "components") {
        check(
            "components",
            e.get("name").and_then(Value::as_str),
            &components,
        );
    }
    for e in entries(manifest, "visuals") {
        check(
            "visuals",
            e.pointer("/recipe/component").and_then(Value::as_str),
            &visuals,
        );
    }
    for e in entries(manifest, "fields") {
        check("fields", e.get("name").and_then(Value::as_str), &fields);
    }
    for e in entries(manifest, "guidelines") {
        check(
            "guidelines",
            e.get("name").and_then(Value::as_str),
            &guidelines,
        );
    }
    out
}

#[cfg(test)]
mod tests {
    #[test]
    fn pins_agree_with_or_without_the_package_prefix() {
        let tag = gh(Some("@adobe/spectrum-design-data@3.15.1"));
        for manifest in ["@adobe/spectrum-design-data@3.15.1", "3.15.1"] {
            assert_eq!(
                check_foundation_pin(Some(manifest), Some(&tag)),
                PinCheck::Agree {
                    version: "3.15.1".into()
                },
                "{manifest}"
            );
        }
        assert_eq!(
            check_foundation_pin(
                Some("@adobe/spectrum-design-data@3.15.1"),
                Some(&gh(Some("3.15.1")))
            ),
            PinCheck::Agree {
                version: "3.15.1".into()
            }
        );
    }

    #[test]
    fn different_pins_are_a_mismatch() {
        let tag = gh(Some("@adobe/spectrum-design-data@3.10.0"));
        assert_eq!(
            check_foundation_pin(Some("@adobe/spectrum-design-data@3.9.0"), Some(&tag)),
            PinCheck::Mismatch {
                manifest: "3.9.0".into(),
                source: "3.10.0".into()
            }
        );
    }

    #[test]
    fn a_source_that_is_not_a_release_pin_is_not_compared() {
        let manifest = Some("@adobe/spectrum-design-data@3.9.0");
        assert!(matches!(
            check_foundation_pin(manifest, None),
            PinCheck::Skipped { .. }
        ));
        let path = SourceConfig::Path {
            root: "../x".into(),
        };
        assert!(matches!(
            check_foundation_pin(manifest, Some(&path)),
            PinCheck::Skipped { .. }
        ));
        assert!(matches!(
            check_foundation_pin(manifest, Some(&gh(None))),
            PinCheck::Unverifiable { .. }
        ));
        assert!(matches!(
            check_foundation_pin(None, Some(&gh(Some("3.9.0")))),
            PinCheck::Skipped { .. }
        ));
    }

    #[test]
    fn a_version_that_is_not_exact_is_unverifiable() {
        let tag = gh(Some("@adobe/spectrum-design-data@3.15.1"));
        assert!(matches!(
            check_foundation_pin(Some("^3.15.0"), Some(&tag)),
            PinCheck::Unverifiable { .. }
        ));
        assert!(matches!(
            check_foundation_pin(Some("latest"), Some(&tag)),
            PinCheck::Unverifiable { .. }
        ));
    }

    #[test]
    fn pins_for_different_packages_never_agree() {
        let tag = gh(Some("@adobe/spectrum-design-data@3.15.1"));
        assert!(matches!(
            check_foundation_pin(Some("@other/pkg@3.15.1"), Some(&tag)),
            PinCheck::Mismatch { .. }
        ));
    }

    #[test]
    fn build_metadata_does_not_make_a_different_release() {
        let tag = gh(Some("@adobe/spectrum-design-data@3.15.1+abc"));
        assert_eq!(
            check_foundation_pin(Some("3.15.1"), Some(&tag)),
            PinCheck::Agree {
                version: "3.15.1".into()
            }
        );
    }

    #[test]
    fn an_npm_version_is_compared() {
        let npm = SourceConfig::Npm {
            package: None,
            version: "3.15.1".into(),
        };
        assert_eq!(
            check_foundation_pin(Some("@adobe/spectrum-design-data@3.15.1"), Some(&npm)),
            PinCheck::Agree {
                version: "3.15.1".into()
            }
        );
    }

    use super::*;

    #[test]
    fn a_manifest_relationship_the_engine_cannot_read_is_named_by_entry() {
        let bad = serde_json::json!({"scope": {"component": "x", "property": "y",
            "options": {"future": {"min": 1}}}, "uuid": "u", "$ref": "t"});
        let ok = serde_json::json!({"scope": {"component": "x", "property": "y",
            "options": {"size": "m"}}, "uuid": "v", "$ref": "t"});
        let manifest = serde_json::json!({"extensions": {"relationships": [
            ok.clone(),
            {"op": "remove", "uuid": "gone"},
            {"op": "override", "uuid": "v", "value": bad.clone()},
            bad,
        ]}});
        let why = unsupported_manifest_relationship(&manifest).unwrap();
        assert!(
            why.starts_with("extensions.relationships entry 2:"),
            "{why}"
        );
        assert!(why.contains("upgrade the CLI"), "{why}");
        let fine = serde_json::json!({"extensions": {"relationships": [
            ok, {"op": "remove", "uuid": "gone"}
        ]}});
        assert_eq!(unsupported_manifest_relationship(&fine), None);
        assert_eq!(
            unsupported_manifest_relationship(&serde_json::json!({})),
            None
        );
    }
    use crate::data_source::{Provenance, ResolvedData};
    use crate::graph::TokenGraph;
    use serde_json::json;
    use std::path::PathBuf;

    fn gh(tag: Option<&str>) -> SourceConfig {
        SourceConfig::Github {
            repo: "adobe/spectrum-design-data".into(),
            tag: tag.map(String::from),
            branch: tag.is_none().then(|| "main".to_string()),
            sha: None,
        }
    }

    /// The real `packages/design-data-spec/schemas` dir, whose ancestry contains
    /// `packages/design-data-spec/schemas/manifest.schema.json` — mirrors the
    /// default `schemas_root` an in-repo `ResolvedData` carries.
    fn repo_schemas_root() -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data-spec/schemas")
    }

    fn resolved_with_manifest(manifest_path: PathBuf, schemas_root: PathBuf) -> ResolvedData {
        ResolvedData {
            tokens_root: PathBuf::from("tokens"),
            schemas_root,
            mode_sets: None,
            components: None,
            fields: None,
            guidelines: None,
            relationships: None,
            icons: None,
            exceptions: None,
            platform_manifest: Some(manifest_path),
            provenance: Provenance::InRepo,
        }
    }

    fn make_graph() -> TokenGraph {
        TokenGraph::from_pairs(vec![
            (
                "btn-bg".into(),
                PathBuf::from("tokens.json"),
                json!({
                    "name": {"property": "background-color", "component": "button"},
                    "value": "#aaa",
                    "uuid": "u-btn-bg"
                }),
            ),
            (
                "btn-fg".into(),
                PathBuf::from("tokens.json"),
                json!({
                    "name": {"property": "color", "component": "button"},
                    "value": "#111",
                    "uuid": "u-btn-fg"
                }),
            ),
            (
                "chk-bg".into(),
                PathBuf::from("tokens.json"),
                json!({
                    "name": {"property": "background-color", "component": "checkbox"},
                    "value": "#bbb",
                    "uuid": "u-chk-bg"
                }),
            ),
        ])
    }

    /// Write `manifest.json` (specVersion/foundationVersion plus any `extra`
    /// top-level fields — e.g. `extensionsDir`) and, for each `(subdir, filename,
    /// content)` triple, a fragment file under `<dir>/extensions/<subdir>/<filename>`.
    /// Returns the manifest path. `content` is written as-is, so pass a JSON array
    /// for `tokens/`/`relationships/` fixtures that need several entries in one file.
    fn write_manifest_with_extensions(
        dir: &Path,
        extra: Value,
        files: &[(&str, &str, Value)],
    ) -> PathBuf {
        let mut manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
        });
        if let Value::Object(extra) = extra {
            manifest.as_object_mut().unwrap().extend(extra);
        }
        let manifest_path = dir.join("manifest.json");
        std::fs::write(&manifest_path, manifest.to_string()).unwrap();

        for (subdir, filename, content) in files {
            let sub = dir.join("extensions").join(subdir);
            std::fs::create_dir_all(&sub).unwrap();
            std::fs::write(sub.join(filename), content.to_string()).unwrap();
        }
        manifest_path
    }

    #[test]
    fn no_manifest_is_noop() {
        let mut graph = make_graph();
        let resolved = ResolvedData {
            tokens_root: PathBuf::from("tokens"),
            schemas_root: PathBuf::from("schemas"),
            mode_sets: None,
            components: None,
            fields: None,
            guidelines: None,
            relationships: None,
            icons: None,
            exceptions: None,
            platform_manifest: None,
            provenance: Provenance::InRepo,
        };
        let restrictions = apply_configured(&mut graph, &resolved).unwrap();
        assert!(restrictions.is_empty());
        assert_eq!(graph.tokens.len(), 3);
    }

    #[test]
    fn include_filter_reduces_token_set() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = dir.path().join("manifest.json");
        std::fs::write(
            &manifest_path,
            json!({
                "specVersion": "1.0.0-draft",
                "foundationVersion": "1.0.0",
                "include": ["component=button"]
            })
            .to_string(),
        )
        .unwrap();

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        let restrictions = apply_configured(&mut graph, &resolved).unwrap();
        assert!(restrictions.is_empty());
        assert_eq!(graph.tokens.len(), 2);
        assert!(graph.tokens.contains_key("btn-bg"));
        assert!(graph.tokens.contains_key("btn-fg"));
        assert!(!graph.tokens.contains_key("chk-bg"));
    }

    #[test]
    fn invalid_manifest_query_returns_error() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = dir.path().join("manifest.json");
        std::fs::write(
            &manifest_path,
            json!({
                "specVersion": "1.0.0-draft",
                "foundationVersion": "1.0.0",
                "include": ["not-a-valid-query"]
            })
            .to_string(),
        )
        .unwrap();

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        let err = apply_configured(&mut graph, &resolved).unwrap_err();
        assert!(err.to_string().contains("query parse error"));
    }

    #[test]
    fn missing_schema_is_an_error_not_a_silent_skip() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = dir.path().join("manifest.json");
        std::fs::write(
            &manifest_path,
            json!({
                "specVersion": "1.0.0-draft",
                "foundationVersion": "1.0.0"
            })
            .to_string(),
        )
        .unwrap();

        let mut graph = make_graph();
        // schemas_root has no ancestor containing manifest.schema.json.
        let resolved = resolved_with_manifest(manifest_path, dir.path().to_path_buf());
        let err = apply_configured(&mut graph, &resolved).unwrap_err();
        assert!(err.to_string().contains("could not be located"));
    }

    #[test]
    fn missing_extensions_dir_is_noop_not_an_error() {
        let dir = tempfile::tempdir().unwrap();
        // No `extensions/` directory at all next to manifest.json.
        let manifest_path = write_manifest_with_extensions(dir.path(), json!({}), &[]);

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        let restrictions = apply_configured(&mut graph, &resolved).unwrap();
        assert!(restrictions.is_empty());
        assert_eq!(graph.tokens.len(), 3, "no extensions injected");
    }

    #[test]
    fn extensions_mode_sets_directory_is_injected_into_graph() {
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = write_manifest_with_extensions(
            dir.path(),
            json!({}),
            &[(
                "mode-sets",
                "interface-level.json",
                json!({"name": "interfaceLevel", "modes": ["base", "elevated"], "default": "base"}),
            )],
        );

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        apply_configured(&mut graph, &resolved).unwrap();

        let declared = graph
            .mode_sets
            .iter()
            .find(|m| m.name == "interfaceLevel")
            .expect("manifest-declared mode set present");
        assert_eq!(declared.modes, vec!["base", "elevated"]);
        assert_eq!(declared.default_mode, "base");
    }

    #[test]
    fn extensions_mode_sets_op_only_fragment_is_not_schema_rejected() {
        // An op entry (no `modes`/`default`) would fail mode-set.schema.json's
        // `required` check if it were validated like a plain add — it must be
        // skipped by FragmentValidation::ModeSetAdds, not rejected.
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = write_manifest_with_extensions(
            dir.path(),
            json!({}),
            &[(
                "mode-sets",
                "scale-tv.json",
                json!({"name": "scale", "op": "addMode", "mode": "tv"}),
            )],
        );

        let mut graph = make_graph();
        graph = graph.with_mode_sets(vec![crate::graph::ModeSetRecord {
            file: PathBuf::from("mode-sets/scale.json"),
            name: "scale".to_string(),
            modes: vec!["desktop".to_string(), "mobile".to_string()],
            default_mode: "desktop".to_string(),
        }]);
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        apply_configured(&mut graph, &resolved).unwrap();

        let scale = graph.mode_sets.iter().find(|m| m.name == "scale").unwrap();
        assert_eq!(scale.modes, vec!["desktop", "mobile", "tv"]);
    }

    #[test]
    fn extensions_mode_sets_plain_adds_precede_ops_regardless_of_file_order() {
        // "addMode.json" sorts before "scale.json" by filename, but the plain
        // add for "scale" must still be applied before the op targeting it —
        // load_and_concat's partition (adds before ops) must win over
        // discovery's sorted-path order.
        let dir = tempfile::tempdir().unwrap();
        let manifest_path = write_manifest_with_extensions(
            dir.path(),
            json!({}),
            &[
                (
                    "mode-sets",
                    "addMode.json",
                    json!({"name": "scale", "op": "addMode", "mode": "tv"}),
                ),
                (
                    "mode-sets",
                    "scale.json",
                    json!({"name": "scale", "modes": ["desktop", "mobile"], "default": "desktop"}),
                ),
            ],
        );

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        apply_configured(&mut graph, &resolved).unwrap();

        let scale = graph.mode_sets.iter().find(|m| m.name == "scale").unwrap();
        assert_eq!(scale.modes, vec!["desktop", "mobile", "tv"]);
    }

    #[cfg(unix)]
    #[test]
    fn unreadable_extension_fragment_error_names_the_file() {
        // Regression: the read-error path must name the file, like the
        // parse-error path just below it does, so failures are diagnosable
        // among many `extensions/` files.
        use std::os::unix::fs::PermissionsExt;

        let dir = tempfile::tempdir().unwrap();
        let manifest_path = write_manifest_with_extensions(dir.path(), json!({}), &[]);
        let components_dir = dir.path().join("extensions").join("components");
        std::fs::create_dir_all(&components_dir).unwrap();
        let bogus = components_dir.join("unreadable.json");
        std::fs::write(&bogus, "{}").unwrap();
        std::fs::set_permissions(&bogus, std::fs::Permissions::from_mode(0o000)).unwrap();

        let mut graph = make_graph();
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        let err = apply_configured(&mut graph, &resolved).unwrap_err();

        // Restore permissions so the tempdir can be cleaned up.
        std::fs::set_permissions(&bogus, std::fs::Permissions::from_mode(0o644)).unwrap();

        assert!(err.to_string().contains("unreadable.json"));
    }

    /// #1759: override/remove target foundation relationships, so `apply_configured`
    /// must load them itself when the caller has not.
    #[test]
    fn relationship_override_and_remove_find_foundation_records() {
        let dir = tempfile::tempdir().unwrap();
        let rel_dir = dir.path().join("relationships");
        std::fs::create_dir_all(&rel_dir).unwrap();
        let rel = |uuid: &str| {
            json!({"scope": {"component": "button", "property": "x"},
                   "context": "c", "$ref": "btn-bg", "uuid": uuid})
        };
        std::fs::write(
            rel_dir.join("button.json"),
            json!([
                rel("aaaaaaaa-0000-4000-8000-000000000001"),
                rel("aaaaaaaa-0000-4000-8000-000000000002")
            ])
            .to_string(),
        )
        .unwrap();
        let mut over = rel("aaaaaaaa-0000-4000-8000-000000000001");
        over["context"] = json!("overridden");
        let manifest_path = write_manifest_with_extensions(
            dir.path(),
            json!({}),
            &[(
                "relationships",
                "ops.json",
                json!([
                    {"op": "override", "uuid": "aaaaaaaa-0000-4000-8000-000000000001", "value": over},
                    {"op": "remove", "uuid": "aaaaaaaa-0000-4000-8000-000000000002"}
                ]),
            )],
        );
        let mut graph = make_graph();
        let mut resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        resolved.relationships = Some(rel_dir);
        apply_configured(&mut graph, &resolved).unwrap();
        assert_eq!(graph.relationships.len(), 1);
        assert_eq!(graph.relationships[0].raw["context"], "overridden");
    }

    #[test]
    fn check_platform_identity_absent_field_is_noop() {
        let manifest = json!({"specVersion": "1.0.0-draft", "foundationVersion": "1.0.0"});
        let result = check_platform_identity(&manifest, &repo_schemas_root()).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn check_platform_identity_known_id_is_noop() {
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "platform": "react-spectrum"
        });
        let result = check_platform_identity(&manifest, &repo_schemas_root()).unwrap();
        assert!(result.is_none(), "expected no warning, got: {result:?}");
    }

    #[test]
    fn check_platform_identity_unknown_id_returns_advisory() {
        let manifest = json!({
            "specVersion": "1.0.0-draft",
            "foundationVersion": "1.0.0",
            "platform": "totally-not-a-real-platform"
        });
        let result = check_platform_identity(&manifest, &repo_schemas_root()).unwrap();
        let message = result.expect("expected an advisory message");
        assert!(message.contains("totally-not-a-real-platform"));
        assert!(message.contains("advisory only"));
    }

    /// spectrum-design-data-h890.27.10: `web-components-states.json` was moved out
    /// of the foundation registry (`packages/design-data/registry/platform-extensions/`)
    /// into `platforms/web-components/extensions/platform-extensions/` — confirm the
    /// real, migrated file is still discovered, schema-validated, and merged into the
    /// graph via the same cascade every other platform-extensions fragment uses.
    #[test]
    fn swc_web_components_states_extension_is_loaded_via_cascade() {
        let manifest_path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../platforms/web-components/manifest.json");
        let mut graph = make_graph().with_components(real_components());
        let resolved = resolved_with_manifest(manifest_path, repo_schemas_root());
        apply_configured(&mut graph, &resolved).unwrap();

        let record = graph
            .platform_extensions
            .iter()
            .find(|r| r.platform == "Web Components" && r.extends == "states")
            .expect("web-components-states.json extension present after migration");
        let term_ids: Vec<&str> = record
            .raw
            .get("extensions")
            .and_then(|v| v.as_array())
            .unwrap()
            .iter()
            .filter_map(|t| t.get("termId").and_then(|v| v.as_str()))
            .collect();
        assert!(term_ids.contains(&"hover"));
        assert!(term_ids.contains(&"focus"));
        assert!(term_ids.contains(&"disabled"));
        assert!(term_ids.contains(&"keyboard-focus"));
    }

    #[test]
    fn ios_manifest_merges_real_foundation_and_extensions() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        let data = root.join("packages/design-data");
        let mut graph = TokenGraph::from_json_dir_with_catalogs(
            &data.join("tokens"),
            Some(&data.join("mode-sets")),
            Some(&data.join("components")),
        )
        .unwrap();
        let blue_uuid = "3451c170-3e78-449b-86f2-8b7dbea24c1c";
        let foundation_blue = graph.resolve_alias_key(blue_uuid).unwrap().raw.clone();
        let resolved = resolved_with_manifest(
            root.join("platforms/ios/manifest.json"),
            repo_schemas_root(),
        );
        apply_configured(&mut graph, &resolved).unwrap();

        for uuid in [
            "736e4768-7944-40ec-a412-4cd36299e03d",
            "9a727140-328d-430f-9b10-8965eebe77d1",
            "df8f47d4-5c3b-4ecb-b9fb-5d2dbd39d696",
        ] {
            let token = graph.resolve_alias_key(uuid).unwrap();
            assert_eq!(token.raw["value"], "rgba(9, 144, 120, 1.0)");
            assert_eq!(token.layer, crate::graph::Layer::Platform);
        }
        let blue = graph.resolve_alias_key(blue_uuid).unwrap();
        assert_eq!(blue.raw, foundation_blue);
        assert_eq!(blue.raw["name"]["colorFamily"], "blue");
        assert_eq!(blue.raw["name"]["scaleIndex"], 900);
        assert_eq!(blue.raw["name"]["colorScheme"], "light");
        assert_eq!(blue.layer, crate::graph::Layer::Foundation);

        let accent = graph
            .tokens
            .values()
            .find(|t| {
                t.raw["name"]["property"] == "accent-background-color"
                    && t.raw["name"]["colorScheme"] == "dark"
                    && t.raw["name"]["contrast"] == "high"
                    && t.raw["name"]["state"] == json!(["default"])
            })
            .expect("high-contrast accent extension present");
        assert_eq!(accent.raw["value"], "rgba(86, 129, 255, 1)");
        assert_eq!(accent.layer, crate::graph::Layer::Platform);
        let component = graph
            .components
            .iter()
            .find(|c| c.name == "tab-bar-ios")
            .unwrap();
        assert_eq!(
            component.raw["options"]["labelPosition"]["default"],
            "bottom"
        );
        let guideline = graph
            .guidelines
            .iter()
            .find(|g| g.name == "tab-bar-ios")
            .unwrap();
        assert!(guideline.raw["documentBlocks"][0]["content"]
            .as_str()
            .unwrap()
            .contains("top-level navigation"));
        let relationship = graph
            .relationships
            .iter()
            .find(|r| {
                r.raw["scope"]["component"] == "tab-bar-ios"
                    && r.raw["scope"]["property"] == "background-color"
            })
            .unwrap();
        let target = relationship.raw["$ref"].as_str().unwrap();
        assert_eq!(
            graph
                .resolve_alias_key(target)
                .unwrap()
                .resolve_leaf(&graph)
                .raw["value"],
            "rgba(9, 144, 120, 1.0)"
        );
        for (extends, mappings) in [
            (
                "states",
                vec![
                    ("hover", "highlighted"),
                    ("focus", "focused"),
                    ("disabled", "disabled"),
                    ("selected", "selected"),
                ],
            ),
            ("contrast", vec![("high", "increased")]),
        ] {
            let record = graph
                .platform_extensions
                .iter()
                .find(|r| r.platform == "iOS" && r.extends == extends)
                .unwrap();
            for (term, platform_term) in mappings {
                assert!(record.raw["extensions"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .any(|entry| {
                        entry["termId"] == term && entry["platformTerm"] == platform_term
                    }));
            }
        }
    }

    /// The real foundation component catalog, which the incubating platforms'
    /// `extensions/implementations/` fragments target.
    fn real_components() -> Vec<crate::graph::ComponentRecord> {
        TokenGraph::load_spec_components(
            &Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/design-data/components"),
        )
        .unwrap()
    }

    fn button_rows(graph: &TokenGraph) -> Vec<Value> {
        graph
            .components
            .iter()
            .find(|c| c.name == "button")
            .and_then(|c| c.raw.get("implementations"))
            .and_then(|v| v.as_array())
            .cloned()
            .expect("button has implementations")
    }

    /// h890.29: each incubating platform's seeded `extensions/implementations/`
    /// refines its own foundation default in place — stamping the owner and, for
    /// SWC gen2, adding `package` alongside `importPath` — without duplicating or
    /// dropping the other implementation's row.
    #[test]
    fn incubating_platforms_refine_their_own_implementation_rows() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../platforms");

        let mut graph = make_graph().with_components(real_components());
        let resolved = resolved_with_manifest(
            root.join("web-components/manifest.json"),
            repo_schemas_root(),
        );
        apply_configured(&mut graph, &resolved).unwrap();
        assert_eq!(
            button_rows(&graph),
            vec![
                json!({"platform": "web", "componentName": "Button", "package": "@react-spectrum/s2"}),
                json!({
                    "platform": "web",
                    "componentName": "Button",
                    "package": "@adobe/spectrum-wc",
                    "importPath": "@adobe/spectrum-wc/components/button",
                    "notes": "Spectrum 2 web component custom element: swc-button.",
                    "implementation": "web-components"
                }),
            ]
        );

        let mut graph = make_graph().with_components(real_components());
        let resolved = resolved_with_manifest(
            root.join("react-spectrum/manifest.json"),
            repo_schemas_root(),
        );
        apply_configured(&mut graph, &resolved).unwrap();
        let rows = button_rows(&graph);
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0]["implementation"], "react-spectrum");
        assert_eq!(rows[0]["package"], "@react-spectrum/s2");
        assert!(rows[1].get("implementation").is_none());
    }

    #[test]
    fn embedded_snapshot_validates_ejected_implementation_fragments() {
        let project = tempfile::tempdir().unwrap();
        let root = project.path().join("embedded");
        crate::data_source::embedded::materialize_to(&root).unwrap();

        let source = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../platforms/react-spectrum");
        let manifest_path = project.path().join("manifest.json");
        std::fs::copy(source.join("manifest.json"), &manifest_path).unwrap();
        let fragments = project.path().join("extensions/implementations");
        std::fs::create_dir_all(&fragments).unwrap();
        for entry in std::fs::read_dir(source.join("extensions/implementations")).unwrap() {
            let entry = entry.unwrap();
            std::fs::copy(entry.path(), fragments.join(entry.file_name())).unwrap();
        }

        let components =
            TokenGraph::load_spec_components(&root.join("packages/design-data/components"))
                .unwrap();
        let mut graph = make_graph().with_components(components);
        let resolved = resolved_with_manifest(
            manifest_path,
            root.join("packages/design-data-spec/schemas"),
        );
        apply_configured(&mut graph, &resolved).unwrap();
        let rows = button_rows(&graph);
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0]["implementation"], "react-spectrum");
        assert_eq!(rows[0]["package"], "@react-spectrum/s2");
        assert!(rows[1].get("implementation").is_none());

        let invalid_fragment = fragments.join("invalid.json");
        std::fs::write(
            &invalid_fragment,
            json!({
                "component": "button",
                "implementations": [{"platform": "web", "package": "@react-spectrum/s2"}]
            })
            .to_string(),
        )
        .unwrap();
        let error = apply_configured(&mut graph, &resolved)
            .unwrap_err()
            .to_string();
        assert!(
            error.contains(&invalid_fragment.display().to_string()),
            "{error}"
        );
        assert!(error.contains("failed schema validation"), "{error}");
        assert!(error.contains("componentName"), "{error}");
    }

    #[test]
    fn an_extension_with_a_foundation_namesake_is_a_shadow() {
        use crate::graph::{ComponentRecord, Layer, VisualRecord};
        let mut g = TokenGraph::default();
        g.components.push(ComponentRecord {
            name: "button".into(),
            file: "button.json".into(),
            raw: json!({ "name": "button" }),
            layer: Layer::Foundation,
        });
        g.visuals.push(VisualRecord {
            component: "badge".into(),
            file: "badge.json".into(),
            raw: json!({}),
            layer: Layer::Foundation,
        });
        let manifest = json!({ "extensions": {
            "components": [{ "name": "button" }, { "name": "tab-bar-ios" }],
            "visuals": [{ "file": "x.json", "recipe": { "component": "badge" } },
                        { "file": "y.json", "recipe": { "component": "status-light" } }]
        } });
        assert_eq!(
            shadowed_artifacts(&g, &manifest),
            vec![
                Shadow {
                    category: "components",
                    name: "button".into()
                },
                Shadow {
                    category: "visuals",
                    name: "badge".into()
                },
            ]
        );
        assert!(shadowed_artifacts(&g, &json!({})).is_empty());
    }
}
