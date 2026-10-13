// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Export Spectrum tokens and component declarations as shadcn registry items.
//!
//! ## Why this leans on `design-data-dtcg` instead of re-deriving values
//!
//! Turning a resolved [`TokenRecord`] into a CSS-ready value (color hex, dimension
//! string, ...) is what [`design_data_dtcg::token_to_dtcg_document_in_context`] already
//! does. Rather than duplicate that leaf-resolution logic, this exporter calls it per
//! winner and lifts `$value` straight into a `spectrum-{legacyKey}` key (shadcn adds the `--` prefix itself).
//!
//! ## Theme mode coverage
//!
//! shadcn's `cssVars` wants `light` *and* `dark` in one document. The `winners` the CLI
//! passes come from one context, and without `--color-scheme` that context leaves
//! `colorScheme` unset, which resolves scheme-specific tokens arbitrarily. This exporter
//! ignores `winners` and resolves each side from `graph` via
//! [`design_data_core::cascade::resolve_dataset`]. Other mode sets (scale, contrast)
//! come from `mode_ctx`, falling back to each mode set's declared default, so unset
//! modes never resolve arbitrarily. `colorScheme` is set to `light` or `dark`.
//!
//! CSS variables are emitted only for tokens with a legacy key and a scalar
//! DTCG value that can be represented as CSS. Tokens without a legacy key and
//! composite values such as typography or shadow objects are skipped rather
//! than assigned an invented property name or serialized as invalid CSS.
use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::path::Path;

use design_data_core::cascade::{resolve_dataset, ResolutionContext};
use design_data_core::export::TokenExporter;
use design_data_core::graph::{TokenGraph, TokenRecord};
use design_data_core::naming::extract_legacy_key;
use serde_json::{json, Map, Value};

const REGISTRY_ITEM_SCHEMA: &str = "https://ui.shadcn.com/schema/registry-item.json";
const REGISTRY_SCHEMA: &str = "https://ui.shadcn.com/schema/registry.json";

/// Exports resolved tokens as a shadcn `registry:theme` registry item.
pub struct ShadcnThemeExporter;

impl TokenExporter for ShadcnThemeExporter {
    fn format_id(&self) -> &'static str {
        "shadcn-theme"
    }

    fn export(
        &self,
        graph: &TokenGraph,
        _winners: &[TokenRecord],
        mode_ctx: &HashMap<String, String>,
    ) -> Value {
        let scheme_vars = |scheme: &str| {
            let mut ctx_map: HashMap<String, String> = graph
                .mode_sets
                .iter()
                .map(|set| (set.name.clone(), set.default_mode.clone()))
                .collect();
            ctx_map.extend(mode_ctx.iter().map(|(k, v)| (k.clone(), v.clone())));
            ctx_map.insert("colorScheme".to_string(), scheme.to_string());
            let mut ctx = ResolutionContext::new();
            for (mode_set, mode) in &ctx_map {
                ctx = ctx.with(mode_set.clone(), mode.clone());
            }
            css_vars(graph, &resolve_dataset(graph, &ctx), &ctx_map)
        };
        let light_vars = scheme_vars("light");
        let dark_vars = scheme_vars("dark");

        json!({
            "name": "spectrum-theme",
            "type": "registry:theme",
            "cssVars": {
                "light": light_vars,
                "dark": dark_vars,
            }
        })
    }
}

/// Build a flat `{"spectrum-{legacyKey}": "<css value>"}` map from resolved winners,
/// deriving each value via the DTCG exporter's leaf resolution (`$value`).
fn css_vars(
    graph: &TokenGraph,
    winners: &[TokenRecord],
    ctx: &HashMap<String, String>,
) -> Map<String, Value> {
    let mut vars = BTreeMap::new();
    for winner in winners {
        let Some(name) = winner.raw.get("name") else {
            continue;
        };
        let Some(legacy_key) = extract_legacy_key(name) else {
            continue;
        };
        let doc = design_data_dtcg::token_to_dtcg_document_in_context(graph, winner, ctx);
        let Some(entry) = doc.get(&legacy_key) else {
            continue;
        };
        let Some(value) = entry.get("$value") else {
            continue;
        };
        let Some(css_value) = dtcg_value_to_css(entry.get("$type"), value) else {
            continue;
        };
        vars.insert(format!("spectrum-{legacy_key}"), css_value);
    }
    vars.into_iter()
        .map(|(key, value)| (key, Value::String(value)))
        .collect()
}

/// Render a DTCG `$value` as a CSS-ready string, keyed off its `$type`. Scalars
/// (`color`, `number`, strings) pass through as-is; `dimension` (`{value, unit}`)
/// becomes `"{value}{unit}"`. Composite types (`typography`, `shadow`, ...) aren't
/// single CSS values, so this spike skips them (`None`) rather than emit the raw
/// JSON object as a nonsense custom-property string.
fn dtcg_value_to_css(dtcg_type: Option<&Value>, value: &Value) -> Option<String> {
    match value {
        Value::String(s) => Some(s.clone()),
        Value::Number(n) => Some(n.to_string()),
        Value::Object(obj) if dtcg_type.and_then(Value::as_str) == Some("dimension") => {
            let value = obj.get("value")?.as_f64()?;
            let unit = obj.get("unit")?.as_str()?;
            Some(format!("{value}{unit}"))
        }
        _ => None,
    }
}

/// Convert one Design Data component declaration into a metadata-only
/// `registry:component` item. Source files are intentionally not fabricated.
pub fn component_registry_item(component: &Value) -> Result<Value, String> {
    let name = required_string(component, "name", "component")?;
    design_data_core::component::validate_id(name)
        .map_err(|error| format!("invalid component name '{name}': {error}"))?;
    let title = required_string(component, "displayName", name)?;
    let source_meta = component
        .get("meta")
        .and_then(Value::as_object)
        .ok_or_else(|| format!("component '{name}' is missing an object 'meta'"))?;
    let source = component
        .as_object()
        .ok_or_else(|| format!("component '{name}' must be an object"))?;

    let mut meta = Map::new();
    copy_if_present(source_meta, &mut meta, "category");
    copy_if_present(source_meta, &mut meta, "documentationUrl");

    if let Some(options) = component.get("options") {
        meta.insert("props".to_string(), component_props(name, options)?);
    }
    if let Some(states) = component.get("states") {
        let states = states
            .as_array()
            .ok_or_else(|| format!("component '{name}' has a non-array 'states' field"))?;
        let mut state_names = Vec::with_capacity(states.len());
        for state in states {
            state_names.push(
                state
                    .get("name")
                    .and_then(Value::as_str)
                    .ok_or_else(|| format!("component '{name}' has a state without a name"))?,
            );
        }
        meta.insert("states".to_string(), json!(state_names));
        if states.iter().any(|state| {
            state
                .as_object()
                .is_some_and(|object| object.keys().any(|key| key != "name"))
        }) {
            meta.insert("stateDetails".to_string(), json!(states));
        }
    }
    for key in [
        "accessibility",
        "implementations",
        "anatomy",
        "slots",
        "tokenBindings",
    ] {
        copy_if_present(source, &mut meta, key);
    }

    let mut item = Map::new();
    item.insert("$schema".to_string(), json!(REGISTRY_ITEM_SCHEMA));
    item.insert("name".to_string(), json!(name));
    item.insert("type".to_string(), json!("registry:component"));
    item.insert("title".to_string(), json!(title));
    if let Some(description) = component.get("description") {
        item.insert("description".to_string(), description.clone());
    }
    item.insert(
        "registryDependencies".to_string(),
        json!(["spectrum-theme"]),
    );
    if let Some(docs) = component_docs(name, component.get("documentBlocks"))? {
        item.insert("docs".to_string(), json!(docs));
    }
    item.insert("meta".to_string(), Value::Object(meta));
    Ok(Value::Object(item))
}

/// Build the root shadcn registry document from component registry items.
pub fn component_registry_document(items: Vec<Value>) -> Value {
    json!({
        "$schema": REGISTRY_SCHEMA,
        "name": "spectrum",
        "homepage": "https://spectrum.adobe.com/",
        "items": items,
    })
}

/// Read component declarations, generate registry items, and write an item file
/// per component plus the root `registry.json` index.
pub fn write_component_registry(
    components_dir: &Path,
    output_dir: &Path,
    selected_component: Option<&str>,
) -> Result<usize, String> {
    let components = read_component_declarations(components_dir, selected_component)?;
    let items = components
        .iter()
        .map(component_registry_item)
        .collect::<Result<Vec<_>, _>>()?;
    let items_dir = output_dir.join("items");
    fs::create_dir_all(&items_dir)
        .map_err(|error| format!("creating {}: {error}", items_dir.display()))?;
    for item in &items {
        let name = item["name"]
            .as_str()
            .expect("component_registry_item always emits a string name");
        write_json(&items_dir.join(format!("{name}.json")), item)?;
    }
    write_json(
        &output_dir.join("registry.json"),
        &component_registry_document(items),
    )?;
    Ok(components.len())
}

/// Write a self-contained registry for static hosting under `base_url`.
///
/// Items and the theme sit flat next to `registry.json` (`{name}.json`), so each is
/// installable with `shadcn add {base_url}/{name}.json`. Every component's
/// `spectrum-theme` dependency is rewritten to the hosted theme URL so the shadcn CLI
/// can resolve it, and the theme item is listed in `registry.json`.
pub fn write_hosted_registry(
    components_dir: &Path,
    output_dir: &Path,
    selected_component: Option<&str>,
    base_url: &str,
    theme: &Value,
) -> Result<usize, String> {
    let base_url = base_url.trim_end_matches('/');
    if !(base_url.starts_with("https://") || base_url.starts_with("http://")) {
        return Err(format!(
            "base URL '{base_url}' must start with http:// or https://"
        ));
    }
    let theme_name = theme
        .get("name")
        .and_then(Value::as_str)
        .ok_or_else(|| "theme item is missing a string 'name'".to_string())?;
    let theme_url = format!("{base_url}/{theme_name}.json");

    let components = read_component_declarations(components_dir, selected_component)?;
    let mut items = components
        .iter()
        .map(component_registry_item)
        .collect::<Result<Vec<_>, _>>()?;
    for item in &mut items {
        item["registryDependencies"] = json!([theme_url]);
    }

    let mut theme_item = Map::new();
    theme_item.insert("$schema".to_string(), json!(REGISTRY_ITEM_SCHEMA));
    theme_item.extend(
        theme
            .as_object()
            .ok_or_else(|| "theme item must be an object".to_string())?
            .clone(),
    );
    let theme_item = Value::Object(theme_item);

    fs::create_dir_all(output_dir)
        .map_err(|error| format!("creating {}: {error}", output_dir.display()))?;
    for item in items.iter().chain(std::iter::once(&theme_item)) {
        let name = item["name"]
            .as_str()
            .expect("registry items always have a string name");
        write_json(&output_dir.join(format!("{name}.json")), item)?;
    }
    let mut all_items = vec![theme_item];
    all_items.extend(items);
    write_json(
        &output_dir.join("registry.json"),
        &component_registry_document(all_items),
    )?;
    Ok(components.len())
}

fn read_component_declarations(
    components_dir: &Path,
    selected_component: Option<&str>,
) -> Result<Vec<Value>, String> {
    if let Some(name) = selected_component {
        design_data_core::component::validate_id(name)
            .map_err(|error| format!("invalid component id '{name}': {error}"))?;
        let path = components_dir.join(format!("{name}.json"));
        let component = read_component(&path)?;
        let declared_name = required_string(&component, "name", &path.display().to_string())?;
        if declared_name != name {
            return Err(format!(
                "component file {} declares name '{declared_name}', expected '{name}'",
                path.display()
            ));
        }
        return Ok(vec![component]);
    }

    let entries = fs::read_dir(components_dir).map_err(|error| {
        format!(
            "reading components directory {}: {error}",
            components_dir.display()
        )
    })?;
    let mut paths = entries
        .map(|entry| entry.map(|entry| entry.path()))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| {
            format!(
                "listing components directory {}: {error}",
                components_dir.display()
            )
        })?;
    paths.retain(|path| {
        path.extension()
            .is_some_and(|extension| extension == "json")
    });
    paths.sort();

    let mut components = Vec::with_capacity(paths.len());
    let mut names = std::collections::HashSet::new();
    for path in paths {
        let component = read_component(&path)?;
        let name = required_string(&component, "name", &path.display().to_string())?;
        design_data_core::component::validate_id(name)
            .map_err(|error| format!("invalid component name in {}: {error}", path.display()))?;
        if path.file_stem().and_then(|stem| stem.to_str()) != Some(name) {
            return Err(format!(
                "component file {} does not match declared name '{name}'",
                path.display()
            ));
        }
        if !names.insert(name.to_string()) {
            return Err(format!("duplicate component name '{name}'"));
        }
        components.push(component);
    }
    if components.is_empty() {
        return Err(format!(
            "no component JSON files found in {}",
            components_dir.display()
        ));
    }
    components.sort_by(|left, right| left["name"].as_str().cmp(&right["name"].as_str()));
    Ok(components)
}

fn read_component(path: &Path) -> Result<Value, String> {
    let text = fs::read_to_string(path)
        .map_err(|error| format!("reading component {}: {error}", path.display()))?;
    serde_json::from_str(&text)
        .map_err(|error| format!("parsing component {}: {error}", path.display()))
}

fn component_props(name: &str, options: &Value) -> Result<Value, String> {
    let options = options
        .as_object()
        .ok_or_else(|| format!("component '{name}' has a non-object 'options' field"))?;
    let mut props = Map::new();
    for (option_name, descriptor) in options {
        let descriptor = descriptor
            .as_object()
            .ok_or_else(|| format!("component '{name}' option '{option_name}' is not an object"))?;
        let mut prop = Map::new();
        for (key, value) in descriptor {
            match key.as_str() {
                "$ref" => {
                    prop.insert("type".to_string(), value.clone());
                }
                "values" => {
                    let values = value.as_array().ok_or_else(|| {
                        format!("component '{name}' option '{option_name}' has non-array 'values'")
                    })?;
                    let mut enum_values = Vec::with_capacity(values.len());
                    for entry in values {
                        enum_values.push(entry.get("value").cloned().ok_or_else(|| {
                            format!(
                                "component '{name}' option '{option_name}' has a value without 'value'"
                            )
                        })?);
                    }
                    prop.insert("enum".to_string(), json!(enum_values));
                    if values.iter().any(|entry| {
                        entry
                            .as_object()
                            .is_some_and(|object| object.keys().any(|key| key != "value"))
                    }) {
                        prop.insert("valueDetails".to_string(), json!(values));
                    }
                }
                _ => {
                    prop.insert(key.clone(), value.clone());
                }
            }
        }
        props.insert(option_name.clone(), Value::Object(prop));
    }
    Ok(Value::Object(props))
}

fn component_docs(name: &str, blocks: Option<&Value>) -> Result<Option<String>, String> {
    let Some(blocks) = blocks else {
        return Ok(None);
    };
    let blocks = blocks
        .as_array()
        .ok_or_else(|| format!("component '{name}' has a non-array 'documentBlocks' field"))?;
    let mut contents = Vec::with_capacity(blocks.len());
    for block in blocks {
        contents.push(
            block
                .get("content")
                .and_then(Value::as_str)
                .ok_or_else(|| {
                    format!("component '{name}' has a document block without string content")
                })?,
        );
    }
    if contents.is_empty() {
        Ok(None)
    } else {
        Ok(Some(contents.join("\n\n")))
    }
}

fn required_string<'a>(value: &'a Value, key: &str, context: &str) -> Result<&'a str, String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| format!("{context} is missing string '{key}'"))
}

fn copy_if_present(source: &Map<String, Value>, target: &mut Map<String, Value>, key: &str) {
    if let Some(value) = source.get(key) {
        target.insert(key.to_string(), value.clone());
    }
}

fn write_json(path: &Path, value: &Value) -> Result<(), String> {
    let contents = serde_json::to_string_pretty(value)
        .map_err(|error| format!("serializing {}: {error}", path.display()))?;
    fs::write(path, format!("{contents}\n"))
        .map_err(|error| format!("writing {}: {error}", path.display()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use design_data_core::graph::{Layer, ModeSetRecord, TokenGraph, TokenRecord};
    use std::path::PathBuf;

    fn record(name: &str, color_scheme: &str, value: &str) -> TokenRecord {
        let schema_url =
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json"
                .to_string();
        let raw = json!({
            "$schema": schema_url,
            "name": {"property": "accent-color", "colorScheme": color_scheme},
            "value": value,
        });
        TokenRecord {
            name: name.to_string(),
            file: PathBuf::from("test.tokens.json"),
            index: 0,
            schema_url: Some(schema_url),
            uuid: None,
            alias_target: None,
            raw,
            layer: Layer::default(),
        }
    }

    #[test]
    fn export_emits_light_and_dark_css_vars() {
        let light = record("t-light", "light", "#1473e6");
        let dark = record("t-dark", "dark", "#2680eb");
        let graph = TokenGraph::from_pairs(vec![
            (light.name.clone(), light.file.clone(), light.raw.clone()),
            (dark.name.clone(), dark.file.clone(), dark.raw.clone()),
        ])
        .with_mode_sets(vec![ModeSetRecord {
            file: PathBuf::from("test.mode-sets.json"),
            name: "colorScheme".into(),
            modes: vec!["light".into(), "dark".into()],
            default_mode: "light".into(),
        }]);

        let ctx = ResolutionContext::new().with("colorScheme", "light");
        let winners = resolve_dataset(&graph, &ctx);

        let doc = ShadcnThemeExporter.export(&graph, &winners, &ctx.mode_sets);

        assert_eq!(
            doc["cssVars"]["light"]["spectrum-accent-color"],
            json!("#1473e6")
        );
        assert_eq!(
            doc["cssVars"]["dark"]["spectrum-accent-color"],
            json!("#2680eb")
        );
        assert_eq!(doc["type"], json!("registry:theme"));
    }

    #[test]
    fn format_id_is_shadcn_theme() {
        assert_eq!(ShadcnThemeExporter.format_id(), "shadcn-theme");
    }

    #[test]
    fn dimension_value_renders_as_css_length() {
        let dtcg_type = json!("dimension");
        let value = json!({"value": 8.0, "unit": "px"});
        assert_eq!(
            dtcg_value_to_css(Some(&dtcg_type), &value),
            Some("8px".to_string())
        );
    }

    #[test]
    fn composite_value_is_skipped() {
        let dtcg_type = json!("typography");
        let value = json!({"fontFamily": "adobe-clean"});
        assert_eq!(dtcg_value_to_css(Some(&dtcg_type), &value), None);
    }

    #[test]
    fn action_button_component_matches_registry_item_sample() {
        let component: Value = serde_json::from_str(include_str!(
            "../../../../packages/design-data/components/action-button.json"
        ))
        .unwrap();
        let expected: Value = serde_json::from_str(include_str!(
            "../examples/action-button.registry-item.sample.json"
        ))
        .unwrap();
        assert_eq!(component_registry_item(&component).unwrap(), expected);
    }

    #[test]
    fn component_item_omits_missing_optional_sections() {
        let component = json!({
            "name": "minimal",
            "displayName": "Minimal",
            "meta": {
                "category": "actions",
                "documentationUrl": "https://example.com/minimal"
            }
        });
        let item = component_registry_item(&component).unwrap();
        assert!(item.get("docs").is_none());
        assert!(item["meta"].get("props").is_none());
        assert!(item["meta"].get("states").is_none());
        assert!(item["meta"].get("implementations").is_none());
    }

    #[test]
    fn component_item_preserves_state_details_and_maps_options() {
        let component = json!({
            "name": "example",
            "displayName": "Example",
            "meta": {"category": "actions", "documentationUrl": "https://example.com"},
            "options": {
                "size": {
                    "type": "string",
                    "values": [{"value": "s"}, {"value": "m"}]
                },
                "icon": {"$ref": "https://example.com/icon.json"}
            },
            "states": [{"name": "hover", "trigger": "interaction"}]
        });
        let item = component_registry_item(&component).unwrap();
        assert_eq!(item["meta"]["props"]["size"]["enum"], json!(["s", "m"]));
        assert_eq!(
            item["meta"]["props"]["icon"]["type"],
            "https://example.com/icon.json"
        );
        assert_eq!(item["meta"]["states"], json!(["hover"]));
        assert_eq!(item["meta"]["stateDetails"][0]["trigger"], "interaction");
    }

    #[test]
    fn component_item_rejects_malformed_option_values() {
        let component = json!({
            "name": "example",
            "displayName": "Example",
            "meta": {"category": "actions", "documentationUrl": "https://example.com"},
            "options": {
                "size": {"values": [{"description": "missing value"}]}
            }
        });
        assert!(component_registry_item(&component)
            .unwrap_err()
            .contains("without 'value'"));
    }

    fn write_component(dir: &Path, file_stem: &str, name: &str) {
        let component = json!({
            "name": name,
            "displayName": "Example",
            "meta": {"category": "actions", "documentationUrl": "https://example.com"}
        });
        fs::write(
            dir.join(format!("{file_stem}.json")),
            serde_json::to_string(&component).unwrap(),
        )
        .unwrap();
    }

    #[test]
    fn registry_rejects_invalid_component_id() {
        let components = tempfile::tempdir().unwrap();
        let output = tempfile::tempdir().unwrap();
        let error = write_component_registry(components.path(), output.path(), Some("Bad_Name"))
            .unwrap_err();
        assert!(error.contains("invalid component id 'Bad_Name'"), "{error}");
        assert!(!output.path().join("registry.json").exists());
    }

    #[test]
    fn registry_reports_missing_component() {
        let components = tempfile::tempdir().unwrap();
        let output = tempfile::tempdir().unwrap();
        let error = write_component_registry(components.path(), output.path(), Some("missing"))
            .unwrap_err();
        assert!(error.contains("reading component"), "{error}");
        assert!(error.contains("missing.json"), "{error}");
    }

    #[test]
    fn registry_reports_malformed_json() {
        let components = tempfile::tempdir().unwrap();
        let output = tempfile::tempdir().unwrap();
        fs::write(components.path().join("broken.json"), "{ not json").unwrap();
        let error =
            write_component_registry(components.path(), output.path(), Some("broken")).unwrap_err();
        assert!(error.contains("parsing component"), "{error}");
        let error = write_component_registry(components.path(), output.path(), None).unwrap_err();
        assert!(error.contains("parsing component"), "{error}");
    }

    #[test]
    fn registry_rejects_filename_name_mismatch() {
        let components = tempfile::tempdir().unwrap();
        let output = tempfile::tempdir().unwrap();
        write_component(components.path(), "alpha", "beta");
        let error =
            write_component_registry(components.path(), output.path(), Some("alpha")).unwrap_err();
        assert!(
            error.contains("declares name 'beta', expected 'alpha'"),
            "{error}"
        );
        let error = write_component_registry(components.path(), output.path(), None).unwrap_err();
        assert!(
            error.contains("does not match declared name 'beta'"),
            "{error}"
        );
    }

    #[test]
    fn registry_reports_write_failure() {
        let components = tempfile::tempdir().unwrap();
        write_component(components.path(), "alpha", "alpha");
        let scratch = tempfile::tempdir().unwrap();
        let blocker = scratch.path().join("not-a-directory");
        fs::write(&blocker, "file").unwrap();
        let error = write_component_registry(components.path(), &blocker, None).unwrap_err();
        assert!(error.contains("creating"), "{error}");
    }

    #[test]
    fn registry_reports_empty_components_directory() {
        let components = tempfile::tempdir().unwrap();
        let output = tempfile::tempdir().unwrap();
        let error = write_component_registry(components.path(), output.path(), None).unwrap_err();
        assert!(error.contains("no component JSON files found"), "{error}");
    }

    #[test]
    fn hosted_registry_is_flat_and_points_at_hosted_theme() {
        let components = tempfile::tempdir().unwrap();
        let output = tempfile::tempdir().unwrap();
        write_component(components.path(), "alpha", "alpha");
        let theme = json!({"name": "spectrum-theme", "type": "registry:theme", "cssVars": {"light": {}, "dark": {}}});
        let count = write_hosted_registry(
            components.path(),
            output.path(),
            None,
            "https://example.com/r/",
            &theme,
        )
        .unwrap();
        assert_eq!(count, 1);
        let read = |name: &str| -> Value {
            serde_json::from_str(&fs::read_to_string(output.path().join(name)).unwrap()).unwrap()
        };
        assert_eq!(
            read("alpha.json")["registryDependencies"],
            json!(["https://example.com/r/spectrum-theme.json"])
        );
        assert_eq!(read("spectrum-theme.json")["$schema"], REGISTRY_ITEM_SCHEMA);
        let names: Vec<_> = read("registry.json")["items"]
            .as_array()
            .unwrap()
            .iter()
            .map(|item| item["name"].as_str().unwrap().to_string())
            .collect();
        assert_eq!(names, ["spectrum-theme", "alpha"]);
    }

    #[test]
    fn hosted_registry_rejects_non_http_base_url() {
        let components = tempfile::tempdir().unwrap();
        let output = tempfile::tempdir().unwrap();
        write_component(components.path(), "alpha", "alpha");
        let theme = json!({"name": "spectrum-theme"});
        let error = write_hosted_registry(
            components.path(),
            output.path(),
            None,
            "example.com",
            &theme,
        )
        .unwrap_err();
        assert!(error.contains("must start with http"), "{error}");
    }
}
