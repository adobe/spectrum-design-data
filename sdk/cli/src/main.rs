// Copyright 2024 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use clap::{Parser, Subcommand};

/// Spectrum Design Data tooling (scaffold — see #722, #726).
#[derive(Parser)]
#[command(name = "design-data", version, about)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Validate design data against schemas and rules (stub)
    Validate {
        /// Path to files or directory to validate
        #[arg(value_name = "PATH")]
        path: Option<std::path::PathBuf>,
    },
}

fn main() -> miette::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Validate { path } => {
            if !design_data_core::validate::engine_ready() {
                miette::bail!("validation engine not ready");
            }
            let target = path
                .as_deref()
                .map(|p| p.display().to_string())
                .unwrap_or_else(|| ".".to_string());
            println!(
                "validate (stub): {} — core crate: {}",
                target,
                design_data_core::crate_name()
            );
            Ok(())
        }
    }
}
