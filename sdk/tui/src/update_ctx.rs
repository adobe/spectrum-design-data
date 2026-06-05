// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `UpdateCtx` — read-only external context for the pure `update` function.
//!
//! Kept in its own module so `update.rs` stays within the 800-LOC architectural
//! budget enforced by `tests/budget.rs`.

use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

use design_data_core::graph::TokenGraph;
use design_data_core::query::TokenIndex;
use design_data_core::schema::SchemaRegistry;

use crate::wizard::WizardCtx;

// ── External context ──────────────────────────────────────────────────────────

/// Read-only external context passed into `update` alongside the message.
///
/// Combines the fields of `SubmitContext` and `WizardCtx` so `update` is a
/// single entry point regardless of which command or modal is active.
pub struct UpdateCtx<'a> {
    pub graph: &'a TokenGraph,
    pub dataset_path: Option<&'a Path>,
    pub components_dir: Option<&'a Path>,
    /// Shared so side-effect `Task::Cmd` closures (e.g. `validate`, wizard write)
    /// can own a cheap `Arc` clone and satisfy the `Send + 'static` bound.
    pub schema_registry: Option<Arc<SchemaRegistry>>,
    pub mode_sets_dir: Option<&'a Path>,
    pub token_index: TokenIndex,
    pub mode_set_restrictions: HashMap<String, Vec<String>>,
    pub allow_write: bool,
}

impl<'a> UpdateCtx<'a> {
    /// Minimal context for tests that only need key/palette/modal behavior.
    ///
    /// For tests that also need IO-path fields (e.g. `dataset_path`,
    /// `schema_registry`, `components_dir`), use [`UpdateCtx::builder`] instead.
    pub fn minimal(graph: &'a TokenGraph) -> Self {
        Self {
            graph,
            dataset_path: None,
            components_dir: None,
            schema_registry: None,
            mode_sets_dir: None,
            token_index: TokenIndex::build(graph),
            mode_set_restrictions: HashMap::new(),
            allow_write: false,
        }
    }

    /// Fluent builder for tests that need IO-path fields beyond `minimal`.
    ///
    /// ```ignore
    /// let ctx = UpdateCtx::builder(&graph)
    ///     .dataset_path(tmp.path())
    ///     .schema_registry(Arc::new(registry))
    ///     .allow_write()
    ///     .build();
    /// ```
    pub fn builder(graph: &'a TokenGraph) -> UpdateCtxBuilder<'a> {
        UpdateCtxBuilder::new(graph)
    }

    pub(crate) fn as_wizard_ctx(&self) -> WizardCtx<'_> {
        WizardCtx {
            graph: self.graph,
            token_index: self.token_index.clone(),
            dataset_path: self.dataset_path,
            schema_registry: self.schema_registry.as_deref(),
            allow_write: self.allow_write,
        }
    }
}

// ── UpdateCtxBuilder ─────────────────────────────────────────────────────────

/// Fluent builder for [`UpdateCtx`].
///
/// Start with [`UpdateCtx::builder`] (or [`UpdateCtxBuilder::new`]) and call
/// only the setters you need; `build()` derives `token_index` automatically
/// and leaves everything else as `None` / `false`.
///
/// For tests that only exercise key/palette/modal behavior, [`UpdateCtx::minimal`]
/// is simpler.
pub struct UpdateCtxBuilder<'a> {
    graph: &'a TokenGraph,
    dataset_path: Option<&'a Path>,
    components_dir: Option<&'a Path>,
    schema_registry: Option<Arc<SchemaRegistry>>,
    mode_sets_dir: Option<&'a Path>,
    mode_set_restrictions: HashMap<String, Vec<String>>,
    allow_write: bool,
}

impl<'a> UpdateCtxBuilder<'a> {
    pub fn new(graph: &'a TokenGraph) -> Self {
        Self {
            graph,
            dataset_path: None,
            components_dir: None,
            schema_registry: None,
            mode_sets_dir: None,
            mode_set_restrictions: HashMap::new(),
            allow_write: false,
        }
    }

    pub fn dataset_path(mut self, path: &'a Path) -> Self {
        self.dataset_path = Some(path);
        self
    }

    pub fn components_dir(mut self, dir: &'a Path) -> Self {
        self.components_dir = Some(dir);
        self
    }

    pub fn schema_registry(mut self, registry: Arc<SchemaRegistry>) -> Self {
        self.schema_registry = Some(registry);
        self
    }

    pub fn mode_sets_dir(mut self, dir: &'a Path) -> Self {
        self.mode_sets_dir = Some(dir);
        self
    }

    pub fn mode_set_restrictions(mut self, r: HashMap<String, Vec<String>>) -> Self {
        self.mode_set_restrictions = r;
        self
    }

    /// Enable writes; equivalent to `allow_write: true`.
    pub fn allow_write(mut self) -> Self {
        self.allow_write = true;
        self
    }

    /// Consume the builder and produce an [`UpdateCtx`].
    ///
    /// `token_index` is derived from `graph` automatically.
    pub fn build(self) -> UpdateCtx<'a> {
        UpdateCtx {
            token_index: TokenIndex::build(self.graph),
            graph: self.graph,
            dataset_path: self.dataset_path,
            components_dir: self.components_dir,
            schema_registry: self.schema_registry,
            mode_sets_dir: self.mode_sets_dir,
            mode_set_restrictions: self.mode_set_restrictions,
            allow_write: self.allow_write,
        }
    }
}
