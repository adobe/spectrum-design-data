// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! An in-memory [`redb::StorageBackend`] backed by a `Vec<u8>`.
//!
//! This is the WASM-friendly half of the cache: a redb database can be built
//! into a byte buffer (no filesystem) and later opened read-only from those same
//! bytes. Web tools compiled to `wasm32` fetch the cache blob over HTTP and open
//! it through this backend — no OPFS, Web Worker, or cross-origin-isolation
//! headers required, because a derived cache needs no in-browser persistence.
//!
//! redb's `StorageBackend` is a synchronous interface; an in-memory `Vec<u8>`
//! satisfies it on every target (native and `wasm32-unknown-unknown`).

use std::io;
use std::sync::{Arc, RwLock};

/// In-memory storage for a redb [`Database`](redb::Database).
///
/// Clones share the same underlying buffer (via [`Arc`]), so a clone retained
/// before constructing the database can read the serialized bytes back out with
/// [`MemBackend::snapshot`] after the database is committed and dropped.
#[derive(Clone)]
pub struct MemBackend {
    data: Arc<RwLock<Vec<u8>>>,
}

impl std::fmt::Debug for MemBackend {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let len = self.data.read().map(|d| d.len()).unwrap_or(0);
        f.debug_struct("MemBackend").field("len", &len).finish()
    }
}

impl Default for MemBackend {
    fn default() -> Self {
        Self::new()
    }
}

impl MemBackend {
    /// Create an empty backend (used when building a fresh cache in memory).
    pub fn new() -> Self {
        Self {
            data: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Create a backend seeded with existing bytes (used to open a cache blob).
    pub fn from_bytes(bytes: Vec<u8>) -> Self {
        Self {
            data: Arc::new(RwLock::new(bytes)),
        }
    }

    /// Copy the current backing bytes out — the serialized redb database.
    pub fn snapshot(&self) -> Vec<u8> {
        self.data.read().map(|d| d.clone()).unwrap_or_default()
    }
}

fn lock_poisoned() -> io::Error {
    io::Error::new(io::ErrorKind::Other, "MemBackend lock poisoned")
}

impl redb::StorageBackend for MemBackend {
    fn len(&self) -> Result<u64, io::Error> {
        let data = self.data.read().map_err(|_| lock_poisoned())?;
        Ok(data.len() as u64)
    }

    fn read(&self, offset: u64, len: usize) -> Result<Vec<u8>, io::Error> {
        let data = self.data.read().map_err(|_| lock_poisoned())?;
        let start = offset as usize;
        let end = start
            .checked_add(len)
            .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "read length overflow"))?;
        if end > data.len() {
            return Err(io::Error::new(
                io::ErrorKind::UnexpectedEof,
                "read past end of in-memory database",
            ));
        }
        Ok(data[start..end].to_vec())
    }

    fn set_len(&self, len: u64) -> Result<(), io::Error> {
        let mut data = self.data.write().map_err(|_| lock_poisoned())?;
        data.resize(len as usize, 0);
        Ok(())
    }

    fn sync_data(&self, _eventual: bool) -> Result<(), io::Error> {
        // No durable medium to flush — the bytes already live in memory.
        Ok(())
    }

    fn write(&self, offset: u64, src: &[u8]) -> Result<(), io::Error> {
        let mut data = self.data.write().map_err(|_| lock_poisoned())?;
        let start = offset as usize;
        let end = start
            .checked_add(src.len())
            .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "write length overflow"))?;
        if end > data.len() {
            data.resize(end, 0);
        }
        data[start..end].copy_from_slice(src);
        Ok(())
    }
}
