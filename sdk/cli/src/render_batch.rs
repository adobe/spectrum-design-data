// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `design-data render --batch states.json --out <dir>`: render a list of states to SVG plus
//! scene JSON, and `design-data render-compare`: compare those scenes with measured platform
//! values (see `design_data_core::visual_compare`).

use std::collections::{BTreeMap, HashMap};
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use design_data_core::visual::{self, RenderRequest};
use design_data_core::visual_compare::{self, MeasuredFile, Tolerances};
use miette::{IntoDiagnostic, WrapErr};
use serde::Deserialize;
use serde_json::{json, Value};

/// One state of a batch file: a JSON array of these, or `{ "states": [...] }`.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct BatchState {
    /// File stem for the outputs; derived from the other fields when absent.
    id: Option<String>,
    component: String,
    #[serde(default = "m")]
    size: String,
    #[serde(default)]
    states: Vec<String>,
    #[serde(default)]
    options: HashMap<String, Value>,
    #[serde(default = "light")]
    color_scheme: String,
    #[serde(default = "desktop")]
    scale: String,
    #[serde(default = "label")]
    label: String,
    /// `{ "set", "name" }` or `"none"`: replaces or hides the content icon.
    icon: Option<visual::IconOverride>,
    /// A `[platforms.<id>]` entry; the global `--platform` when absent.
    platform: Option<String>,
}

fn m() -> String {
    "m".into()
}
fn light() -> String {
    "light".into()
}
fn desktop() -> String {
    "desktop".into()
}
fn label() -> String {
    "Label".into()
}

fn slug(s: &str) -> String {
    let mut out = String::new();
    for c in s.chars() {
        if c.is_ascii_alphanumeric() || c == '.' {
            out.push(c.to_ascii_lowercase());
        } else if !out.ends_with('-') {
            out.push('-');
        }
    }
    out.trim_matches('-').to_string()
}

fn derived_id(s: &BatchState) -> String {
    let mut parts = vec![s.component.clone(), s.size.clone()];
    if let Some(p) = &s.platform {
        parts.push(p.clone());
    }
    let mut opts: Vec<_> = s.options.iter().collect();
    opts.sort_by_key(|(k, _)| k.as_str());
    parts.extend(opts.iter().map(|(k, v)| match v {
        Value::String(v) => format!("{k}-{v}"),
        v => format!("{k}-{v}"),
    }));
    parts.extend(s.states.iter().cloned());
    parts.push(s.color_scheme.clone());
    parts.push(s.scale.clone());
    slug(&parts.join("-"))
}

fn read_states(file: &Path) -> miette::Result<Vec<BatchState>> {
    let text = std::fs::read_to_string(file)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to read {}", file.display()))?;
    let mut v: Value = serde_json::from_str(&text)
        .into_diagnostic()
        .wrap_err_with(|| format!("{} is not JSON", file.display()))?;
    if let Some(s) = v.get_mut("states") {
        v = s.take();
    }
    serde_json::from_value(v)
        .into_diagnostic()
        .wrap_err("a batch file is an array of states (or {\"states\": [...]}): component, size, states, options, colorScheme, scale, label, platform, id")
}

pub fn run_batch(
    file: &Path,
    out: &Path,
    visuals_path: Option<PathBuf>,
    path: Option<PathBuf>,
) -> miette::Result<ExitCode> {
    let states = read_states(file)?;
    std::fs::create_dir_all(out)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to create {}", out.display()))?;
    let mut envs = HashMap::new();
    let mut seen = std::collections::HashSet::new();
    let mut index = Vec::new();
    let mut failed = 0;
    for st in states {
        let id = st.id.clone().unwrap_or_else(|| derived_id(&st));
        if id.is_empty() || id.contains(['/', '\\']) || id.starts_with('.') {
            return Err(miette::miette!(
                "state id '{id}' is not usable as a file name"
            ));
        }
        if !seen.insert(id.clone()) {
            return Err(miette::miette!(
                "duplicate state id '{id}'; set an explicit \"id\""
            ));
        }
        let env = match envs.entry(st.platform.clone()) {
            std::collections::hash_map::Entry::Occupied(e) => e.into_mut(),
            std::collections::hash_map::Entry::Vacant(e) => e.insert(crate::load_visual_env_for(
                path.clone(),
                visuals_path.clone(),
                true,
                st.platform.clone(),
            )?),
        };
        let result = (|| -> Result<(String, Value, Vec<String>), String> {
            let recipe = &env
                .0
                .visual_recipe(&st.component)
                .ok_or_else(|| format!("no visual recipe for '{}'", st.component))?
                .raw;
            let req = RenderRequest {
                component: env.0.canonical_component(&st.component).to_string(),
                size: st.size.clone(),
                states: st.states.clone(),
                options: st.options.clone(),
                mode: HashMap::from([
                    ("colorScheme".to_string(), st.color_scheme.clone()),
                    ("scale".to_string(), st.scale.clone()),
                ]),
                label: st.label.clone(),
                icon: st.icon.clone(),
            };
            let scene = visual::build_scene(&env.0, recipe, &req)?;
            let value = serde_json::to_value(&scene).map_err(|e| e.to_string())?;
            Ok((visual::scene_to_svg(&scene), value, scene.diagnostics))
        })();
        match result {
            Ok((svg, scene, diagnostics)) => {
                let write = |name: String, body: String| {
                    std::fs::write(out.join(&name), body)
                        .into_diagnostic()
                        .wrap_err_with(|| format!("failed to write {name}"))
                };
                write(format!("{id}.svg"), svg)?;
                write(
                    format!("{id}.scene.json"),
                    serde_json::to_string_pretty(&scene).into_diagnostic()?,
                )?;
                index.push(json!({
                    "id": id, "component": scene["component"], "platform": st.platform,
                    "svg": format!("{id}.svg"), "scene": format!("{id}.scene.json"),
                    "diagnostics": diagnostics,
                }));
            }
            Err(e) => {
                eprintln!("error: {id}: {e}");
                failed += 1;
                index.push(json!({ "id": id, "component": st.component, "platform": st.platform, "error": e }));
            }
        }
    }
    std::fs::write(
        out.join("index.json"),
        serde_json::to_string_pretty(&json!({ "states": index })).into_diagnostic()? + "\n",
    )
    .into_diagnostic()?;
    eprintln!(
        "Rendered {} state(s) to {} ({failed} failed)",
        index.len() - failed,
        out.display()
    );
    Ok(if failed == 0 {
        ExitCode::SUCCESS
    } else {
        ExitCode::from(1)
    })
}

/// Load every `<id>.scene.json` of a batch output directory.
fn read_scenes(dir: &Path) -> miette::Result<BTreeMap<String, Value>> {
    let mut scenes = BTreeMap::new();
    for entry in std::fs::read_dir(dir)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to read {}", dir.display()))?
    {
        let p = entry.into_diagnostic()?.path();
        let Some(id) = p
            .file_name()
            .and_then(|n| n.to_str())
            .and_then(|n| n.strip_suffix(".scene.json"))
        else {
            continue;
        };
        let text = std::fs::read_to_string(&p).into_diagnostic()?;
        let scene = serde_json::from_str(&text)
            .into_diagnostic()
            .wrap_err_with(|| format!("{} is not JSON", p.display()))?;
        scenes.insert(id.to_string(), scene);
    }
    Ok(scenes)
}

pub fn run_compare(
    scenes: &Path,
    measured: &Path,
    tolerances: Vec<String>,
    format: &str,
    output: Option<PathBuf>,
    fail_on_diff: bool,
) -> miette::Result<ExitCode> {
    let scenes = read_scenes(scenes)?;
    let text = std::fs::read_to_string(measured)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to read {}", measured.display()))?;
    let file: MeasuredFile = serde_json::from_str(&text)
        .into_diagnostic()
        .wrap_err_with(|| format!("{} is not a measured-values document", measured.display()))?;
    let mut tol: Option<Tolerances> = file.tolerances;
    for t in tolerances {
        let (k, v) = t
            .split_once('=')
            .ok_or_else(|| miette::miette!("--tolerance expects NAME=VALUE, got '{t}'"))?;
        let v: f64 = v
            .parse()
            .map_err(|_| miette::miette!("--tolerance {k}: '{v}' is not a number"))?;
        tol.get_or_insert_with(Tolerances::default)
            .set(k, v)
            .map_err(|e| miette::miette!(e))?;
    }
    let report = visual_compare::compare(&scenes, &file, tol).map_err(|e| miette::miette!(e))?;
    let body = if format == "markdown" {
        visual_compare::to_markdown(&report)
    } else {
        serde_json::to_string_pretty(&report).into_diagnostic()? + "\n"
    };
    match output {
        Some(p) => std::fs::write(&p, body)
            .into_diagnostic()
            .wrap_err_with(|| format!("failed to write {}", p.display()))?,
        None => print!("{body}"),
    }
    Ok(if fail_on_diff && !report.is_clean() {
        ExitCode::from(1)
    } else {
        ExitCode::SUCCESS
    })
}
