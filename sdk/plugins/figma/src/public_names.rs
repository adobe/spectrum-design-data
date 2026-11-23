// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Public variable names in the S2 Web POC file.
//!
//! The exporter writes hidden collections (`.Platform scale`, `.Color theme`) named by legacy
//! key. Designers made the public collections (Layout, Typography, S2.Color-theme,
//! Iconography) by hand: each public variable aliases one hidden variable and has its own
//! name. This module lists those pairs, finds the design-data record behind each, and
//! generates the name a variable would get from its structured data, so the two can be
//! compared and new aliases can be named. Existing designer names are never replaced.

use std::collections::{BTreeMap, BTreeSet, HashMap};

use design_data_core::graph::TokenGraph;
use design_data_core::naming::extract_legacy_key;
use design_data_core::registry::RegistryData;
use serde::Serialize;
use serde_json::{Map, Value};

use crate::types::VariablesMeta;

/// How a generated name compares with the designer's name.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum MatchClass {
    Identical,
    CaseOnly,
    /// Same words, other order or split.
    Reordered,
    /// One name has words the other lacks.
    AddsOrDropsWords,
    Different,
    /// No design-data record found for the hidden variable.
    Unresolved,
    /// A record was found but has nothing to name it from (no `property`).
    Unnameable,
}

#[derive(Debug, Clone, Serialize)]
pub struct PublicRow {
    pub collection: String,
    pub designer_name: String,
    /// Figma variable key of the public variable (what designer files bind to).
    pub key: String,
    pub legacy_key: String,
    /// The variable is marked hidden from publishing, so other files cannot bind to it.
    pub hidden_from_publishing: bool,
    pub source: SourceKind,
    pub source_id: Option<String>,
    pub generated_name: Option<String>,
    pub class: MatchClass,
}

/// A hidden variable no public variable aliases yet: it needs a new public alias.
#[derive(Debug, Clone, Serialize)]
pub struct HiddenOnlyRow {
    pub hidden_name: String,
    pub legacy_key: String,
    pub source: SourceKind,
    pub source_id: Option<String>,
    pub collection: Option<String>,
    pub generated_name: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum SourceKind {
    Token,
    Relationship,
    None,
}

#[derive(Debug, Clone, Serialize)]
pub struct Report {
    pub rows: Vec<PublicRow>,
    pub hidden_only: Vec<HiddenOnlyRow>,
    pub summary: BTreeMap<String, BTreeMap<String, usize>>,
}

/// The fields of a record that matter for naming, as strings.
pub type Fields = Map<String, Value>;

const NAMING_FIELDS: [&str; 17] = [
    "component",
    "structure",
    "anatomy",
    "part",
    "variant",
    "property",
    "size",
    "state",
    "emphasis",
    "family",
    "script",
    "position",
    "scaleIndex",
    "colorFamily",
    "colorRole",
    "icon",
    "$schema",
];

fn pick(from: &Value, into: &mut Fields) {
    let Some(o) = from.as_object() else { return };
    for k in NAMING_FIELDS {
        if let Some(v) = o.get(k) {
            into.entry(k.to_string()).or_insert_with(|| v.clone());
        }
    }
}

/// Fields of a token's structured name.
pub fn token_fields(raw: &Value) -> Fields {
    let mut f = Fields::new();
    if let Some(name) = raw.get("name") {
        pick(name, &mut f);
    }
    if let Some(s) = raw.get("$schema") {
        f.insert("$schema".into(), s.clone());
    }
    f
}

/// Fields of a relationship record that carries its own value: scope, scope options and the
/// record's own flat fields.
pub fn relationship_fields(raw: &Value) -> Fields {
    let mut f = Fields::new();
    if let Some(scope) = raw.get("scope") {
        pick(scope, &mut f);
        if let Some(o) = scope.get("options") {
            pick(o, &mut f);
        }
    }
    pick(raw, &mut f);
    f
}

/// Legacy key to the record behind it. A token wins over a relationship record of the same key.
pub fn source_index(graph: &TokenGraph) -> HashMap<String, (SourceKind, String, Fields)> {
    let mut m = HashMap::new();
    for r in &graph.relationships {
        let (Some(k), Some(id)) = (
            r.raw.get("legacyKey").and_then(Value::as_str),
            r.raw.get("uuid").and_then(Value::as_str),
        ) else {
            continue;
        };
        m.entry(k.to_string()).or_insert((
            SourceKind::Relationship,
            id.to_string(),
            relationship_fields(&r.raw),
        ));
    }
    for t in graph.tokens.values() {
        let (Some(k), Some(id)) = (
            t.raw.get("name").and_then(extract_legacy_key),
            t.raw.get("uuid").and_then(Value::as_str),
        ) else {
            continue;
        };
        m.insert(k, (SourceKind::Token, id.to_string(), token_fields(&t.raw)));
    }
    m
}

fn s<'a>(f: &'a Fields, k: &str) -> Option<&'a str> {
    f.get(k).and_then(Value::as_str)
}

fn sentence(words: &str) -> String {
    let w = words.replace('-', " ");
    let mut c = w.chars();
    c.next()
        .map(|f| f.to_uppercase().chain(c).collect())
        .unwrap_or_default()
}

fn long_form(field: &str, id: &str) -> String {
    RegistryData::embedded()
        .token_name(field, id)
        .unwrap_or(id)
        .to_string()
}

fn size_words(id: &str, upper: bool) -> String {
    if upper {
        id.to_uppercase()
    } else {
        sentence(&long_form("size", id))
    }
}

fn is_number(v: &Value) -> Option<String> {
    v.as_i64().map(|n| n.to_string())
}

/// Collections made of colors, by the public collection name.
fn is_color(collection: &str) -> bool {
    collection.contains("Color")
}

/// The name a record would get in a public collection. Conventions, from the existing names:
/// Layout and Iconography are sentence case, `Owner/Part/Property/Option/Size`; Typography is
/// `Owner/Family/Emphasis/Property`; colors are `Palette/<hue>/<index>`, `Alias/...`,
/// `Component/<component>/<part>/<property>/<state>` and `Icon/...` in lower-case kebab,
/// and anything else keeps its legacy key. `None` when there is nothing to name from.
pub fn generate_name(collection: &str, legacy_key: &str, f: &Fields) -> Option<String> {
    if f.is_empty() {
        return None;
    }
    if is_color(collection) {
        return Some(color_name(legacy_key, f));
    }
    let typography = collection == "Typography";
    let mut seg: Vec<String> = Vec::new();
    let owner = s(f, "component")
        .or_else(|| s(f, "structure"))
        .or_else(|| s(f, "icon"));
    if let Some(o) = owner {
        seg.push(sentence(o));
    }
    if let Some(p) = s(f, "part").or_else(|| s(f, "anatomy")) {
        seg.push(sentence(p));
    }
    let mut property = s(f, "property")?;
    // A scale index fused into the property ("font-size-1100") is named once, by the index.
    if let Some(n) = f.get("scaleIndex").and_then(is_number) {
        property = property.strip_suffix(&format!("-{n}")).unwrap_or(property);
    }
    let prop_seg = |seg: &mut Vec<String>| match property.split_once('-') {
        Some((a @ ("padding" | "gap" | "margin"), b @ ("horizontal" | "vertical"))) => {
            seg.push(sentence(a));
            seg.push(sentence(b));
        }
        _ => seg.push(sentence(property)),
    };
    if typography {
        for k in ["script", "family"] {
            if let Some(v) = s(f, k) {
                seg.push(sentence(v));
            }
        }
        if let Some(e) = s(f, "emphasis") {
            seg.extend(e.split('-').map(sentence));
        }
        prop_seg(&mut seg);
    } else {
        prop_seg(&mut seg);
        for k in ["variant", "position", "emphasis"] {
            if let Some(v) = s(f, k) {
                seg.push(sentence(v));
            }
        }
    }
    if let Some(sz) = s(f, "size") {
        seg.push(size_words(sz, typography));
    }
    if let Some(n) = f.get("scaleIndex").and_then(is_number) {
        seg.push(n);
    }
    if let Some(states) = f.get("state").and_then(Value::as_array) {
        seg.extend(states.iter().filter_map(Value::as_str).map(sentence));
    }
    seg.dedup();
    Some(seg.join("/"))
}

fn color_name(legacy_key: &str, f: &Fields) -> String {
    let kebab = |v: &str| v.to_string();
    let index = f.get("scaleIndex").and_then(is_number);
    let states: Vec<&str> = f
        .get("state")
        .and_then(Value::as_array)
        .map(|a| a.iter().filter_map(Value::as_str).collect())
        .unwrap_or_default();
    let owner = s(f, "component");
    if owner.is_none() && s(f, "icon").is_none() {
        if let Some(h) = s(f, "colorFamily") {
            let mut p = vec!["Palette".to_string()];
            if let Some(v) = s(f, "variant") {
                p.push(kebab(v));
            }
            p.push(kebab(h));
            p.extend(index);
            return p.join("/");
        }
        if let Some(r) = s(f, "colorRole") {
            let mut p = vec!["Alias".to_string(), kebab(r)];
            p.extend(index);
            p.extend(states.iter().map(|x| kebab(x)));
            return p.join("/");
        }
    }
    if let Some(c) = owner {
        let mut p = vec!["Component".to_string(), kebab(c)];
        for k in ["part", "anatomy"] {
            if let Some(v) = s(f, k) {
                p.push(kebab(v));
            }
        }
        if let Some(v) = s(f, "property") {
            p.push(kebab(v));
        }
        p.extend(states.iter().map(|x| kebab(x)));
        return p.join("/");
    }
    if let Some(i) = s(f, "icon") {
        let mut p = vec!["Icon".to_string(), kebab(i)];
        if let Some(v) = s(f, "property") {
            p.push(kebab(v));
        }
        p.extend(states.iter().map(|x| kebab(x)));
        return p.join("/");
    }
    legacy_key.to_string()
}

fn words(s: &str) -> BTreeSet<String> {
    s.to_lowercase()
        .split(|c: char| !c.is_ascii_alphanumeric())
        .filter(|w| !w.is_empty())
        .map(String::from)
        .collect()
}

/// Compare a generated name with the designer's.
pub fn classify(designer: &str, generated: Option<&str>) -> MatchClass {
    let Some(g) = generated else {
        return MatchClass::Unresolved;
    };
    if g == designer {
        return MatchClass::Identical;
    }
    if g.eq_ignore_ascii_case(designer) {
        return MatchClass::CaseOnly;
    }
    let (a, b) = (words(g), words(designer));
    if a == b {
        MatchClass::Reordered
    } else if a.is_subset(&b) || b.is_subset(&a) {
        MatchClass::AddsOrDropsWords
    } else {
        MatchClass::Different
    }
}

fn hidden_prefix(collection: &str) -> bool {
    collection.starts_with('.')
}

/// Pair every public variable with its hidden variable and design-data record, and list the
/// hidden variables that have no public alias.
pub fn report(
    meta: &VariablesMeta,
    sources: &HashMap<String, (SourceKind, String, Fields)>,
) -> Report {
    let coll_name = |id: &str| {
        meta.variable_collections
            .get(id)
            .map(|c| c.name.as_str())
            .unwrap_or("")
    };
    let legacy_of = |hidden: &str| hidden.split_once('/').map(|x| x.1.to_string());
    let mut aliased: BTreeSet<&str> = BTreeSet::new();
    let mut rows = Vec::new();
    for v in meta.variables.values() {
        let c = meta.variable_collections.get(&v.variable_collection_id);
        let Some(c) = c else { continue };
        if c.remote || v.remote || hidden_prefix(&c.name) {
            continue;
        }
        // Every mode's alias, in mode-id order. The first names the row; all of them count as
        // aliased, so a hidden variable reached from another mode is not "hidden only".
        let mut modes: Vec<(&String, &Value)> = v.values_by_mode.iter().collect();
        modes.sort_by_key(|(id, _)| *id);
        let targets: Vec<&crate::types::FigmaVariable> = modes
            .iter()
            .filter_map(|(_, x)| x.get("id").and_then(Value::as_str))
            .filter_map(|id| meta.variables.get(id))
            .filter(|t| hidden_prefix(coll_name(&t.variable_collection_id)))
            .collect();
        let Some(target) = targets.first() else {
            continue;
        };
        let Some(legacy) = legacy_of(&target.name) else {
            continue;
        };
        aliased.extend(targets.iter().map(|t| t.id.as_str()));
        let src = sources.get(&legacy);
        let generated = src.and_then(|(_, _, f)| generate_name(&c.name, &legacy, f));
        rows.push(PublicRow {
            collection: c.name.clone(),
            designer_name: v.name.clone(),
            key: v.key.clone(),
            legacy_key: legacy,
            hidden_from_publishing: v.hidden_from_publishing,
            source: src.map_or(SourceKind::None, |x| x.0),
            source_id: src.map(|x| x.1.clone()),
            class: match (src, &generated) {
                (Some(_), None) => MatchClass::Unnameable,
                _ => classify(&v.name, generated.as_deref()),
            },
            generated_name: generated,
        });
    }
    rows.sort_by(|a, b| (&a.collection, &a.designer_name).cmp(&(&b.collection, &b.designer_name)));

    let mut hidden_only = Vec::new();
    for v in meta.variables.values() {
        let Some(c) = meta.variable_collections.get(&v.variable_collection_id) else {
            continue;
        };
        if c.remote || !hidden_prefix(&c.name) || aliased.contains(v.id.as_str()) {
            continue;
        }
        let Some(legacy) = legacy_of(&v.name) else {
            continue;
        };
        let src = sources.get(&legacy);
        // The public collection a new alias would go to.
        let collection = src.map(|(_, _, f)| collection_for(&c.name, f));
        hidden_only.push(HiddenOnlyRow {
            generated_name: src
                .zip(collection.as_deref())
                .and_then(|((_, _, f), col)| generate_name(col, &legacy, f)),
            hidden_name: v.name.clone(),
            legacy_key: legacy,
            source: src.map_or(SourceKind::None, |x| x.0),
            source_id: src.map(|x| x.1.clone()),
            collection,
        });
    }
    hidden_only.sort_by(|a, b| a.hidden_name.cmp(&b.hidden_name));

    let mut summary: BTreeMap<String, BTreeMap<String, usize>> = BTreeMap::new();
    for r in &rows {
        let class = serde_json::to_value(r.class)
            .ok()
            .and_then(|v| v.as_str().map(String::from))
            .unwrap_or_default();
        *summary
            .entry(r.collection.clone())
            .or_default()
            .entry(class)
            .or_default() += 1;
    }
    Report {
        rows,
        hidden_only,
        summary,
    }
}

fn md_cell(v: &str) -> String {
    v.replace('|', "\\|")
}

fn csv_cell(v: &str) -> String {
    if v.contains([',', '"', '\n']) {
        format!("\"{}\"", v.replace('"', "\"\""))
    } else {
        v.to_string()
    }
}

impl Report {
    /// Every row as CSV: public variables first, then hidden-only variables.
    pub fn to_csv(&self) -> String {
        let mut out = String::from(
            "kind,collection,designer_name,generated_name,class,legacy_key,source,source_id,key,hidden_from_publishing\n",
        );
        let kind = |k: SourceKind| {
            serde_json::to_value(k)
                .ok()
                .and_then(|v| v.as_str().map(String::from))
                .unwrap_or_default()
        };
        for r in &self.rows {
            let class = serde_json::to_value(r.class)
                .ok()
                .and_then(|v| v.as_str().map(String::from))
                .unwrap_or_default();
            let cells = [
                "public",
                &r.collection,
                &r.designer_name,
                r.generated_name.as_deref().unwrap_or(""),
                &class,
                &r.legacy_key,
                &kind(r.source),
                r.source_id.as_deref().unwrap_or(""),
                &r.key,
                if r.hidden_from_publishing {
                    "true"
                } else {
                    "false"
                },
            ];
            out.push_str(&cells.map(csv_cell).join(","));
            out.push('\n');
        }
        for r in &self.hidden_only {
            let cells = [
                "hidden-only",
                r.collection.as_deref().unwrap_or(""),
                "",
                r.generated_name.as_deref().unwrap_or(""),
                "",
                &r.legacy_key,
                &kind(r.source),
                r.source_id.as_deref().unwrap_or(""),
                "",
                "",
            ];
            out.push_str(&cells.map(csv_cell).join(","));
            out.push('\n');
        }
        out
    }

    /// A summary with a few examples per match class, for the Design session.
    pub fn to_markdown(&self) -> String {
        let mut out = String::from("# Public variable names: designer vs generated\n\n");
        out.push_str("| Collection | Class | Count |\n| --- | --- | ---: |\n");
        for (c, classes) in &self.summary {
            for (class, n) in classes {
                out.push_str(&format!("| {c} | {class} | {n} |\n"));
            }
        }
        out.push_str(&format!(
            "\n{} hidden variables have no public alias yet.\n",
            self.hidden_only.len()
        ));
        let mut by_class: BTreeMap<String, Vec<&PublicRow>> = BTreeMap::new();
        for r in &self.rows {
            let class = serde_json::to_value(r.class)
                .ok()
                .and_then(|v| v.as_str().map(String::from))
                .unwrap_or_default();
            by_class.entry(class).or_default().push(r);
        }
        for (class, rows) in by_class {
            out.push_str(&format!(
                "\n## {class}\n\n| Designer | Generated |\n| --- | --- |\n"
            ));
            for r in rows.iter().step_by((rows.len() / 8).max(1)).take(8) {
                out.push_str(&format!(
                    "| {} | {} |\n",
                    md_cell(&r.designer_name),
                    md_cell(r.generated_name.as_deref().unwrap_or(""))
                ));
            }
        }
        out
    }
}

/// The public collection for a record: colors go to `S2.Color-theme`, everything else to
/// `Layout`, `Typography` or `Iconography` by what it is.
pub fn collection_for(hidden_collection: &str, f: &Fields) -> String {
    if hidden_collection == ".Color theme" {
        return "S2.Color-theme".into();
    }
    let property = s(f, "property").unwrap_or("");
    let schema = s(f, "$schema").unwrap_or("");
    if schema.contains("font") || property.starts_with("font-") || property.contains("line-height")
    {
        "Typography".into()
    } else if f.contains_key("icon") || property.contains("icon") {
        "Iconography".into()
    } else {
        "Layout".into()
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn fields(v: Value) -> Fields {
        v.as_object().cloned().unwrap()
    }

    #[test]
    fn layout_names_are_owner_part_property_option_size() {
        let f = fields(
            json!({"component": "collection-card", "property": "minimum-height", "variant": "hero", "size": "xl"}),
        );
        assert_eq!(
            generate_name("Layout", "x", &f).as_deref(),
            Some("Collection card/Minimum height/Hero/Extra large")
        );
        let f = fields(json!({"structure": "base", "property": "padding-horizontal", "size": "m"}));
        assert_eq!(
            generate_name("Layout", "x", &f).as_deref(),
            Some("Base/Padding/Horizontal/Medium")
        );
        let f = fields(
            json!({"structure": "accessory", "anatomy": "item", "property": "padding", "size": "xxs"}),
        );
        assert_eq!(
            generate_name("Layout", "x", &f).as_deref(),
            Some("Accessory/Item/Padding/2x small")
        );
    }

    #[test]
    fn typography_names_lead_with_family_and_emphasis() {
        let f = fields(
            json!({"component": "heading", "family": "sans-serif", "emphasis": "heavy-strong", "property": "font-weight"}),
        );
        assert_eq!(
            generate_name("Typography", "x", &f).as_deref(),
            Some("Heading/Sans serif/Heavy/Strong/Font weight")
        );
    }

    #[test]
    fn color_names_use_palette_alias_and_component_groups() {
        let hue =
            fields(json!({"property": "color", "colorFamily": "seafoam", "scaleIndex": 1000}));
        assert_eq!(
            generate_name("S2.Color-theme", "seafoam-1000", &hue).as_deref(),
            Some("Palette/seafoam/1000")
        );
        let comp = fields(
            json!({"component": "menu-item", "property": "background-color", "state": ["default"]}),
        );
        assert_eq!(
            generate_name("S2.Color-theme", "k", &comp).as_deref(),
            Some("Component/menu-item/background-color/default")
        );
        let other = fields(json!({"property": "opacity", "scaleIndex": 200}));
        assert_eq!(
            generate_name("S2.Color-theme", "opacity-200", &other).as_deref(),
            Some("opacity-200")
        );
    }

    #[test]
    fn classify_separates_case_order_and_words() {
        assert_eq!(classify("A/B", Some("A/B")), MatchClass::Identical);
        assert_eq!(classify("A/B", Some("a/b")), MatchClass::CaseOnly);
        assert_eq!(
            classify("Drop shadow/Dragged/X", Some("Dragged/Drop shadow/X")),
            MatchClass::Reordered
        );
        assert_eq!(
            classify("Font size/800", Some("Font size/800/Large")),
            MatchClass::AddsOrDropsWords
        );
        assert_eq!(
            classify("Palette/gray/100", Some("Color/Gray/100")),
            MatchClass::Different
        );
        assert_eq!(classify("A", None), MatchClass::Unresolved);
    }

    #[test]
    fn modes_pair_deterministically_and_every_aliased_hidden_variable_counts() {
        let meta: VariablesMeta = serde_json::from_value(json!({
            "variableCollections": {
                "c1": {"id": "c1", "name": "Layout", "key": "k", "modes": [{"modeId": "a", "name": "A"}, {"modeId": "b", "name": "B"}], "defaultModeId": "a", "variableIds": ["v1"]},
                "c2": {"id": "c2", "name": ".Platform scale", "key": "k2", "modes": [{"modeId": "m2", "name": "Desktop"}], "defaultModeId": "m2", "variableIds": ["h1", "h2"], "hiddenFromPublishing": true}
            },
            "variables": {
                "v1": {"id": "v1", "name": "Pad", "key": "pk", "variableCollectionId": "c1", "resolvedType": "FLOAT",
                    "valuesByMode": {"b": {"type": "VARIABLE_ALIAS", "id": "h2"}, "a": {"type": "VARIABLE_ALIAS", "id": "h1"}}},
                "h1": {"id": "h1", "name": "platformScale/pad-a", "key": "hk1", "variableCollectionId": "c2", "resolvedType": "FLOAT", "valuesByMode": {"m2": 1}},
                "h2": {"id": "h2", "name": "platformScale/pad-b", "key": "hk2", "variableCollectionId": "c2", "resolvedType": "FLOAT", "valuesByMode": {"m2": 2}}
            }
        }))
        .unwrap();
        for _ in 0..20 {
            let r = report(&meta, &HashMap::new());
            assert_eq!(r.rows[0].legacy_key, "pad-a");
            assert!(r.hidden_only.is_empty(), "{:?}", r.hidden_only);
        }
    }

    #[test]
    fn a_record_without_a_property_is_unnameable_not_unresolved() {
        let meta: VariablesMeta = serde_json::from_value(json!({
            "variableCollections": {
                "c1": {"id": "c1", "name": "Layout", "key": "k", "modes": [{"modeId": "a", "name": "A"}], "defaultModeId": "a", "variableIds": ["v1"]},
                "c2": {"id": "c2", "name": ".Platform scale", "key": "k2", "modes": [{"modeId": "m2", "name": "Desktop"}], "defaultModeId": "m2", "variableIds": ["h1"], "hiddenFromPublishing": true}
            },
            "variables": {
                "v1": {"id": "v1", "name": "X", "key": "pk", "variableCollectionId": "c1", "resolvedType": "FLOAT", "valuesByMode": {"a": {"type": "VARIABLE_ALIAS", "id": "h1"}}},
                "h1": {"id": "h1", "name": "platformScale/x", "key": "hk1", "variableCollectionId": "c2", "resolvedType": "FLOAT", "valuesByMode": {"m2": 1}}
            }
        }))
        .unwrap();
        let mut sources = HashMap::new();
        sources.insert(
            "x".to_string(),
            (
                SourceKind::Token,
                "u".to_string(),
                fields(json!({"component": "c"})),
            ),
        );
        assert_eq!(
            report(&meta, &sources).rows[0].class,
            MatchClass::Unnameable
        );
    }

    #[test]
    fn markdown_cells_escape_pipes() {
        assert_eq!(md_cell("a|b"), "a\\|b");
    }

    #[test]
    fn report_pairs_public_with_hidden_and_lists_hidden_only() {
        let meta: VariablesMeta = serde_json::from_value(json!({
            "variableCollections": {
                "c1": {"id": "c1", "name": "Layout", "key": "k", "modes": [{"modeId": "m", "name": "Modeless"}], "defaultModeId": "m", "variableIds": ["v1"]},
                "c2": {"id": "c2", "name": ".Platform scale", "key": "k2", "modes": [{"modeId": "m2", "name": "Desktop"}], "defaultModeId": "m2", "variableIds": ["h1", "h2"], "hiddenFromPublishing": true}
            },
            "variables": {
                "v1": {"id": "v1", "name": "Banner/Gap/Horizontal", "key": "pubkey", "variableCollectionId": "c1", "resolvedType": "FLOAT", "valuesByMode": {"m": {"type": "VARIABLE_ALIAS", "id": "h1"}}},
                "h1": {"id": "h1", "name": "platformScale/banner-gap-horizontal", "key": "hk1", "variableCollectionId": "c2", "resolvedType": "FLOAT", "valuesByMode": {"m2": 8}, "hiddenFromPublishing": true},
                "h2": {"id": "h2", "name": "platformScale/banner-gap-vertical", "key": "hk2", "variableCollectionId": "c2", "resolvedType": "FLOAT", "valuesByMode": {"m2": 4}, "hiddenFromPublishing": true}
            }
        }))
        .unwrap();
        let mut sources = HashMap::new();
        sources.insert(
            "banner-gap-horizontal".to_string(),
            (
                SourceKind::Token,
                "u1".to_string(),
                fields(json!({"structure": "banner", "property": "gap-horizontal"})),
            ),
        );
        sources.insert(
            "banner-gap-vertical".to_string(),
            (
                SourceKind::Token,
                "u2".to_string(),
                fields(json!({"structure": "banner", "property": "gap-vertical"})),
            ),
        );
        let r = report(&meta, &sources);
        assert_eq!(r.rows.len(), 1);
        assert_eq!(r.rows[0].key, "pubkey");
        assert_eq!(r.rows[0].legacy_key, "banner-gap-horizontal");
        assert_eq!(r.hidden_only.len(), 1);
        assert_eq!(
            r.hidden_only[0].hidden_name,
            "platformScale/banner-gap-vertical"
        );
        assert_eq!(r.hidden_only[0].collection.as_deref(), Some("Layout"));
    }
}
