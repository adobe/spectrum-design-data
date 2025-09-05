# Rust Component Schema Architecture with JSON NPM Compatibility

## Overview

This architecture uses Rust as the source of truth for component schemas with lifecycle metadata, while automatically generating backward-compatible JSON Schema NPM packages for existing tooling.

## Project Structure

```
spectrum-component-schemas/                 # Rust workspace root
├── Cargo.toml                             # Workspace configuration
├── crates/
│   ├── spectrum-lifecycle/                # Core lifecycle types and traits
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── metadata.rs
│   │       ├── platforms.rs
│   │       └── validation.rs
│   ├── spectrum-components/               # Component definitions
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── button.rs
│   │       ├── checkbox.rs
│   │       └── types.rs
│   └── spectrum-codegen/                  # Code generation tools
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           ├── json_schema.rs
│           ├── typescript.rs
│           └── npm_package.rs
├── generated/                             # Generated output (gitignored)
│   ├── json-schema/                       # JSON Schema files
│   ├── typescript/                        # TypeScript definitions
│   └── npm-packages/                      # Ready-to-publish NPM packages
├── build.rs                               # Build script for generation
└── package.json                           # NPM workspace configuration
```

## Core Rust Implementation

### Lifecycle Metadata Types

```rust
// crates/spectrum-lifecycle/src/metadata.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentLifecycle {
    pub introduced: Option<LifecycleEvent>,
    pub modified: Vec<ModificationEvent>,
    pub deprecated: Option<DeprecationEvent>,
    pub removed: Option<RemovalEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LifecycleEvent {
    pub version: String,
    pub date: String,
    pub platforms: Vec<PlatformInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformInfo {
    pub platform: Platform,
    pub version: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Platform {
    #[serde(rename = "spectrum-css")]
    SpectrumCss,
    #[serde(rename = "react-spectrum")]
    ReactSpectrum,
    #[serde(rename = "web-components")]
    WebComponents,
    #[serde(rename = "ios")]
    Ios,
    #[serde(rename = "android")]
    Android,
    #[serde(rename = "qt")]
    Qt,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeprecationEvent {
    pub version: String,
    pub date: String,
    pub reason: String,
    pub replacement: Option<String>,
    pub migration_guide: Option<String>,
    pub level: DeprecationLevel,
    pub platforms: Vec<PlatformInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DeprecationLevel {
    #[serde(rename = "warning")]
    Warning,
    #[serde(rename = "error")]
    Error,
    #[serde(rename = "hidden")]
    Hidden,
}
```

### Component Definition Traits

```rust
// crates/spectrum-lifecycle/src/lib.rs
pub use spectrum_lifecycle_derive::Component;

pub trait ComponentSchema {
    fn component_name() -> &'static str;
    fn component_lifecycle() -> ComponentLifecycle;
    fn property_lifecycles() -> HashMap<String, ComponentLifecycle>;
    fn to_json_schema() -> serde_json::Value;
    fn to_typescript_definition() -> String;
}

// Derive macro for easy component definition
#[derive(Component)]
#[lifecycle(
    introduced(version = "1.0.0", date = "2023-08-15"),
    platforms(
        spectrum_css(version = "1.0.0"),
        react_spectrum(version = "3.15.0"),
        ios(version = "1.2.0", notes = "Available as SpectrumButton")
    )
)]
pub struct Button {
    #[lifecycle(introduced(version = "1.0.0"))]
    pub label: Option<String>,

    #[lifecycle(
        introduced(version = "1.0.0"),
        deprecated(
            version = "1.5.0",
            reason = "Use style='outline' for the same visual effect",
            replacement = "style",
            level = "warning"
        ),
        removed(version = "2.0.0")
    )]
    pub is_quiet: Option<bool>,

    #[lifecycle(introduced(version = "1.5.0"))]
    pub style: Option<ButtonStyle>,
}
```

### JSON Schema Generation

```rust
// crates/spectrum-codegen/src/json_schema.rs
use serde_json::{json, Value};
use spectrum_lifecycle::{ComponentSchema, ComponentLifecycle};

pub struct JsonSchemaGenerator;

impl JsonSchemaGenerator {
    pub fn generate_component_schema<T: ComponentSchema>() -> Value {
        let lifecycle = T::component_lifecycle();
        let property_lifecycles = T::property_lifecycles();

        json!({
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "$id": format!("https://opensource.adobe.com/spectrum-tokens/schemas/components/{}.json", T::component_name()),
            "title": T::component_name(),
            "type": "object",
            "lifecycle": lifecycle,
            "properties": Self::generate_properties::<T>(property_lifecycles),
            "meta": {
                "category": Self::infer_category::<T>(),
                "documentationUrl": format!("https://spectrum.adobe.com/page/{}/", T::component_name().to_lowercase())
            }
        })
    }

    fn generate_properties<T: ComponentSchema>(
        property_lifecycles: HashMap<String, ComponentLifecycle>
    ) -> Value {
        // Generate JSON Schema properties with embedded lifecycle metadata
        // This maintains backward compatibility while adding lifecycle data
        todo!("Implement property generation with lifecycle metadata")
    }
}
```

### NPM Package Generation

```rust
// crates/spectrum-codegen/src/npm_package.rs
use std::fs;
use std::path::Path;
use serde_json::json;

pub struct NpmPackageGenerator {
    output_dir: String,
}

impl NpmPackageGenerator {
    pub fn new(output_dir: impl Into<String>) -> Self {
        Self {
            output_dir: output_dir.into(),
        }
    }

    pub fn generate_component_schemas_package(&self) -> Result<(), Box<dyn std::error::Error>> {
        let package_dir = format!("{}/component-schemas", self.output_dir);
        fs::create_dir_all(&package_dir)?;

        // Generate package.json
        self.generate_package_json(&package_dir)?;

        // Generate individual schema files
        self.generate_schema_files(&package_dir)?;

        // Generate index.js
        self.generate_index_file(&package_dir)?;

        // Generate README.md
        self.generate_readme(&package_dir)?;

        Ok(())
    }

    fn generate_package_json(&self, package_dir: &str) -> Result<(), Box<dyn std::error::Error>> {
        let package_json = json!({
            "name": "@adobe/spectrum-component-schemas",
            "version": env!("CARGO_PKG_VERSION"),
            "description": "Component schemas for Adobe Spectrum with lifecycle metadata",
            "type": "module",
            "main": "index.js",
            "files": [
                "schemas/",
                "index.js",
                "README.md",
                "CHANGELOG.md"
            ],
            "keywords": ["spectrum", "component-schemas", "lifecycle"],
            "author": "Adobe",
            "license": "Apache-2.0",
            "repository": {
                "type": "git",
                "url": "https://github.com/adobe/spectrum-tokens.git",
                "directory": "packages/component-schemas"
            },
            "engines": {
                "node": "~20.12"
            },
            "publishConfig": {
                "access": "public"
            }
        });

        fs::write(
            format!("{}/package.json", package_dir),
            serde_json::to_string_pretty(&package_json)?
        )?;

        Ok(())
    }

    fn generate_schema_files(&self, package_dir: &str) -> Result<(), Box<dyn std::error::Error>> {
        let schemas_dir = format!("{}/schemas", package_dir);
        fs::create_dir_all(format!("{}/components", schemas_dir))?;

        // Generate base component schema
        self.generate_base_component_schema(&schemas_dir)?;

        // Generate individual component schemas
        self.generate_button_schema(&schemas_dir)?;
        self.generate_checkbox_schema(&schemas_dir)?;
        // Add more components...

        Ok(())
    }

    fn generate_base_component_schema(&self, schemas_dir: &str) -> Result<(), Box<dyn std::error::Error>> {
        let base_schema = json!({
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "$id": "https://opensource.adobe.com/spectrum-tokens/schemas/component.json",
            "title": "Component",
            "type": "object",
            "properties": {
                "meta": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "enum": [
                                "actions",
                                "containers",
                                "data visualization",
                                "feedback",
                                "inputs",
                                "navigation",
                                "status",
                                "typography"
                            ]
                        },
                        "documentationUrl": { "type": "string", "format": "uri" }
                    },
                    "required": ["category", "documentationUrl"]
                },
                "lifecycle": {
                    "$ref": "https://opensource.adobe.com/spectrum-tokens/schemas/lifecycle-metadata.json#/properties/lifecycle",
                    "description": "Complete lifecycle information for this component"
                }
            },
            "required": ["meta", "title", "description", "properties", "$id"]
        });

        fs::write(
            format!("{}/component.json", schemas_dir),
            serde_json::to_string_pretty(&base_schema)?
        )?;

        Ok(())
    }
}
```

## Build Integration

### Cargo Build Script

```rust
// build.rs
use spectrum_codegen::{JsonSchemaGenerator, NpmPackageGenerator};
use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let out_dir = env::var("OUT_DIR")?;

    // Generate JSON Schema files
    let generator = NpmPackageGenerator::new(format!("{}/generated", out_dir));
    generator.generate_component_schemas_package()?;

    // Copy generated files to project directory for development
    if env::var("PROFILE")? == "debug" {
        copy_to_project_dir(&out_dir)?;
    }

    println!("cargo:rerun-if-changed=crates/spectrum-components/src/");
    println!("cargo:rerun-if-changed=crates/spectrum-lifecycle/src/");

    Ok(())
}

fn copy_to_project_dir(out_dir: &str) -> Result<(), Box<dyn std::error::Error>> {
    use std::fs;
    use std::path::Path;

    let src = Path::new(out_dir).join("generated");
    let dst = Path::new("generated");

    if dst.exists() {
        fs::remove_dir_all(dst)?;
    }

    copy_dir_all(&src, dst)?;
    Ok(())
}
```

### NPM Workspace Integration

```json
// package.json (workspace root)
{
  "name": "spectrum-component-schemas-workspace",
  "private": true,
  "workspaces": ["generated/npm-packages/*"],
  "scripts": {
    "build": "cargo build --release",
    "dev": "cargo build && npm run sync-packages",
    "sync-packages": "cp -r generated/npm-packages/* packages/",
    "publish": "npm run build && npm run sync-packages && npm publish packages/component-schemas",
    "test": "cargo test && npm test"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.1"
  }
}
```

## Generated Output Structure

```
generated/npm-packages/component-schemas/
├── package.json                          # Auto-generated with correct version
├── index.js                              # Export all schemas
├── schemas/
│   ├── component.json                    # Base component schema
│   └── components/
│       ├── button.json                   # Button schema with lifecycle
│       ├── checkbox.json                 # Checkbox schema with lifecycle
│       └── ...
├── typescript/                           # TypeScript definitions
│   ├── index.d.ts
│   └── components/
│       ├── button.d.ts
│       └── checkbox.d.ts
├── README.md                            # Auto-generated documentation
└── CHANGELOG.md                         # Auto-generated from Rust changes
```

## Example Generated JSON Schema

```json
// generated/npm-packages/component-schemas/schemas/components/button.json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://opensource.adobe.com/spectrum-tokens/schemas/components/button.json",
  "title": "Button",
  "description": "Buttons allow users to perform an action or to navigate to another page.",
  "lifecycle": {
    "introduced": {
      "version": "1.0.0",
      "date": "2023-08-15",
      "platforms": [
        { "platform": "spectrum-css", "version": "1.0.0" },
        { "platform": "react-spectrum", "version": "3.15.0" },
        {
          "platform": "ios",
          "version": "1.2.0",
          "notes": "Available as SpectrumButton"
        }
      ]
    }
  },
  "meta": {
    "category": "actions",
    "documentationUrl": "https://spectrum.adobe.com/page/button/"
  },
  "type": "object",
  "properties": {
    "label": {
      "type": "string",
      "lifecycle": {
        "introduced": {
          "version": "1.0.0",
          "date": "2023-08-15"
        }
      }
    },
    "isQuiet": {
      "type": "boolean",
      "default": false,
      "lifecycle": {
        "introduced": {
          "version": "1.0.0",
          "date": "2023-08-15"
        },
        "deprecated": {
          "version": "1.5.0",
          "date": "2024-01-10",
          "reason": "Use style='outline' for the same visual effect",
          "replacement": "style",
          "level": "warning"
        },
        "removed": {
          "version": "2.0.0",
          "date": "2024-02-15"
        }
      }
    },
    "style": {
      "type": "string",
      "enum": ["fill", "outline"],
      "default": "fill",
      "lifecycle": {
        "introduced": {
          "version": "1.5.0",
          "date": "2024-01-10"
        }
      }
    }
  }
}
```

## Migration Strategy

### Phase 1: Parallel Development

- Rust crates generate JSON Schema packages
- Existing NPM packages continue to work
- Gradual migration of tooling to use generated packages

### Phase 2: Feature Parity

- All existing JSON Schema features replicated in Rust
- Enhanced lifecycle metadata available
- Cross-platform bindings start development

### Phase 3: Native Integration

- Platform SDKs use native Rust bindings
- JSON Schema becomes one output format among many
- Full cross-platform lifecycle metadata support

## Development Workflow

```bash
# Develop component schemas in Rust
cd spectrum-component-schemas/
cargo run --bin add-component -- checkbox

# Auto-generate JSON Schema NPM package
cargo build

# Test generated package
cd generated/npm-packages/component-schemas/
npm test

# Publish updated package
npm version patch
npm publish
```

## Benefits

1. **Single Source of Truth**: All component definitions in Rust
2. **Backward Compatibility**: Existing tools continue to work
3. **Enhanced Metadata**: Rich lifecycle information
4. **Cross-Platform**: Native bindings for all platforms
5. **Type Safety**: Compile-time validation of schemas
6. **Automated Publishing**: Generated packages with correct versioning

This architecture gives you the best of both worlds - a modern, type-safe, cross-platform foundation while maintaining complete backward compatibility with your existing JSON Schema ecosystem.
