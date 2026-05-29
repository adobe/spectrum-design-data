// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `Task<Msg>` — the side-effect type returned by `update` (GH #1020).
//!
//! Mirrors iced's `Task` / `Command` constructor menu. The runtime (#1021)
//! is responsible for executing tasks; `update` only produces them.

/// A description of work to run outside the pure `update` function.
pub enum Task<Msg> {
    /// No side effect — the most common return value.
    None,
    /// Run a synchronous closure on a worker thread and feed its result back
    /// as a `Msg`. Used for FS writes, clipboard, and other blocking I/O.
    Cmd(Box<dyn FnOnce() -> Msg + Send + 'static>),
    /// Run several tasks, all of whose results are fed back as messages.
    Batch(Vec<Task<Msg>>),
}

impl<Msg: 'static> Task<Msg> {
    pub fn none() -> Self {
        Task::None
    }

    pub fn cmd(f: impl FnOnce() -> Msg + Send + 'static) -> Self {
        Task::Cmd(Box::new(f))
    }

    pub fn batch(tasks: Vec<Task<Msg>>) -> Self {
        Task::Batch(tasks)
    }

    /// Return true if this task has no work to do.
    pub fn is_none(&self) -> bool {
        matches!(self, Task::None)
    }

    /// Return true if this task is a `Cmd` closure (useful in tests).
    pub fn is_cmd(&self) -> bool {
        matches!(self, Task::Cmd(_))
    }
}
