/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

use std::fmt;

/// Errors that can occur during diff operations
#[derive(Debug, Clone, PartialEq)]
pub enum DiffError {
    /// Invalid input provided to diff function
    InvalidInput(String),
    /// Internal processing error
    ProcessingError(String),
    /// Serialization/deserialization error
    SerializationError(String),
}

impl fmt::Display for DiffError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DiffError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
            DiffError::ProcessingError(msg) => write!(f, "Processing error: {}", msg),
            DiffError::SerializationError(msg) => write!(f, "Serialization error: {}", msg),
        }
    }
}

impl std::error::Error for DiffError {}

impl From<serde_json::Error> for DiffError {
    fn from(err: serde_json::Error) -> Self {
        DiffError::SerializationError(err.to_string())
    }
}

/// Result type for diff operations
pub type Result<T> = std::result::Result<T, DiffError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let err = DiffError::InvalidInput("test message".to_string());
        assert_eq!(format!("{}", err), "Invalid input: test message");
    }

    #[test]
    fn test_error_from_serde() {
        let json_err = serde_json::from_str::<serde_json::Value>("invalid json")
            .unwrap_err();
        let diff_err: DiffError = json_err.into();
        
        match diff_err {
            DiffError::SerializationError(_) => {},
            _ => panic!("Expected SerializationError"),
        }
    }
}