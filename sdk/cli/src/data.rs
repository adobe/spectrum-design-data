// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `data` subcommand — create/edit non-token data categories.
//!
//! All output is JSON written to stdout; exit code 1 on error.

use std::io::Read;
use std::path::PathBuf;
use std::process::ExitCode;

use clap::Subcommand;
use design_data_core::authoring::data_object::{write_data_object, DataCategory, DataWriteMode};

// ── Clap types ────────────────────────────────────────────────────────────────

/// Non-token data categories.
#[derive(clap::ValueEnum, Clone, Debug)]
pub enum CategoryArg {
    Components,
    Fields,
    Registry,
    #[value(name = "mode-sets")]
    ModeSets,
    Guidelines,
}

impl From<CategoryArg> for DataCategory {
    fn from(a: CategoryArg) -> Self {
        match a {
            CategoryArg::Components => DataCategory::Components,
            CategoryArg::Fields => DataCategory::Fields,
            CategoryArg::Registry => DataCategory::Registry,
            CategoryArg::ModeSets => DataCategory::ModeSets,
            CategoryArg::Guidelines => DataCategory::Guidelines,
        }
    }
}

#[derive(Subcommand, Debug)]
pub enum DataCommand {
    /// Create a new data object (fails if the file already exists).
    Create {
        /// Category to create in.
        #[arg(long, value_enum)]
        category: CategoryArg,
        /// JSON file to read, or `-` for stdin.
        #[arg(long, value_name = "FILE")]
        file: String,
        /// Dataset root (default: current directory).
        #[arg(long, value_name = "DIR")]
        dataset: Option<PathBuf>,
        /// design-data-spec schemas dir (default: probed from dataset root).
        #[arg(long, value_name = "DIR")]
        spec_schemas: Option<PathBuf>,
    },
    /// Edit an existing data object (fails if the file does not exist).
    Edit {
        /// Category to edit in.
        #[arg(long, value_enum)]
        category: CategoryArg,
        /// JSON file to read, or `-` for stdin.
        #[arg(long, value_name = "FILE")]
        file: String,
        /// Dataset root (default: current directory).
        #[arg(long, value_name = "DIR")]
        dataset: Option<PathBuf>,
        /// design-data-spec schemas dir (default: probed from dataset root).
        #[arg(long, value_name = "DIR")]
        spec_schemas: Option<PathBuf>,
    },
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

pub fn run(cmd: DataCommand) -> ExitCode {
    match run_inner(cmd) {
        Ok(json) => {
            println!("{json}");
            ExitCode::SUCCESS
        }
        Err(msg) => {
            eprintln!("data error: {msg}");
            ExitCode::FAILURE
        }
    }
}

fn run_inner(cmd: DataCommand) -> Result<String, String> {
    let (category, file, dataset, spec_schemas, mode) = match cmd {
        DataCommand::Create {
            category,
            file,
            dataset,
            spec_schemas,
        } => (category, file, dataset, spec_schemas, DataWriteMode::Create),
        DataCommand::Edit {
            category,
            file,
            dataset,
            spec_schemas,
        } => (category, file, dataset, spec_schemas, DataWriteMode::Edit),
    };

    // Read document from file or stdin.
    let json_text = if file == "-" {
        let mut buf = String::new();
        std::io::stdin()
            .read_to_string(&mut buf)
            .map_err(|e| format!("failed to read stdin: {e}"))?;
        buf
    } else {
        std::fs::read_to_string(&file).map_err(|e| format!("failed to read {file}: {e}"))?
    };

    let doc: serde_json::Value =
        serde_json::from_str(&json_text).map_err(|e| format!("invalid JSON: {e}"))?;

    let dataset_root = dataset.unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    let schemas_dir = spec_schemas
        .or_else(|| probe_spec_schemas(&dataset_root))
        .ok_or_else(|| {
            "design-data-spec schemas not found; pass --spec-schemas <DIR>".to_string()
        })?;

    let result = write_data_object(&dataset_root, &schemas_dir, category.into(), mode, &doc)
        .map_err(|e| e.to_string())?;

    serde_json::to_string_pretty(&result).map_err(|e| format!("serialize result: {e}"))
}

/// Probe common spec-schemas locations relative to the dataset root and cwd.
fn probe_spec_schemas(dataset_root: &std::path::Path) -> Option<PathBuf> {
    let cwd = std::env::current_dir().unwrap_or_default();
    let candidates = [
        dataset_root.join("../design-data-spec/schemas"),
        cwd.join("packages/design-data-spec/schemas"),
        cwd.join("../packages/design-data-spec/schemas"),
        cwd.join("../design-data-spec/schemas"),
    ];
    candidates
        .into_iter()
        .find(|c| c.join("field.schema.json").is_file())
}
