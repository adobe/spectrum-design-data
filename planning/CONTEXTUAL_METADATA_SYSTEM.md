# Spectrum Contextual Metadata System

## Executive Summary

This document outlines a comprehensive system for moving contextual metadata out of token names into strongly typed objects. The system integrates with component options schemas and introduces component anatomy data to create semantically rich, queryable, and maintainable design tokens.

## Current State Analysis

### Token Names Encode Context Today

Current token names embed multiple pieces of contextual information:

```
checkbox-control-size-small                → component + element + property + variant
breadcrumbs-start-edge-to-text-large      → component + anatomy + relationship + size
title-cjk-size-xl                         → component + localization + property + size
component-s-regular                       → type + size + weight
standard-dialog-body-font-size            → component + anatomy + property
```

### Component Options Schema Integration

Components already have well-defined option schemas:

```json
// button.json
{
  "variant": ["accent", "negative", "primary", "secondary"],
  "size": ["s", "m", "l", "xl"],
  "state": ["default", "hover", "down", "keyboard focus"],
  "style": ["fill", "outline"],
  "isDisabled": boolean,
  "justified": boolean
}
```

### Missing: Component Anatomy Data

Currently missing structured data about component anatomy:

- Button → label, icon, focus-indicator, container
- Breadcrumbs → item, separator, truncated-menu, start-edge
- Dialog → header, body, footer, close-button

## Core Architecture

### Strongly Typed Context Objects

```rust
#[derive(SpectrumToken)]
pub struct ContextualToken {
    pub uuid: Uuid,
    pub value: TokenValue,
    pub context: TokenContext,
    pub lifecycle: LifecycleMetadata,
}

#[derive(Debug, Clone)]
pub struct TokenContext {
    pub component: ComponentContext,
    pub property: PropertyContext,
    pub variants: Vec<VariantContext>,
    pub anatomy: Option<AnatomyContext>,
    pub relationships: Vec<RelationshipContext>,
    pub platforms: Vec<PlatformContext>,
}
```

### Component Context Integration

```rust
// Links to component options schema
#[derive(Debug, Clone)]
pub struct ComponentContext {
    pub name: String,                    // "button"
    pub schema_ref: ComponentSchemaRef,  // Links to component-schemas package
    pub category: ComponentCategory,     // From meta.category
}

// Typed based on component options schema
#[derive(Debug, Clone)]
pub struct VariantContext {
    pub option_name: String,    // "size", "variant", "state"
    pub value: VariantValue,    // "large", "accent", "hover"
    pub schema_ref: String,     // Link to schema definition
}

#[derive(Debug, Clone)]
pub enum VariantValue {
    Size(SizeVariant),       // s, m, l, xl, etc.
    Variant(String),         // accent, negative, primary, secondary
    State(StateVariant),     // default, hover, down, keyboard-focus
    Style(String),           // fill, outline
    Boolean(bool),           // isDisabled, justified
    Custom(String),          // Platform-specific values
}
```

### Component Anatomy System (New)

```rust
// Component anatomy definitions (to be authored)
#[derive(Debug, Clone)]
pub struct AnatomyContext {
    pub element: AnatomyElement,     // Which part of the component
    pub relationships: Vec<AnatomyRelationship>,
}

#[derive(Debug, Clone)]
pub enum AnatomyElement {
    // Button anatomy
    Label,
    Icon,
    FocusIndicator,
    Container,

    // Breadcrumbs anatomy
    Item,
    Separator,
    TruncatedMenu,
    StartEdge,

    // Dialog anatomy
    Header,
    Body,
    Footer,
    CloseButton,

    // Generic anatomy types
    Surface,
    Border,
    Text,
    Background,
}

#[derive(Debug, Clone)]
pub struct AnatomyRelationship {
    pub relationship_type: RelationshipType,
    pub target: AnatomyElement,
    pub description: String,
}

#[derive(Debug, Clone)]
pub enum RelationshipType {
    SpacingTo,      // "margin-to", "padding-from"
    SizingFor,      // "width-of", "height-of"
    ColorOf,        // "background-of", "text-color-of"
    PositionIn,     // "top-in", "center-in"
    BorderOn,       // "border-on", "outline-on"
}
```

### Property Context

```rust
#[derive(Debug, Clone)]
pub struct PropertyContext {
    pub property_type: PropertyType,
    pub semantic_meaning: String,
    pub css_properties: Vec<String>,    // CSS properties this affects
    pub platform_mappings: HashMap<Platform, String>,
}

#[derive(Debug, Clone)]
pub enum PropertyType {
    Dimension { unit: DimensionUnit, direction: Option<Direction> },
    Color { color_space: ColorSpace, alpha: bool },
    Typography { property: TypographyProperty },
    Animation { property: AnimationProperty },
    Shadow { shadow_type: ShadowType },
    Border { border_property: BorderProperty },
}
```

## Example: Token Transformation

### Current (Name-Encoded)

```json
{
  "checkbox-control-size-small": {
    "component": "checkbox",
    "value": "14px",
    "uuid": "460e8170-de69-4f8e-8420-6c87a1f6f5cd"
  }
}
```

### Proposed (Strongly Typed Context)

```rust
ContextualToken {
    uuid: "460e8170-de69-4f8e-8420-6c87a1f6f5cd",
    value: Dimension::Pixels(14),
    context: TokenContext {
        component: ComponentContext {
            name: "checkbox",
            schema_ref: "https://opensource.adobe.com/spectrum-tokens/schemas/components/checkbox.json",
            category: ComponentCategory::Inputs,
        },
        property: PropertyContext {
            property_type: PropertyType::Dimension {
                unit: DimensionUnit::Pixels,
                direction: None
            },
            semantic_meaning: "Control element size",
            css_properties: vec!["width", "height"],
            platform_mappings: {
                Platform::CSS => "width, height",
                Platform::iOS => "frame.size",
                Platform::Android => "layout_width, layout_height"
            }
        },
        variants: vec![
            VariantContext {
                option_name: "size",
                value: VariantValue::Size(SizeVariant::Small),
                schema_ref: "checkbox.json#/properties/size"
            }
        ],
        anatomy: Some(AnatomyContext {
            element: AnatomyElement::ControlBox,
            relationships: vec![]
        }),
        relationships: vec![],
        platforms: vec![Platform::Desktop] // from scale-set
    },
    lifecycle: LifecycleMetadata {
        introduced: Some(Introduction { version: "13.0.0", date: "2023-01-15" }),
        deprecated: None,
        removed: None,
    }
}
```

## Token Name Generation

With contextual metadata, token names become **generated outputs** rather than primary identifiers:

```rust
impl ContextualToken {
    // Generate semantic name from context
    pub fn generate_semantic_name(&self) -> String {
        let component = &self.context.component.name;
        let anatomy = self.context.anatomy
            .as_ref()
            .map(|a| a.element.to_kebab_case())
            .unwrap_or_default();
        let property = &self.context.property.semantic_meaning.to_kebab_case();
        let variants = self.context.variants
            .iter()
            .map(|v| v.value.to_string())
            .collect::<Vec<_>>()
            .join("-");

        format!("{}-{}-{}-{}", component, anatomy, property, variants)
        // Result: "checkbox-control-box-size-small"
    }

    // Generate legacy name for backward compatibility
    pub fn generate_legacy_name(&self) -> String {
        // Maintains existing naming patterns during migration
    }

    // Generate platform-specific names
    pub fn generate_platform_name(&self, platform: Platform) -> String {
        match platform {
            Platform::CSS => self.generate_css_custom_property_name(),
            Platform::iOS => self.generate_swift_property_name(),
            Platform::Android => self.generate_kotlin_property_name(),
        }
    }
}
```

## Component Anatomy Authoring System

### Anatomy Schema Definition

```rust
// To be authored: component anatomy definitions
#[derive(Debug, Clone)]
pub struct ComponentAnatomy {
    pub component: String,
    pub elements: Vec<AnatomyElementDefinition>,
    pub relationships: Vec<AnatomyRelationshipDefinition>,
}

#[derive(Debug, Clone)]
pub struct AnatomyElementDefinition {
    pub name: String,
    pub description: String,
    pub element_type: AnatomyElement,
    pub css_selectors: Vec<String>,
    pub figma_layer_names: Vec<String>,    // Links to Figma design
    pub platform_mappings: HashMap<Platform, String>,
}
```

### Example: Button Anatomy Definition

```rust
ComponentAnatomy {
    component: "button",
    elements: vec![
        AnatomyElementDefinition {
            name: "container",
            description: "The outer button element",
            element_type: AnatomyElement::Container,
            css_selectors: vec![".spectrum-Button"],
            figma_layer_names: vec!["Button", "Container"],
            platform_mappings: {
                Platform::iOS => "UIButton",
                Platform::Android => "MaterialButton",
                Platform::React => "ButtonContainer"
            }
        },
        AnatomyElementDefinition {
            name: "label",
            description: "Button text content",
            element_type: AnatomyElement::Label,
            css_selectors: vec![".spectrum-Button-label"],
            figma_layer_names: vec!["Label", "Text"],
            platform_mappings: {
                Platform::iOS => "titleLabel",
                Platform::Android => "text",
                Platform::React => "children"
            }
        },
        AnatomyElementDefinition {
            name: "icon",
            description: "Optional button icon",
            element_type: AnatomyElement::Icon,
            css_selectors: vec![".spectrum-Button-icon"],
            figma_layer_names: vec!["Icon"],
            platform_mappings: {
                Platform::iOS => "imageView",
                Platform::Android => "icon",
                Platform::React => "icon"
            }
        }
    ],
    relationships: vec![
        AnatomyRelationshipDefinition {
            relationship_type: RelationshipType::SpacingTo,
            source: AnatomyElement::Icon,
            target: AnatomyElement::Label,
            description: "Space between icon and label"
        }
    ]
}
```

### Anatomy Data Format (YAML)

For easier authoring by design teams:

```yaml
# anatomy/button.yml
component: button
description: "Button component anatomy definition"
version: "1.0.0"

elements:
  - name: container
    description: "The outer button element"
    element_type: Container
    css_selectors: [".spectrum-Button"]
    figma_layer_names: ["Button", "Container"]
    platform_mappings:
      ios: UIButton
      android: MaterialButton
      react: ButtonContainer

  - name: label
    description: "Button text content"
    element_type: Label
    css_selectors: [".spectrum-Button-label"]
    figma_layer_names: ["Label", "Text"]
    platform_mappings:
      ios: titleLabel
      android: text
      react: children

  - name: icon
    description: "Optional button icon"
    element_type: Icon
    css_selectors: [".spectrum-Button-icon"]
    figma_layer_names: ["Icon"]
    platform_mappings:
      ios: imageView
      android: icon
      react: icon

relationships:
  - type: SpacingTo
    source: icon
    target: label
    description: "Space between icon and label"
    tokens: ["button-icon-to-label-spacing"]

  - type: SizingFor
    source: container
    target: icon
    description: "Icon size within button"
    tokens: ["button-icon-size"]
```

## Integration with Component Options Schema

```rust
// Automatically validate variants against component schema
impl TokenContext {
    pub fn validate_against_schema(&self) -> Result<(), ValidationError> {
        let schema = self.component.load_schema()?;

        for variant in &self.variants {
            // Ensure variant.option_name exists in schema
            let schema_property = schema.properties
                .get(&variant.option_name)
                .ok_or(ValidationError::UnknownVariant)?;

            // Ensure variant.value is valid for schema
            variant.value.validate_against_schema_property(schema_property)?;
        }

        Ok(())
    }
}
```

## Powerful Capabilities

### 1. Semantic Querying

```rust
// Find all hover state tokens for buttons
let hover_tokens = tokens
    .filter(|t| t.context.component.name == "button")
    .filter(|t| t.context.has_state(StateVariant::Hover))
    .collect();

// Find all spacing tokens between icons and labels
let icon_label_spacing = tokens
    .filter(|t| t.context.relationships.iter().any(|r|
        r.relationship_type == RelationshipType::SpacingTo &&
        r.involves_elements(&[AnatomyElement::Icon, AnatomyElement::Label])
    ))
    .collect();

// Find all tokens for large buttons across all components
let large_button_tokens = tokens
    .filter(|t| t.context.has_size_variant(SizeVariant::Large))
    .filter(|t| t.context.component.category == ComponentCategory::Actions)
    .collect();
```

### 2. Cross-Platform Consistency Validation

```rust
// Ensure all button variants have corresponding tokens
fn validate_button_completeness(tokens: &[ContextualToken]) -> ValidationResult {
    let button_schema = load_component_schema("button")?;
    let button_anatomy = load_component_anatomy("button")?;

    for size in button_schema.sizes() {
        for variant in button_schema.variants() {
            for state in button_schema.states() {
                for element in button_anatomy.elements() {
                    // Check that required tokens exist
                    ensure_token_exists(tokens, "button", element, size, variant, state)?;
                }
            }
        }
    }
}
```

### 3. Automated Migration Tools

```rust
// Generate migration guides based on context changes
impl ContextualToken {
    pub fn generate_migration_from(&self, old_token: &ContextualToken) -> MigrationGuide {
        if self.context.component != old_token.context.component {
            MigrationGuide::ComponentChanged {
                from: old_token.context.component.clone(),
                to: self.context.component.clone(),
                reason: "Component restructuring"
            }
        } else if self.context.variants != old_token.context.variants {
            MigrationGuide::VariantsChanged {
                added: self.context.variants.difference(&old_token.context.variants),
                removed: old_token.context.variants.difference(&self.context.variants),
                migration_strategy: "Update component usage"
            }
        }
        // ... more migration scenarios
    }
}
```

### 4. Platform-Specific Code Generation

```rust
// Generate platform-specific APIs from context
impl ContextualToken {
    pub fn generate_css_custom_properties(&self) -> String {
        format!(
            "--spectrum-{}-{}-{}: {};",
            self.context.component.name,
            self.context.anatomy.element.to_kebab_case(),
            self.context.property.semantic_meaning.to_kebab_case(),
            self.value.to_css_value()
        )
    }

    pub fn generate_swift_constants(&self) -> String {
        format!(
            "static let {}{}{}: {} = {}",
            self.context.component.name.to_pascal_case(),
            self.context.anatomy.element.to_pascal_case(),
            self.context.property.semantic_meaning.to_pascal_case(),
            self.value.swift_type(),
            self.value.to_swift_value()
        )
    }

    pub fn generate_kotlin_constants(&self) -> String {
        format!(
            "val {}{}{}: {} = {}",
            self.context.component.name.toCamelCase(),
            self.context.anatomy.element.toPascalCase(),
            self.context.property.semantic_meaning.toPascalCase(),
            self.value.kotlin_type(),
            self.value.to_kotlin_value()
        )
    }
}
```

## Implementation Strategy

### Phase 1: Context Schema Design (4 weeks)

- [ ] Design complete `TokenContext` type system
- [ ] Create component anatomy authoring format (YAML)
- [ ] Build validation against component options schemas
- [ ] Create context-to-name generation utilities

### Phase 2: Anatomy Data Creation (6 weeks)

- [ ] Author anatomy definitions for 10 core components (button, checkbox, menu, etc.)
- [ ] Link anatomy to existing Figma design specifications
- [ ] Create anatomy validation and consistency tools
- [ ] Generate anatomy documentation and visualizations

### Phase 3: Migration from Name-Encoded Tokens (8 weeks)

- [ ] Build parsers for existing token names → context objects
- [ ] Validate parsed context against schemas and anatomy data
- [ ] Generate new contextual token definitions for all existing tokens
- [ ] Maintain backward compatibility with name-based token lookups
- [ ] Create migration validation tools

### Phase 4: Advanced Context Features (6 weeks)

- [ ] Implement semantic querying APIs and tools
- [ ] Build cross-platform consistency validation dashboards
- [ ] Create automated migration tooling and change impact analysis
- [ ] Generate platform-specific code from context (CSS, Swift, Kotlin)

### Phase 5: Integration & Tooling (4 weeks)

- [ ] Integrate with diff generator for context-aware change detection
- [ ] Build IDE tooling for context-based token authoring
- [ ] Create design tool integrations (Figma plugin updates)
- [ ] Generate comprehensive documentation and examples

## Benefits

### For Design System Team

- **Semantic Understanding**: Rich context enables better design system governance
- **Automated Validation**: Ensure consistency across all components and variants
- **Impact Analysis**: Understand cross-component effects of token changes
- **Documentation Generation**: Automated anatomy and relationship documentation

### For Platform Teams

- **Platform-Native APIs**: Generate platform-specific code from universal context
- **Consistent Mapping**: Reliable translation from design intent to platform implementation
- **Migration Assistance**: Automated migration guides based on context changes
- **Validation Tools**: Ensure platform implementations match design specifications

### For Implementation Teams

- **Semantic Querying**: Find tokens by meaning rather than parsing names
- **Relationship Understanding**: Understand how tokens relate to component anatomy
- **Automated Updates**: Context-driven updates when component schemas change
- **Cross-Platform Consistency**: Ensure consistent token usage across platforms

This contextual metadata system transforms design tokens from simple name-value pairs into rich, semantically meaningful objects that enable powerful tooling, validation, and automation while maintaining the platform-agnostic nature of the design system core.
