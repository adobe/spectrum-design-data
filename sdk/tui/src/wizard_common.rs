// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Shared types and constants used by two or more wizard modules.
//!
//! - `classification`: Screen 2 (Classification) draft types and helpers, shared
//!   between the authoring wizard (`wizard`) and naming wizard (`naming`).
//! - `caps`: Display-cap constants for suggestion/autocomplete lists.
//! - `facet`: Shared `FacetOption` type and `field_suggestions` helper used by
//!   the find wizard and the classification screen.

pub mod caps;
pub mod classification;
pub mod facet;
