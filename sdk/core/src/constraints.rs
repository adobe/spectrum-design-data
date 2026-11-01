// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Option constraints (`component.constraints[]`), see
//! `packages/design-data-spec/spec/option-constraints.md`.
//!
//! A constraint is an "if this, then that" rule over a component's options.
//! This module reads the field into a typed model and answers whether a
//! concrete option combination is excluded by an `error` constraint.

use std::collections::BTreeMap;

use serde_json::Value;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConstraintSeverity {
    Error,
    Advisory,
}

/// What a constraint requires of an option.
#[derive(Debug, Clone, PartialEq)]
pub enum Requirement {
    /// The option must hold one of these values.
    OneOf(Vec<Value>),
    /// The option must be present (`{ "present": true }`).
    Present,
}

#[derive(Debug, Clone, PartialEq)]
pub struct OptionConstraint {
    /// Option name → values that select the combination (a literal is a one-element list).
    pub when: BTreeMap<String, Vec<Value>>,
    pub require: BTreeMap<String, Requirement>,
    pub severity: ConstraintSeverity,
    pub description: Option<String>,
    pub source: Option<String>,
}

/// One option combination. `None` means the option's value is unknown.
pub type Combination = BTreeMap<String, Option<Value>>;

impl OptionConstraint {
    /// Parse one constraint object. Returns `None` when the shape is invalid
    /// (Layer 1 reports shape errors; Layer 2 stays silent on them).
    pub fn from_value(v: &Value) -> Option<Self> {
        let when = v
            .get("when")?
            .as_object()?
            .iter()
            .map(|(k, val)| {
                let vals = match val {
                    Value::Array(items) => items.clone(),
                    other => vec![other.clone()],
                };
                (k.clone(), vals)
            })
            .collect();
        let require = v
            .get("require")?
            .as_object()?
            .iter()
            .filter_map(|(k, val)| {
                let req = match val {
                    Value::Array(items) => Requirement::OneOf(items.clone()),
                    Value::Object(o) if o.get("present") == Some(&Value::Bool(true)) => {
                        Requirement::Present
                    }
                    _ => return None,
                };
                Some((k.clone(), req))
            })
            .collect();
        let severity = match v.get("severity")?.as_str()? {
            "error" => ConstraintSeverity::Error,
            "advisory" => ConstraintSeverity::Advisory,
            _ => return None,
        };
        let text = |k: &str| v.get(k).and_then(Value::as_str).map(str::to_string);
        Some(Self {
            when,
            require,
            severity,
            description: text("description"),
            source: text("source"),
        })
    }

    /// Whether `combo` matches `when` and violates `require`. Unknown values
    /// and presence requirements are never proven excluded.
    pub fn excludes(&self, combo: &Combination) -> bool {
        let known = |name: &str| combo.get(name).and_then(Option::as_ref);
        let matches_when = self
            .when
            .iter()
            .all(|(name, vals)| known(name).is_some_and(|v| vals.contains(v)));
        matches_when
            && self.require.iter().any(|(name, req)| match req {
                Requirement::OneOf(allowed) => known(name).is_some_and(|v| !allowed.contains(v)),
                Requirement::Present => false,
            })
    }
}

/// All constraints declared on a component's raw JSON, with their array index.
/// Entries with an invalid shape are skipped.
pub fn read_constraints(component: &Value) -> Vec<(usize, OptionConstraint)> {
    component
        .get("constraints")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .enumerate()
                .filter_map(|(i, v)| OptionConstraint::from_value(v).map(|c| (i, c)))
                .collect()
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn outline() -> OptionConstraint {
        OptionConstraint::from_value(&json!({
            "when": {"style": "outline"},
            "require": {"variant": ["primary", "secondary"]},
            "severity": "error",
            "description": "d"
        }))
        .unwrap()
    }

    #[test]
    fn parses_literal_array_and_presence() {
        let c = OptionConstraint::from_value(&json!({
            "when": {"staticColor": ["white", "black"]},
            "require": {"icon": {"present": true}},
            "severity": "advisory"
        }))
        .unwrap();
        assert_eq!(c.when["staticColor"].len(), 2);
        assert_eq!(c.require["icon"], Requirement::Present);
        assert_eq!(c.severity, ConstraintSeverity::Advisory);
        assert_eq!(outline().when["style"], vec![json!("outline")]);
        assert_eq!(outline().description.as_deref(), Some("d"));
    }

    #[test]
    fn invalid_shape_is_none() {
        assert!(OptionConstraint::from_value(&json!({"when": {}, "severity": "error"})).is_none());
        assert!(OptionConstraint::from_value(
            &json!({"when": {}, "require": {}, "severity": "fatal"})
        )
        .is_none());
    }

    #[test]
    fn excludes_matching_violation_only() {
        let c = outline();
        let combo = |style: &str, variant: Option<&str>| -> Combination {
            [
                ("style".to_string(), Some(json!(style))),
                ("variant".to_string(), variant.map(|v| json!(v))),
            ]
            .into()
        };
        assert!(c.excludes(&combo("outline", Some("accent"))));
        assert!(!c.excludes(&combo("outline", Some("primary"))));
        assert!(!c.excludes(&combo("fill", Some("accent"))));
        assert!(!c.excludes(&combo("outline", None)));
    }
}
