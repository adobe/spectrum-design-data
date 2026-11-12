// Copyright 2026 Adobe. All rights reserved.
use design_data_core::value_resolution::{evaluate, Request};
use miette::IntoDiagnostic;
use std::io::Read;
use std::process::ExitCode;

pub fn run() -> miette::Result<ExitCode> {
    let mut input = String::new();
    std::io::stdin()
        .read_to_string(&mut input)
        .into_diagnostic()?;
    let request: Request = serde_json::from_str(&input).into_diagnostic()?;
    println!(
        "{}",
        serde_json::to_string(&evaluate(request)).into_diagnostic()?
    );
    Ok(ExitCode::SUCCESS)
}
