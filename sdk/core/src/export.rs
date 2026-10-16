// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! The compiled-in plugin seam for *pure* exporters — a one-shot
//! `TokenGraph` + already-resolved winners -> document transform, with no
//! I/O or external protocol of its own (that's what [`TokenExporter::export`]
//! is not: see below).
//!
//! Not every export target fits this shape. Figma's variables integration is
//! bidirectional and network-coupled (fetch live variables, diff, POST them
//! back) rather than a one-shot transform, so it intentionally does not
//! implement this trait — it keeps its own CLI subcommands and function API
//! in `design-data-figma` instead. Forcing it through `TokenExporter` would
//! leak a uniform shape that doesn't describe what it actually does.
//!
//! This trait has exactly one implementor today (`design-data-dtcg`'s
//! `DtcgExporter`). It exists as the stable seam a second pure exporter (a
//! plain graph -> document target with no network/fetch step) would plug
//! into, not as a speculative abstraction — see `sdk/plugins/PLUGINS.md`.

use std::collections::HashMap;

use crate::graph::{TokenGraph, TokenRecord};

/// A pure token-graph -> document exporter. `winners` and `mode_ctx` are
/// exactly what [`crate::cascade::resolve_dataset`] and its
/// `ResolutionContext::mode_sets` already produce — this trait doesn't
/// introduce a new resolution step, only a common shape for turning that
/// result into a target document.
pub trait TokenExporter {
    /// Stable identifier matched against a CLI `--format <id>` flag.
    fn format_id(&self) -> &'static str;

    /// Merge the resolved `winners` into one output document.
    fn export(
        &self,
        graph: &TokenGraph,
        winners: &[TokenRecord],
        mode_ctx: &HashMap<String, String>,
    ) -> serde_json::Value;
}
