// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Mode-set op form states and handlers (Phase B / si6.3).

use std::path::{Path, PathBuf};

use ratatui::widgets::ListState;
use tui_input::Input;

// ── Operation enum ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ModeSetOp {
    AddMode,
    RenameMode,
    RemoveMode,
    CreateModeSet,
    RemoveModeSet,
}

// ── Mode-set file info ─────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct ModeSetFileInfo {
    pub path: PathBuf,
    pub name: String,
    pub modes: Vec<String>,
    pub default: String,
    pub description: String,
}

// ── Mode-set file picker ───────────────────────────────────────────────────────

pub struct ModeSetPickerState {
    pub files: Vec<ModeSetFileInfo>,
    pub filtered: Vec<usize>,
    pub filter: Input,
    pub list_state: ListState,
}

impl ModeSetPickerState {
    pub fn new(mode_sets_dir: &Path) -> Result<Self, String> {
        let mut files = Vec::new();
        let entries =
            std::fs::read_dir(mode_sets_dir).map_err(|e| format!("reading mode-sets dir: {e}"))?;
        for entry in entries {
            let entry = entry.map_err(|e| format!("dir entry: {e}"))?;
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("json") {
                continue;
            }
            match parse_mode_set_file(&path) {
                Ok(info) => files.push(info),
                Err(_) => continue,
            }
        }
        files.sort_by(|a, b| a.name.cmp(&b.name));
        let n = files.len();
        let mut list_state = ListState::default();
        if n > 0 {
            list_state.select(Some(0));
        }
        Ok(Self {
            filtered: (0..n).collect(),
            files,
            filter: Input::default(),
            list_state,
        })
    }

    pub fn apply_filter(&mut self) {
        let q = self.filter.value().to_lowercase();
        self.filtered = if q.is_empty() {
            (0..self.files.len()).collect()
        } else {
            self.files
                .iter()
                .enumerate()
                .filter(|(_, f)| f.name.to_lowercase().contains(&q))
                .map(|(i, _)| i)
                .collect()
        };
        let max = self.filtered.len().saturating_sub(1);
        let sel = self.list_state.selected().unwrap_or(0).min(max);
        if self.filtered.is_empty() {
            self.list_state.select(None);
        } else {
            self.list_state.select(Some(sel));
        }
    }

    pub fn selected_file(&self) -> Option<&ModeSetFileInfo> {
        let idx = self.list_state.selected()?;
        self.files.get(*self.filtered.get(idx)?)
    }

    pub(super) fn move_sel(&mut self, delta: i32) {
        let n = self.filtered.len();
        if n == 0 {
            return;
        }
        let cur = self.list_state.selected().unwrap_or(0) as i32;
        let next = (cur + delta).clamp(0, n as i32 - 1) as usize;
        self.list_state.select(Some(next));
    }
}

fn parse_mode_set_file(path: &Path) -> Result<ModeSetFileInfo, String> {
    let text = std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
    let value: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))?;
    let obj = value
        .as_object()
        .ok_or_else(|| format!("{}: not a JSON object", path.display()))?;
    let name = obj
        .get("name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| format!("{}: missing 'name'", path.display()))?
        .to_string();
    let default = obj
        .get("default")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let description = obj
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let modes = obj
        .get("modes")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    Ok(ModeSetFileInfo {
        path: path.to_path_buf(),
        name,
        modes,
        default,
        description,
    })
}

// ── Form focus enums ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AddModeFocus {
    Mode,
    MakeDefault,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CreateModeSetFocus {
    Name,
    Modes,
    Description,
}

// ── Form state structs ────────────────────────────────────────────────────────

pub struct AddModeFormState {
    pub file: ModeSetFileInfo,
    pub mode: Input,
    pub make_default: bool,
    pub focus: AddModeFocus,
}

pub struct RenameModeFormState {
    pub file: ModeSetFileInfo,
    pub old_mode: String,
    pub new_mode: Input,
    pub tokens_root: Option<PathBuf>,
}

pub struct CreateModeRow {
    pub value: Input,
}

pub struct CreateModeSetFormState {
    pub name: Input,
    pub modes: Vec<CreateModeRow>,
    pub default_idx: usize,
    pub description: Input,
    pub focus: CreateModeSetFocus,
    pub selected_mode_idx: usize,
    pub mode_sets_dir: Option<PathBuf>,
}

// ── Execute enum ──────────────────────────────────────────────────────────────

pub enum ModeSetExecute {
    AddMode(design_data_core::authoring::mode_set::AddModeInput),
    RenameMode(design_data_core::authoring::mode_set::RenameModeInput),
    RemoveMode(design_data_core::authoring::mode_set::RemoveModeInput),
    CreateModeSet(design_data_core::authoring::mode_set::CreateModeSetInput),
    RemoveModeSet(design_data_core::authoring::mode_set::RemoveModeSetInput),
}

// ── kebab helper ──────────────────────────────────────────────────────────────

pub fn kebab_from_name(name: &str) -> String {
    let mut raw = String::new();
    for (i, ch) in name.chars().enumerate() {
        if ch.is_uppercase() && i > 0 {
            raw.push('-');
        }
        raw.push(ch.to_lowercase().next().unwrap_or(ch));
    }
    // Spaces → hyphens, then collapse consecutive hyphens and trim trailing.
    let mut out = String::new();
    let mut prev_hyphen = false;
    for ch in raw.chars() {
        let is_sep = ch == '-' || ch == ' ';
        if is_sep {
            if !prev_hyphen && !out.is_empty() {
                out.push('-');
            }
            prev_hyphen = true;
        } else {
            out.push(ch);
            prev_hyphen = false;
        }
    }
    out.trim_end_matches('-').to_string()
}
