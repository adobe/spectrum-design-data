// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Convert a Figma Variables snapshot back into manifest `overrides` entries.
//!
//! Reverse of [`super::mapping::build_export_payload`]: for each non-remote
//! Figma variable, inverts its `{prefix}/{legacyKey}` name back to a source
//! token, collapses its per-mode values into one, and diffs against that
//! token's currently-resolved value. An override is emitted only when the
//! Figma value actually diverged — re-running import on an unedited file
//! produces an empty `overrides` array.
//!
//! Split into submodules by responsibility: [`naming`] inverts a Figma
//! variable name back to a legacy key; [`resolve`] is the shared core for
//! resolving and comparing a variable's (possibly per-mode, possibly
//! aliased) value; [`overrides`], [`diff`], and [`pair`] are the three public
//! entry points built on top of that core.

mod diff;
mod naming;
mod overrides;
mod pair;
mod resolve;
#[cfg(test)]
mod tests;

pub use diff::{diff_values, DiffClass, DiffCounts, DiffEntry, DiffReport, ModeDiff};
pub use overrides::{build_import_overrides, ImportSummary};
pub use pair::{pair_by_value, PairingCandidate, PairingReport};
