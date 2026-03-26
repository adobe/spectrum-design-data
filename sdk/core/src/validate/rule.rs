// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Layer 2 rule trait (catalog ids).

use std::collections::HashSet;

use crate::graph::TokenGraph;
use crate::report::Diagnostic;

/// Context for relational rules.
pub struct ValidationContext<'a> {
    pub graph: &'a TokenGraph,
    /// Token names listed in the naming-exceptions allowlist.
    /// Empty when no exceptions file is loaded.
    pub naming_exceptions: &'a HashSet<String>,
}

/// Catalog-backed validation rule.
pub trait ValidationRule: Send + Sync {
    fn id(&self) -> &'static str;
    fn name(&self) -> &'static str;
    fn validate(&self, ctx: &ValidationContext<'_>) -> Vec<Diagnostic>;
}
