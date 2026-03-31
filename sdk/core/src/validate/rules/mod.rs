// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

mod spec001;
mod spec002;
mod spec003;
mod spec004;
mod spec005;
mod spec006;
mod spec007;
mod spec008;
mod spec009;
mod spec010;
mod spec011;
mod spec012;
mod spec013;

use std::collections::HashSet;

use crate::graph::TokenGraph;
use crate::report::Diagnostic;
use crate::validate::rule::{ValidationContext, ValidationRule};

/// All default catalog rules (SPEC-001 … SPEC-013).
pub fn default_rules() -> Vec<Box<dyn ValidationRule>> {
    vec![
        Box::new(spec001::Rule),
        Box::new(spec002::Rule),
        Box::new(spec003::Rule),
        Box::new(spec004::Rule),
        Box::new(spec005::Rule),
        Box::new(spec006::Rule),
        Box::new(spec007::Rule),
        Box::new(spec008::Rule),
        Box::new(spec009::Rule),
        Box::new(spec010::Rule),
        Box::new(spec011::Rule),
        Box::new(spec012::Rule),
        Box::new(spec013::Rule),
    ]
}

/// Run every rule and collect diagnostics.
pub fn run_rules(graph: &TokenGraph, naming_exceptions: &HashSet<String>) -> Vec<Diagnostic> {
    let ctx = ValidationContext {
        graph,
        naming_exceptions,
    };
    let mut out = Vec::new();
    for r in default_rules() {
        out.extend(r.validate(&ctx));
    }
    out
}
