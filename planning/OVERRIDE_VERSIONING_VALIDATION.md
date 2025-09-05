# Override Versioning and Validation System

## Executive Summary

This document outlines a comprehensive versioning and validation system for platform overrides that ensures compatibility between platform override files, design data versions, and the Rust codebase evolution. The system provides schema versioning, compatibility checking, automated validation, and migration assistance.

## Versioning Strategy

### Three-Layer Versioning Model

```
Platform Override File ←→ Design Data Version ←→ Rust Codebase Version
```

Each layer has independent versioning with compatibility matrices:

1. **Override Schema Version**: Format and structure of override files
2. **Design Data Version**: Semantic version of the design data package
3. **Rust Codebase Version**: Version of the Rust lifecycle/context system

### Version Compatibility Matrix

```yaml
# compatibility-matrix.yml
compatibility_matrix:
  rust_codebase: "2.1.0"
  design_data: "15.2.0"
  override_schema: "1.3.0"

  supported_combinations:
    - rust_codebase: "2.1.0"
      design_data: ["15.0.0", "15.1.0", "15.2.0"]
      override_schema: ["1.2.0", "1.3.0"]

    - rust_codebase: "2.0.0"
      design_data: ["14.5.0", "15.0.0", "15.1.0"]
      override_schema: ["1.1.0", "1.2.0"]

    - rust_codebase: "1.9.0"
      design_data: ["14.0.0", "14.1.0", "14.2.0"]
      override_schema: ["1.0.0", "1.1.0"]

  deprecation_timeline:
    rust_codebase:
      "1.9.0":
        deprecated: "2024-06-01"
        removed: "2024-12-01"
        migration_guide: "https://spectrum.adobe.com/migration/rust-2.0"

    override_schema:
      "1.0.0":
        deprecated: "2024-03-01"
        removed: "2024-09-01"
        migration_guide: "https://spectrum.adobe.com/migration/override-schema-1.1"
```

## Override File Versioning

### Versioned Override File Format

```yaml
# react-spectrum/overrides/button.yml
override_file_version: "1.3.0"
compatible_with:
  design_data_version: "^15.0.0" # Semver range
  rust_codebase_version: "^2.1.0" # Semver range
  override_schema_version: "1.3.0" # Exact version

metadata:
  platform: "react_spectrum"
  component: "Button"
  created: "2024-01-15T10:30:00Z"
  last_modified: "2024-02-20T14:45:00Z"
  author: "react-team@adobe.com"
  reviewers: ["design-systems@adobe.com"]
  change_reason: "Extend isQuiet deprecation timeline for React ecosystem compatibility"

# Schema validation reference
$schema: "https://spectrum.adobe.com/schemas/override-schema/v1.3.0/override.json"

overrides:
  is_quiet:
    lifecycle:
      deprecated:
        version: "4.0.0"
        reason: "React naming convention - use style prop instead"
        replacement: "style='outline'"
        migration_guide: "https://react-spectrum.adobe.com/migration/button"
        level: error
        timeline: "6_months"

    platform_specific:
      prop_name: "isQuiet"
      migration_codemod: "@adobe/react-spectrum-codemods/button-quiet-to-style"
```

### Override Schema Versioning

#### Schema v1.3.0 (Current)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://spectrum.adobe.com/schemas/override-schema/v1.3.0/override.json",
  "title": "Platform Override Schema v1.3.0",
  "description": "Schema for platform-specific lifecycle and behavior overrides",

  "type": "object",
  "properties": {
    "override_file_version": {
      "type": "string",
      "pattern": "^1\\.3\\.[0-9]+$",
      "description": "Must match schema version"
    },

    "compatible_with": {
      "type": "object",
      "properties": {
        "design_data_version": {
          "type": "string",
          "pattern": "^[\\^~]?[0-9]+\\.[0-9]+\\.[0-9]+",
          "description": "Semver range for compatible design data versions"
        },
        "rust_codebase_version": {
          "type": "string",
          "pattern": "^[\\^~]?[0-9]+\\.[0-9]+\\.[0-9]+",
          "description": "Semver range for compatible Rust codebase versions"
        },
        "override_schema_version": {
          "type": "string",
          "pattern": "^1\\.3\\.[0-9]+$",
          "description": "Exact override schema version required"
        }
      },
      "required": [
        "design_data_version",
        "rust_codebase_version",
        "override_schema_version"
      ]
    },

    "metadata": {
      "type": "object",
      "properties": {
        "platform": {
          "type": "string",
          "enum": [
            "react_spectrum",
            "ios_spectrum",
            "spectrum_css",
            "android_spectrum",
            "qt_spectrum"
          ]
        },
        "component": { "type": "string" },
        "created": { "type": "string", "format": "date-time" },
        "last_modified": { "type": "string", "format": "date-time" },
        "author": { "type": "string", "format": "email" },
        "reviewers": {
          "type": "array",
          "items": { "type": "string", "format": "email" }
        },
        "change_reason": { "type": "string", "minLength": 10 }
      },
      "required": [
        "platform",
        "component",
        "created",
        "author",
        "change_reason"
      ]
    },

    "overrides": {
      "type": "object",
      "patternProperties": {
        "^[a-zA-Z][a-zA-Z0-9_]*$": {
          "$ref": "#/$defs/property_override"
        }
      }
    }
  },

  "required": [
    "override_file_version",
    "compatible_with",
    "metadata",
    "overrides"
  ],

  "$defs": {
    "property_override": {
      "type": "object",
      "properties": {
        "lifecycle": {
          "$ref": "https://spectrum.adobe.com/schemas/lifecycle-metadata/v2.1.0/lifecycle.json#/$defs/lifecycle_override"
        },
        "variations": {
          "$ref": "https://spectrum.adobe.com/schemas/variations/v1.3.0/variation_override.json"
        },
        "platform_specific": {
          "type": "object",
          "additionalProperties": true
        }
      }
    }
  }
}
```

#### Schema Evolution Example

```json
{
  "$id": "https://spectrum.adobe.com/schemas/override-schema/v1.4.0/override.json",
  "title": "Platform Override Schema v1.4.0",
  "description": "Added support for contextual variations overrides",

  "allOf": [
    {
      "$ref": "https://spectrum.adobe.com/schemas/override-schema/v1.3.0/override.json"
    }
  ],

  "properties": {
    "override_file_version": {
      "pattern": "^1\\.4\\.[0-9]+$"
    },

    "overrides": {
      "patternProperties": {
        "^[a-zA-Z][a-zA-Z0-9_]*$": {
          "properties": {
            "contextual_variations": {
              "$ref": "#/$defs/contextual_variation_override"
            }
          }
        }
      }
    }
  },

  "$defs": {
    "contextual_variation_override": {
      "type": "object",
      "properties": {
        "density_support": {
          "type": "object",
          "properties": {
            "supported_levels": {
              "type": "array",
              "items": {
                "enum": ["comfortable", "cozy", "compact", "super-dense"]
              }
            },
            "platform_limitations": {
              "type": "string",
              "description": "Platform-specific density limitations"
            }
          }
        }
      }
    }
  }
}
```

## Validation System

### Multi-Level Validation Pipeline

```rust
#[derive(Debug)]
pub struct ValidationPipeline {
    pub schema_validator: SchemaValidator,
    pub compatibility_checker: CompatibilityChecker,
    pub semantic_validator: SemanticValidator,
    pub cross_reference_validator: CrossReferenceValidator,
}

impl ValidationPipeline {
    pub fn validate_override_file(&self, override_file: &OverrideFile) -> ValidationResult {
        let mut results = ValidationResult::new();

        // 1. Schema validation
        results.merge(self.schema_validator.validate(override_file)?);

        // 2. Version compatibility
        results.merge(self.compatibility_checker.validate(override_file)?);

        // 3. Semantic validation
        results.merge(self.semantic_validator.validate(override_file)?);

        // 4. Cross-reference validation
        results.merge(self.cross_reference_validator.validate(override_file)?);

        results
    }
}
```

#### 1. Schema Validation

```rust
impl SchemaValidator {
    pub fn validate(&self, override_file: &OverrideFile) -> ValidationResult {
        let mut result = ValidationResult::new();

        // Validate JSON Schema compliance
        let schema_version = &override_file.override_file_version;
        let schema = self.load_schema(schema_version)?;

        match schema.validate(&override_file.content) {
            Ok(_) => result.add_success("Schema validation passed"),
            Err(errors) => {
                for error in errors {
                    result.add_error(ValidationError::SchemaViolation {
                        path: error.instance_path.to_string(),
                        message: error.to_string(),
                        schema_version: schema_version.clone(),
                    });
                }
            }
        }

        result
    }
}
```

#### 2. Compatibility Checking

```rust
impl CompatibilityChecker {
    pub fn validate(&self, override_file: &OverrideFile) -> ValidationResult {
        let mut result = ValidationResult::new();

        // Check design data compatibility
        if !self.is_design_data_compatible(&override_file.compatible_with.design_data_version) {
            result.add_error(ValidationError::IncompatibleDesignData {
                required: override_file.compatible_with.design_data_version.clone(),
                available: self.current_design_data_version.clone(),
                migration_guide: Some("https://spectrum.adobe.com/migration/design-data-15.0".to_string()),
            });
        }

        // Check Rust codebase compatibility
        if !self.is_rust_codebase_compatible(&override_file.compatible_with.rust_codebase_version) {
            result.add_error(ValidationError::IncompatibleRustCodebase {
                required: override_file.compatible_with.rust_codebase_version.clone(),
                available: self.current_rust_version.clone(),
                breaking_changes: self.get_breaking_changes_since(&override_file.compatible_with.rust_codebase_version),
            });
        }

        // Check schema compatibility
        if override_file.override_file_version != override_file.compatible_with.override_schema_version {
            result.add_error(ValidationError::SchemaMismatch {
                file_version: override_file.override_file_version.clone(),
                declared_compatible: override_file.compatible_with.override_schema_version.clone(),
            });
        }

        result
    }
}
```

#### 3. Semantic Validation

```rust
impl SemanticValidator {
    pub fn validate(&self, override_file: &OverrideFile) -> ValidationResult {
        let mut result = ValidationResult::new();

        for (property_name, property_override) in &override_file.overrides {
            // Validate lifecycle overrides make sense
            if let Some(lifecycle) = &property_override.lifecycle {
                result.merge(self.validate_lifecycle_override(property_name, lifecycle)?);
            }

            // Validate variation overrides
            if let Some(variations) = &property_override.variations {
                result.merge(self.validate_variation_override(property_name, variations)?);
            }

            // Validate platform-specific data
            result.merge(self.validate_platform_specific_data(
                &override_file.metadata.platform,
                property_name,
                &property_override.platform_specific
            )?);
        }

        result
    }

    fn validate_lifecycle_override(&self, property: &str, lifecycle: &LifecycleOverride) -> ValidationResult {
        let mut result = ValidationResult::new();

        // Check that override timing makes sense
        if let (Some(deprecated), Some(removed)) = (&lifecycle.deprecated, &lifecycle.removed) {
            if deprecated.version >= removed.version {
                result.add_error(ValidationError::InvalidLifecycleSequence {
                    property: property.to_string(),
                    deprecated_version: deprecated.version.clone(),
                    removed_version: removed.version.clone(),
                    message: "Removal version must be greater than deprecation version".to_string(),
                });
            }
        }

        // Validate against design data lifecycle
        let design_lifecycle = self.design_data.get_property_lifecycle(property)?;
        if let Some(design_deprecated) = design_lifecycle.deprecated {
            if let Some(platform_deprecated) = &lifecycle.deprecated {
                if platform_deprecated.version < design_deprecated.version {
                    result.add_warning(ValidationError::EarlyDeprecation {
                        property: property.to_string(),
                        design_version: design_deprecated.version,
                        platform_version: platform_deprecated.version.clone(),
                        justification_required: true,
                    });
                }
            }
        }

        result
    }
}
```

#### 4. Cross-Reference Validation

```rust
impl CrossReferenceValidator {
    pub fn validate(&self, override_file: &OverrideFile) -> ValidationResult {
        let mut result = ValidationResult::new();

        // Load component schema for validation
        let component_schema = self.load_component_schema(&override_file.metadata.component)?;

        for (property_name, _) in &override_file.overrides {
            // Validate property exists in component schema
            if !component_schema.has_property(property_name) {
                result.add_error(ValidationError::UnknownProperty {
                    component: override_file.metadata.component.clone(),
                    property: property_name.clone(),
                    available_properties: component_schema.get_property_names(),
                    suggestion: self.suggest_similar_property(property_name, &component_schema),
                });
            }

            // Validate design data references
            if !self.design_data.has_token_for_property(&override_file.metadata.component, property_name) {
                result.add_warning(ValidationError::NoDesignDataToken {
                    component: override_file.metadata.component.clone(),
                    property: property_name.clone(),
                    message: "Override specified for property without corresponding design data token".to_string(),
                });
            }
        }

        result
    }
}
```

### Validation Error Types

```rust
#[derive(Debug, Clone)]
pub enum ValidationError {
    // Schema Errors
    SchemaViolation {
        path: String,
        message: String,
        schema_version: String,
    },

    SchemaMismatch {
        file_version: String,
        declared_compatible: String,
    },

    // Compatibility Errors
    IncompatibleDesignData {
        required: String,
        available: String,
        migration_guide: Option<String>,
    },

    IncompatibleRustCodebase {
        required: String,
        available: String,
        breaking_changes: Vec<BreakingChange>,
    },

    // Semantic Errors
    InvalidLifecycleSequence {
        property: String,
        deprecated_version: String,
        removed_version: String,
        message: String,
    },

    EarlyDeprecation {
        property: String,
        design_version: Version,
        platform_version: String,
        justification_required: bool,
    },

    // Cross-Reference Errors
    UnknownProperty {
        component: String,
        property: String,
        available_properties: Vec<String>,
        suggestion: Option<String>,
    },

    NoDesignDataToken {
        component: String,
        property: String,
        message: String,
    },

    // Migration Errors
    MigrationRequired {
        from_version: String,
        to_version: String,
        migration_steps: Vec<MigrationStep>,
        automated_migration_available: bool,
    },
}
```

## CLI Validation Tools

### Override Validator CLI

```bash
# Validate individual override file
spectrum-override-validator react-spectrum/overrides/button.yml

✅ Schema validation: PASSED (v1.3.0)
✅ Compatibility check: PASSED
    ├─ Design data: 15.2.0 (compatible with ^15.0.0)
    ├─ Rust codebase: 2.1.0 (compatible with ^2.1.0)
    └─ Override schema: 1.3.0 (exact match)
⚠️  Semantic validation: 1 WARNING
    └─ Property 'isQuiet' deprecated earlier than design data (4.0.0 vs 2.0.0)
       Justification: "React ecosystem compatibility" ✓
✅ Cross-reference validation: PASSED

# Validate all overrides for a platform
spectrum-override-validator react-spectrum/overrides/

# Validate compatibility with specific versions
spectrum-override-validator --design-data-version 15.1.0 --rust-version 2.0.0 button.yml

❌ Compatibility check: FAILED
   └─ Override requires Rust codebase ^2.1.0 but 2.0.0 available
      Migration guide: https://spectrum.adobe.com/migration/rust-2.1

# Generate migration plan
spectrum-override-validator --migrate-to rust:2.1.0,design-data:15.2.0 button.yml

🔄 Migration Plan:
   1. Update compatible_with.rust_codebase_version to "^2.1.0"
   2. Review new lifecycle override features in Rust 2.1.0
   3. Update override_file_version to "1.3.0" (recommended)
   4. Test override resolution with new design data tokens
```

### Batch Validation and Updates

```bash
# Check all platform overrides for compatibility
spectrum-override-batch-validator \
  --platforms react-spectrum,ios-spectrum,spectrum-css \
  --design-data-version 15.2.0 \
  --rust-version 2.1.0

Platform Compatibility Report:
├─ react-spectrum: 23/25 files valid (2 need migration)
├─ ios-spectrum: 18/20 files valid (2 incompatible versions)
└─ spectrum-css: 15/15 files valid ✅

# Automated migration assistant
spectrum-override-migrator \
  --from-design-data 15.0.0 \
  --to-design-data 15.2.0 \
  --platform react-spectrum

🔄 Migrating react-spectrum overrides 15.0.0 → 15.2.0:

✅ button.yml: Updated compatible_with versions
✅ menu.yml: Updated compatible_with versions
⚠️  dialog.yml: Manual review required
   └─ Property 'title' lifecycle changed in design data
      Review: react-spectrum/overrides/dialog.yml:15

🎉 Migration complete: 2/3 files automated, 1 requires manual review
```

## CI/CD Integration

### GitHub Actions Validation

```yaml
# .github/workflows/validate-overrides.yml
name: Validate Platform Overrides

on:
  pull_request:
    paths: ["**/overrides/**/*.yml"]

jobs:
  validate-overrides:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Spectrum Override Validator
        uses: adobe/spectrum-override-validator-action@v1
        with:
          design-data-version: ${{ github.event.inputs.design_data_version || 'latest' }}
          rust-codebase-version: ${{ github.event.inputs.rust_version || 'latest' }}

      - name: Validate Changed Override Files
        run: |
          # Get changed override files
          CHANGED_FILES=$(git diff --name-only origin/main...HEAD | grep "overrides.*\.yml$" || true)

          if [ -n "$CHANGED_FILES" ]; then
            echo "Validating changed override files:"
            echo "$CHANGED_FILES"
            
            for file in $CHANGED_FILES; do
              echo "::group::Validating $file"
              spectrum-override-validator "$file" --output json > "validation-$file.json"
              
              # Add validation results as PR comment
              spectrum-override-pr-comment \
                --file "$file" \
                --validation-result "validation-$file.json" \
                --pr-number ${{ github.event.number }}
              echo "::endgroup::"
            done
          else
            echo "No override files changed"
          fi

      - name: Check Version Compatibility Matrix
        run: |
          spectrum-override-compatibility-check \
            --design-data-version ${{ env.DESIGN_DATA_VERSION }} \
            --rust-version ${{ env.RUST_VERSION }} \
            --all-platforms
```

### Automated PR Comments

```markdown
## Override Validation Results

### react-spectrum/overrides/button.yml

✅ **Schema Validation**: Passed (v1.3.0)
✅ **Compatibility**: All versions compatible
⚠️ **Semantic Warning**: Early deprecation detected

**Details:**

- Property `isQuiet` deprecated at v4.0.0 (design data: v2.0.0)
- Justification provided: "React ecosystem compatibility" ✅
- Migration codemod available: `@adobe/react-spectrum-codemods/button-quiet-to-style`

### Recommendations

1. Consider updating to override schema v1.4.0 for new contextual variation features
2. Review compatibility with upcoming design data v15.3.0 (beta)

**Validation Summary**: 1 file processed, 0 errors, 1 warning
```

## Version Migration System

### Automated Migration Tools

```rust
pub struct OverrideMigrator {
    pub from_version: VersionSet,
    pub to_version: VersionSet,
    pub migration_rules: Vec<MigrationRule>,
}

#[derive(Debug)]
pub struct VersionSet {
    pub design_data: Version,
    pub rust_codebase: Version,
    pub override_schema: Version,
}

impl OverrideMigrator {
    pub fn migrate_override_file(&self, file: &OverrideFile) -> MigrationResult {
        let mut migrated = file.clone();
        let mut applied_rules = Vec::new();

        for rule in &self.migration_rules {
            if rule.applies_to(&file.compatible_with) {
                let changes = rule.apply(&mut migrated)?;
                applied_rules.push((rule.clone(), changes));
            }
        }

        MigrationResult {
            original: file.clone(),
            migrated,
            applied_rules,
            manual_review_required: self.requires_manual_review(&applied_rules),
        }
    }
}
```

### Migration Rules Examples

```rust
// Example: Design data 15.0.0 → 15.2.0 migration
MigrationRule {
    name: "Design Data 15.0.0 to 15.2.0",
    from_version: VersionConstraint::DesignData(">=15.0.0,<15.2.0"),
    to_version: VersionConstraint::DesignData("15.2.0"),

    transformations: vec![
        // Update compatibility declarations
        Transformation::UpdateCompatibility {
            field: "compatible_with.design_data_version",
            from: "^15.0.0",
            to: "^15.2.0",
        },

        // Handle property renames
        Transformation::RenameProperty {
            component: "Button",
            from: "is_quiet",
            to: "style",
            value_transformation: Some(ValueTransformation::BooleanToEnum {
                true_value: "outline",
                false_value: "fill",
            }),
        },

        // Add new required fields
        Transformation::AddField {
            path: "overrides.style.lifecycle.introduced",
            value: json!({
                "version": "15.2.0",
                "reason": "Replaces is_quiet for better semantic meaning"
            }),
        },
    ],

    manual_review_triggers: vec![
        ManualReviewTrigger::PropertyDeprecated {
            component: "Button",
            property: "is_quiet",
            reason: "Platform may need custom migration strategy",
        },
    ],
},
```

This comprehensive versioning and validation system ensures that platform overrides remain compatible and valid as the design system evolves, providing automated validation, migration assistance, and clear compatibility guarantees.
