// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Shared test helpers for `data_source` modules.
//!
//! Rust runs tests in parallel by default.  Several resolver tests mutate
//! process-global env vars (`DESIGN_DATA_CACHE_DIR`, `DESIGN_DATA_SCHEMA_ROOT`);
//! they must share one lock.  Embedded-tier tests also need a CWD that cannot
//! ancestor-walk into the monorepo checkout — in CI `TMPDIR` is often inside the
//! workspace, which makes `is_in_repo` return true and breaks Embedded assertions.

use std::sync::{Mutex, MutexGuard};

static ENV_LOCK: Mutex<()> = Mutex::new(());

/// Serialize tests that mutate process-global environment variables.
pub fn env_lock() -> MutexGuard<'static, ()> {
    ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner())
}

/// Temp directory guaranteed not to be inside the monorepo checkout on Unix CI.
pub fn outside_repo_tempdir() -> tempfile::TempDir {
    #[cfg(unix)]
    {
        tempfile::Builder::new()
            .prefix("design-data-outside-repo-")
            .tempdir_in("/tmp")
            .expect("create temp dir under /tmp")
    }
    #[cfg(not(unix))]
    {
        tempfile::TempDir::new().expect("temp dir")
    }
}
