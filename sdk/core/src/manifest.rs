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

use crate::data_source::ResolvedData;
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
/// `tokens/` and `relationships/` have their own handling below and aren't here.
const CONCAT_CATEGORIES: &[(&str, &str, &str)] = &[
    ("components", "components", "component.schema.json"),
    ("fields", "fields", "field.schema.json"),
    ("guidelines", "guidelines", "guideline.schema.json"),
    (
        "platform-extensions",
        "platformExtensions",
        "platform-extension.json",
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
    let Some(manifest_path) = resolved.platform_manifest.as_ref() else {
        return Ok(HashMap::new());
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

    let outcome = graph.apply_platform_manifest(&manifest)?;
    Ok(outcome.mode_set_restrictions)
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

    const KNOWN_SUBDIRS: &[&str] = &[
        "tokens",
        "components",
        "fields",
        "guidelines",
        "platform-extensions",
        "relationships",
    ];
    for entry in std::fs::read_dir(&ext_root)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_dir() {
            // Tolerate stray non-directory files (.DS_Store, README.md, ...).
            continue;
        }
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if !KNOWN_SUBDIRS.contains(&name.as_ref()) {
            return Err(CoreError::ParseError(format!(
                "extensions directory {} contains an unrecognized subdirectory \"{name}\" — \
                 expected one of: {}",
                ext_root.display(),
                KNOWN_SUBDIRS.join(", ")
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

    // components/, fields/, guidelines/, platform-extensions/ — one artifact per
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

    Ok((!out.is_empty()).then_some(Value::Object(out)))
}

/// How a fragment file (or the entries flattened out of it) is schema-validated
/// during [`load_and_concat`]. Each variant names the schema file to validate
/// against; the difference is *what* value gets validated.
enum FragmentValidation<'a> {
    /// `tokens/*.tokens.json`: the whole parsed file is itself the cascade array
    /// `cascade-file.schema.json` describes — validated before flattening.
    TokenFile(&'a Path),
    /// `components/`, `fields/`, `guidelines/`, `platform-extensions/`: each
    /// flattened entry is one object validated against the category schema.
    Item(&'a Path),
    /// `relationships/`: each flattened entry *without* an `"op"` key (a plain
    /// add) is validated against `relationship.schema.json`. Entries with `"op"`
    /// (override/remove) have no schema of their own — `relationship.schema.json`
    /// only models plain add/ref shapes — and are left to
    /// `apply_platform_manifest`'s own override/remove structural checks.
    RelationshipAdds(&'a Path),
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data_source::{Provenance, ResolvedData};
    use crate::graph::TokenGraph;
    use serde_json::json;
    use std::path::PathBuf;

    /// The real `packages/tokens/schemas` dir, whose ancestry contains
    /// `packages/design-data-spec/schemas/manifest.schema.json` — mirrors the
    /// default `schemas_root` an in-repo `ResolvedData` carries.
    fn repo_schemas_root() -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/tokens/schemas")
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
            exceptions: None,
            manifest: None,
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
            exceptions: None,
            manifest: None,
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
}
