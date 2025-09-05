# Spectrum Rust Lifecycle Architecture Plan

## Executive Summary

This plan outlines a comprehensive lifecycle metadata system for Spectrum Design Tokens and Component Schemas using Rust as the core architecture. The system provides Swift-like `@available` attribute functionality while maintaining platform-agnostic design data and enabling platform-specific overrides through declarative configuration files.

## Key Principles

1. **Platform-Agnostic Design Data**: Core design decisions remain independent of platform implementation details
2. **Declarative Platform Overrides**: Teams author overrides in YAML/JSON without writing Rust code
3. **No Compilation Dependencies**: Platform teams work independently without Rust compilation requirements
4. **Rich Lifecycle Metadata**: Comprehensive tracking of introduced, modified, deprecated, and removed states
5. **Cross-Platform Generation**: Rust compiles to multiple targets (native, WASM, JSON) for broad compatibility

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Spectrum Design Data (Rust)                 │
│                     Platform-Agnostic Core                     │
├─────────────────────────────────────────────────────────────────┤
│  Component Schemas + Tokens with Rich Lifecycle Metadata       │
│  • #[spectrum_lifecycle] macros                                │
│  • Compile-time validation                                     │
│  • JSON Schema generation                                      │
│  • Cross-platform compilation (native/WASM)                    │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Generated Outputs                           │
├─────────────────────────────────────────────────────────────────┤
│  • JSON Schema (NPM packages - backward compatible)            │
│  • Platform Bindings (iOS/Swift, Android/Kotlin, Web/TS)      │
│  • Lifecycle Metadata JSON                                     │
│  • Documentation Templates                                     │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              Platform Override Files (Declarative)             │
├─────────────────────────────────────────────────────────────────┤
│  react-spectrum/overrides/button.yml                          │
│  ios-spectrum/overrides/button.yml                            │
│  spectrum-css/overrides/button.yml                            │
│  android-spectrum/overrides/button.yml                        │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                Runtime Override Merger                         │
├─────────────────────────────────────────────────────────────────┤
│  • Combines design data + platform overrides                  │
│  • Validates override consistency                              │
│  • Generates platform-specific APIs                           │
│  • Creates migration reports                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Rust Design Data Architecture

#### Lifecycle Macro System

```rust
#[derive(SpectrumComponent)]
pub struct Button {
    #[spectrum_lifecycle(
        introduced(version = "1.0.0", date = "2023-08-15"),
        modified(version = "1.5.0", date = "2023-11-20", reason = "Updated semantics"),
        deprecated(
            version = "2.0.0",
            date = "2024-01-10",
            reason = "Replaced with style-based approach for better semantic meaning",
            replacement = "style_variant",
            migration_guide = "https://spectrum.adobe.com/migration/button-style",
            level = "warning",
            breaking_change = true
        ),
        removed(version = "3.0.0", date = "2024-06-01")
    )]
    pub is_quiet: Option<bool>,

    #[spectrum_lifecycle(
        introduced(version = "2.0.0", reason = "Replaces is_quiet for better semantics")
    )]
    pub style_variant: Option<ButtonStyle>,
}
```

#### Generated Capabilities

- **Compile-time validation**: Prevents invalid lifecycle configurations
- **JSON Schema generation**: Clean, standard schemas for NPM packages
- **Platform bindings**: Native FFI for iOS, Android, Web integration
- **Documentation generation**: Automated lifecycle documentation
- **Migration tooling**: Automated codemod and migration guide generation

### 2. Platform Override System

#### Override File Format (YAML)

```yaml
# react-spectrum/overrides/button.yml
platform: react_spectrum
component: Button
version: "1.0.0"

overrides:
  is_quiet:
    lifecycle:
      introduced:
        version: "3.15.0"
        notes: "Available as isQuiet prop"
        delay_reason: "Waiting for React 18 stable release"

      deprecated:
        version: "4.0.0" # Later than design data (2.0.0)
        reason: "React naming convention - use style prop instead"
        replacement: "style='outline'"
        migration_guide: "https://react-spectrum.adobe.com/migration/button"
        level: error
        timeline: "6_months"

      removed:
        version: "5.0.0" # Later than design data (3.0.0)
        extend_reason: "React ecosystem needs longer migration period"

    platform_specific:
      prop_name: "isQuiet"
      type_mapping: "boolean"
      default_value: false
      migration_codemod: "@adobe/react-spectrum-codemods/button-quiet-to-style"
```

#### Override Types Supported

1. **Timing Overrides**: Delay introduction, extend deprecation, accelerate removal
2. **Message Overrides**: Platform-specific reasoning, replacements, migration guides
3. **Severity Overrides**: Different deprecation levels per platform
4. **Platform Constraints**: Not supported, alternative implementations
5. **Technical Implementation**: Platform-specific API mappings, migration tooling

### 3. Developer Experience

#### Platform Team Workflow

```bash
# No Rust compilation required
cd react-spectrum/
vim overrides/button.yml  # Edit in familiar format
npx @adobe/spectrum-override-validator overrides/  # Validate locally
git commit -m "Extend isQuiet deprecation timeline"

# CI automatically merges overrides with design data
# Runtime gets merged lifecycle data
```

#### Tooling Ecosystem

- **VS Code Extension**: Schema validation, auto-completion
- **CLI Validator**: Local validation of override files
- **Override Templates**: Quick-start generators for common patterns
- **Web Dashboard**: Visual override management and comparison
- **Migration Reporter**: Cross-platform impact analysis

### 4. Integration Points

#### Build System Integration

```javascript
// webpack.config.js (No Rust compilation)
const { SpectrumOverridePlugin } = require("@adobe/spectrum-webpack-plugin");

module.exports = {
  plugins: [
    new SpectrumOverridePlugin({
      designDataUrl: "https://spectrum.adobe.com/design-data.json",
      overridesPath: "./overrides/",
      platform: "react_spectrum",
      outputPath: "./src/generated/spectrum-lifecycle.json",
    }),
  ],
};
```

#### Runtime Usage

```typescript
// Platform runtime (any language)
import { getLifecycleInfo } from "./generated/spectrum-lifecycle.json";

export const Button = (props) => {
  const lifecycle = getLifecycleInfo("Button", "is_quiet");

  if (lifecycle.deprecated && props.isQuiet !== undefined) {
    console.warn(
      `isQuiet deprecated since ${lifecycle.deprecated.version}. ` +
        `Use ${lifecycle.deprecated.replacement}. ` +
        `Guide: ${lifecycle.deprecated.migration_guide}`,
    );
  }
};
```

## Implementation Phases

### Phase 1: Core Rust Architecture

- [ ] Design and implement `#[spectrum_lifecycle]` macro system
- [ ] Create compile-time validation for lifecycle consistency
- [ ] Generate JSON Schema output for backward compatibility
- [ ] Implement basic cross-platform compilation (native + WASM)

### Phase 2: Override System

- [ ] Design platform override file schema (YAML/JSON)
- [ ] Implement runtime override merger (Node.js/TypeScript)
- [ ] Create validation rules for override consistency
- [ ] Build CLI tools for override validation and templates

### Phase 3: Tooling & Developer Experience

- [ ] VS Code extension for override file editing
- [ ] Web dashboard for visual override management
- [ ] Migration report generator
- [ ] Platform-specific documentation generators

### Phase 4: Platform Integration

- [ ] React Spectrum integration and override implementation
- [ ] iOS Spectrum Swift bindings and overrides
- [ ] Spectrum CSS integration and overrides
- [ ] Android Spectrum Kotlin bindings and overrides

### Phase 5: Historical Data & Migration

- [ ] Historical lifecycle data reconstruction tool
- [ ] Migration from existing deprecated field to new system
- [ ] Automated changeset integration for lifecycle updates
- [ ] Cross-platform migration coordination tools

## Benefits

### For Design System Team

- **Platform-agnostic design decisions**: Focus on design intent without platform constraints
- **Automated lifecycle tracking**: Integration with changeset automation
- **Cross-platform visibility**: Dashboard showing all platform adoption timelines
- **Historical accuracy**: Reconstruction of past lifecycle data from git history

### For Platform Teams

- **Autonomy**: Control platform-specific timelines and messaging
- **No Rust dependency**: Author overrides in familiar YAML/JSON formats
- **Rich context**: Access to complete lifecycle metadata for better user experience
- **Migration tooling**: Automated generation of platform-specific migration guides

### For Implementation Teams

- **Consistent API**: Unified lifecycle querying across all platforms
- **Runtime warnings**: Automatic deprecation warnings with migration guidance
- **Migration planning**: Clear visibility into upcoming changes and timelines
- **Platform-specific guidance**: Tailored migration instructions per platform

## Strongly Typed Contextual Metadata System

### Current Problem: Metadata Encoded in Token Names

Today, contextual information is embedded in token names:

```
checkbox-control-size-small     → component + element + property + variant
breadcrumbs-start-edge-to-text-large → component + anatomy + relationship + size
title-cjk-size-xl              → component + localization + property + size
```

This approach has limitations:

- **Parsing Required**: Tools must parse and interpret encoded names
- **Inconsistent Patterns**: Different naming conventions across token types
- **Limited Expressiveness**: Complex relationships are hard to encode in names
- **Maintenance Overhead**: Renaming impacts all downstream systems

### Proposed Solution: Strongly Typed Context Objects

Move contextual metadata from token names to structured, strongly typed objects that integrate with component options schemas and anatomy data.

## Validation & Governance

### Override Validation Rules

1. **Timing Constraints**: Cannot accelerate introduction beyond design data timeline
2. **Reasoning Requirements**: All overrides must include justification
3. **Breaking Change Coordination**: Cross-platform coordination for breaking changes
4. **Migration Guide Requirements**: Deprecations must include migration guidance

### Automated Checks

- Override file schema validation
- Cross-platform consistency warnings
- Missing migration guide detection
- Timeline feasibility analysis

## Success Metrics

### Adoption Metrics

- Number of components with lifecycle metadata
- Platform override coverage
- Developer tool usage (CLI, VS Code extension, dashboard)

### Quality Metrics

- Reduction in manual coordination time
- Improved migration guide quality
- Faster deprecation adoption across platforms
- Reduced breaking change coordination overhead

### Developer Experience Metrics

- Time to author platform overrides
- Override validation accuracy
- Migration tooling effectiveness
- Cross-platform lifecycle visibility

---

_This plan serves as the foundation for implementing a comprehensive, cross-platform lifecycle metadata system that scales with Adobe's design system requirements while maintaining platform autonomy and developer productivity._
