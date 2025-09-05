# Spectrum Contextual Variations System

## Executive Summary

This document outlines a comprehensive system for handling contextual variations in design tokens that goes beyond the current limited "sets" approach. The new system supports multiple independent variation dimensions including color themes, platform scales, density modes, accessibility modes, and system brands.

## Current System Limitations

### Conflated "Sets" Concept

Current token system has three hardcoded set types:

1. **Color Sets**: `light`, `dark`, `wireframe`
2. **Scale Sets**: `desktop`, `mobile`
3. **System Sets**: `spectrum`, `express`

**Problems with Current Approach:**

- **Hardcoded Types**: Only 3 predefined set types, can't add new dimensions
- **Single Dimension**: Each token can only vary along one axis at a time
- **No Composition**: Can't combine variations (e.g., `dark` + `high-contrast` + `super-dense`)
- **Limited Expressiveness**: Real-world needs like accessibility, density, brand systems not supported
- **Terminology Confusion**: "Sets" doesn't clearly convey purpose

## Proposed: Multi-Dimensional Contextual Variations

### Core Architecture

Instead of "sets", we introduce **Contextual Variations** - multiple independent dimensions that can be combined:

```rust
#[derive(Debug, Clone)]
pub struct ContextualToken {
    pub uuid: Uuid,
    pub base_value: TokenValue,                    // Default/fallback value
    pub variations: VariationMatrix,               // Multi-dimensional variations
    pub context: TokenContext,                     // Component/property context
    pub lifecycle: LifecycleMetadata,             // Lifecycle information
}

#[derive(Debug, Clone)]
pub struct VariationMatrix {
    pub dimensions: Vec<VariationDimension>,
    pub values: HashMap<VariationKey, TokenValue>,
}

#[derive(Debug, Clone)]
pub struct VariationDimension {
    pub name: String,                             // "color-theme", "density", "contrast"
    pub dimension_type: VariationDimensionType,
    pub values: Vec<VariationValue>,
    pub default: VariationValue,
    pub system_wide: bool,                        // Affects all tokens vs. specific tokens
}
```

### Variation Dimension Types

```rust
#[derive(Debug, Clone)]
pub enum VariationDimensionType {
    // Current dimensions (migrated)
    ColorTheme {
        affects: Vec<TokenType>,                  // Which token types this affects
        css_media_query: Option<String>,          // "@media (prefers-color-scheme: dark)"
        platform_detection: HashMap<Platform, String>,
    },

    PlatformScale {
        affects: Vec<TokenType>,
        breakpoints: HashMap<String, String>,     // CSS breakpoints, iOS size classes, etc.
        platform_detection: HashMap<Platform, String>,
    },

    SystemBrand {
        affects: Vec<TokenType>,
        brand_guidelines: HashMap<String, BrandSpec>,
    },

    // New dimensions
    Density {
        affects: Vec<TokenType>,                  // Spacing, sizing tokens
        multipliers: HashMap<String, f64>,        // How each density affects values
        platform_support: HashMap<Platform, bool>,
    },

    Contrast {
        affects: Vec<TokenType>,                  // Color, border tokens
        accessibility_level: AccessibilityLevel, // WCAG AA, AAA
        platform_detection: HashMap<Platform, String>,
    },

    MotionPreference {
        affects: Vec<TokenType>,                  // Animation, transition tokens
        css_media_query: Option<String>,          // "@media (prefers-reduced-motion)"
        platform_detection: HashMap<Platform, String>,
    },

    LocalizationContext {
        affects: Vec<TokenType>,                  // Typography, spacing tokens
        text_direction: TextDirection,            // LTR, RTL
        script_requirements: Vec<Script>,         // Latin, CJK, Arabic
        platform_detection: HashMap<Platform, String>,
    },

    // Extensible for future needs
    Custom {
        name: String,
        affects: Vec<TokenType>,
        detection_strategy: DetectionStrategy,
    },
}
```

### Variation Values

```rust
#[derive(Debug, Clone)]
pub enum VariationValue {
    // Color Theme variations
    Light, Dark, Wireframe, HighContrast, LowContrast,

    // Platform Scale variations
    Desktop, Mobile, Tablet, Watch, TV,

    // System Brand variations
    Spectrum, Express, Creative, Document, Experience,

    // Density variations
    Comfortable, Cozy, Compact, SuperDense,

    // Contrast variations
    Standard, High, Low, BlackOnWhite, WhiteOnBlack,

    // Motion variations
    Full, Reduced, None,

    // Localization variations
    Latin, CJK, Arabic, Devanagari,

    // Custom variations
    Custom(String),
}
```

### Multi-Dimensional Token Examples

#### Simple: Single Dimension (Current System Compatible)

```rust
// Equivalent to current color-set
ContextualToken {
    uuid: "overlay-opacity-uuid",
    base_value: Opacity(0.4),
    variations: VariationMatrix {
        dimensions: vec![
            VariationDimension {
                name: "color-theme",
                dimension_type: VariationDimensionType::ColorTheme,
                values: vec![Light, Dark, Wireframe],
                default: Light,
                system_wide: true,
            }
        ],
        values: {
            "color-theme:light" => Opacity(0.4),
            "color-theme:dark" => Opacity(0.6),
            "color-theme:wireframe" => Opacity(0.4),
        }
    },
    // ... context and lifecycle
}
```

#### Complex: Multi-Dimensional Variations

```rust
// Button padding that varies by theme, density, and platform
ContextualToken {
    uuid: "button-padding-uuid",
    base_value: Dimension::Pixels(12),
    variations: VariationMatrix {
        dimensions: vec![
            VariationDimension {
                name: "color-theme",
                dimension_type: VariationDimensionType::ColorTheme,
                values: vec![Light, Dark, HighContrast],
                default: Light,
                system_wide: true,
            },
            VariationDimension {
                name: "density",
                dimension_type: VariationDimensionType::Density {
                    multipliers: {
                        "comfortable" => 1.0,
                        "cozy" => 0.85,
                        "compact" => 0.7,
                        "super-dense" => 0.5,
                    }
                },
                values: vec![Comfortable, Cozy, Compact, SuperDense],
                default: Comfortable,
                system_wide: true,
            },
            VariationDimension {
                name: "platform-scale",
                dimension_type: VariationDimensionType::PlatformScale,
                values: vec![Desktop, Mobile],
                default: Desktop,
                system_wide: true,
            }
        ],
        values: {
            // Standard combinations
            "color-theme:light,density:comfortable,platform-scale:desktop" => Dimension::Pixels(12),
            "color-theme:light,density:comfortable,platform-scale:mobile" => Dimension::Pixels(16),
            "color-theme:light,density:cozy,platform-scale:desktop" => Dimension::Pixels(10),
            "color-theme:light,density:compact,platform-scale:desktop" => Dimension::Pixels(8),
            "color-theme:light,density:super-dense,platform-scale:desktop" => Dimension::Pixels(6),

            // High contrast needs more space for better touch targets
            "color-theme:high-contrast,density:comfortable,platform-scale:desktop" => Dimension::Pixels(14),
            "color-theme:high-contrast,density:comfortable,platform-scale:mobile" => Dimension::Pixels(18),

            // Dark theme variations
            "color-theme:dark,density:comfortable,platform-scale:desktop" => Dimension::Pixels(12),
            "color-theme:dark,density:comfortable,platform-scale:mobile" => Dimension::Pixels(16),

            // ... additional combinations as needed
        }
    },
    // ... context and lifecycle
}
```

## System-Wide Variation Definitions

### Variation Dimension Specifications

#### 1. Color Theme (Enhanced)

```yaml
# variations/color-theme.yml
name: color-theme
description: "Color theme variations for different visual modes"
system_wide: true
dimension_type: ColorTheme

values:
  - name: light
    description: "Light color theme"
    css_media_query: "@media (prefers-color-scheme: light)"
    platform_detection:
      ios: "UITraitCollection.userInterfaceStyle == .light"
      android: "Configuration.UI_MODE_NIGHT_NO"
      web: "window.matchMedia('(prefers-color-scheme: light)').matches"

  - name: dark
    description: "Dark color theme"
    css_media_query: "@media (prefers-color-scheme: dark)"
    platform_detection:
      ios: "UITraitCollection.userInterfaceStyle == .dark"
      android: "Configuration.UI_MODE_NIGHT_YES"
      web: "window.matchMedia('(prefers-color-scheme: dark)').matches"

  - name: wireframe
    description: "Wireframe/blueprint mode for design tools"
    platform_detection:
      figma: "figma.currentPage.selection.wireframe"
      sketch: "MSDocument.wireframeMode"

  - name: high-contrast
    description: "High contrast mode for accessibility"
    css_media_query: "@media (prefers-contrast: high)"
    platform_detection:
      ios: "UIAccessibility.isDarkerSystemColorsEnabled"
      android: "AccessibilityManager.isHighTextContrastEnabled"
      web: "window.matchMedia('(prefers-contrast: high)').matches"
      windows: "SystemParameters.HighContrast"

default: light
affects:
  - Color
  - Opacity
  - Shadow
```

#### 2. Density (New)

```yaml
# variations/density.yml
name: density
description: "Interface density for different application contexts"
system_wide: true
dimension_type: Density

values:
  - name: comfortable
    description: "Standard comfortable spacing"
    multiplier: 1.0
    use_cases: ["general applications", "consumer software"]

  - name: cozy
    description: "Slightly tighter spacing"
    multiplier: 0.85
    use_cases: ["productivity applications", "dashboard interfaces"]

  - name: compact
    description: "Compact spacing for information density"
    multiplier: 0.7
    use_cases: ["data tables", "developer tools", "admin interfaces"]

  - name: super-dense
    description: "Maximum density for professional tools"
    multiplier: 0.5
    use_cases: ["Premiere Pro", "After Effects", "advanced pro tools"]

default: comfortable
affects:
  - Dimension
  - Spacing
  - FontSize

platform_support:
  desktop: true
  mobile: false # Mobile typically uses comfortable only
  tablet: true

detection_strategy:
  user_preference: true # User can choose density
  application_context: true # App can set default based on type
  platform_detection:
    web: "localStorage.getItem('spectrum-density') || 'comfortable'"
    electron: "app.getApplicationDensity()"
```

#### 3. Contrast (New)

```yaml
# variations/contrast.yml
name: contrast
description: "Contrast variations for accessibility needs"
system_wide: true
dimension_type: Contrast

values:
  - name: standard
    description: "Standard contrast ratios"
    wcag_level: "AA"
    min_contrast_ratio: 3.0

  - name: high
    description: "High contrast for accessibility"
    wcag_level: "AAA"
    min_contrast_ratio: 7.0
    css_media_query: "@media (prefers-contrast: high)"
    platform_detection:
      ios: "UIAccessibility.isDarkerSystemColorsEnabled"
      android: "AccessibilityManager.isHighTextContrastEnabled"
      windows: "SystemParameters.HighContrast"

  - name: low
    description: "Lower contrast for sensitive users"
    wcag_level: "A"
    min_contrast_ratio: 2.0
    css_media_query: "@media (prefers-contrast: low)"

default: standard
affects:
  - Color
  - Border
  - Shadow

accessibility_compliance:
  required_for: ["government", "healthcare", "education"]
  optional_for: ["consumer", "gaming"]
```

#### 4. Motion Preference (New)

```yaml
# variations/motion-preference.yml
name: motion-preference
description: "Animation and motion preferences"
system_wide: true
dimension_type: MotionPreference

values:
  - name: full
    description: "Full animations and transitions"
    duration_multiplier: 1.0

  - name: reduced
    description: "Reduced motion for accessibility"
    duration_multiplier: 0.3
    css_media_query: "@media (prefers-reduced-motion: reduce)"
    platform_detection:
      ios: "UIAccessibility.isReduceMotionEnabled"
      android: "AccessibilityManager.isAnimationDisabled"

  - name: none
    description: "No animations"
    duration_multiplier: 0.0

default: full
affects:
  - Animation
  - Transition
  - Duration

accessibility_requirement: true
```

## Token Value Resolution

### Resolution Algorithm

```rust
impl ContextualToken {
    pub fn resolve_value(&self, context: &VariationContext) -> TokenValue {
        // 1. Build variation key from current context
        let variation_key = self.build_variation_key(context);

        // 2. Try exact match first
        if let Some(value) = self.variations.values.get(&variation_key) {
            return value.clone();
        }

        // 3. Try partial matches (fallback strategy)
        let fallback_value = self.resolve_with_fallbacks(context);

        // 4. Return base value if no matches
        fallback_value.unwrap_or_else(|| self.base_value.clone())
    }

    fn resolve_with_fallbacks(&self, context: &VariationContext) -> Option<TokenValue> {
        // Priority-based fallback:
        // 1. Drop least important dimensions first
        // 2. Fall back to default values for missing dimensions
        // 3. Use base value as final fallback

        let fallback_strategies = vec![
            // Try without custom dimensions
            context.without_custom_dimensions(),
            // Try with all defaults except color theme
            context.with_defaults_except(&["color-theme"]),
            // Try with all defaults except platform scale
            context.with_defaults_except(&["platform-scale"]),
            // Try with only color theme
            context.only_dimensions(&["color-theme"]),
            // Try with only platform scale
            context.only_dimensions(&["platform-scale"]),
        ];

        for strategy in fallback_strategies {
            let key = self.build_variation_key(&strategy);
            if let Some(value) = self.variations.values.get(&key) {
                return Some(value.clone());
            }
        }

        None
    }
}
```

### Usage Examples

```rust
// Get token value for current system context
let variation_context = VariationContext {
    color_theme: Dark,
    density: Compact,
    platform_scale: Desktop,
    contrast: High,
    motion_preference: Reduced,
};

let button_padding = button_padding_token.resolve_value(&variation_context);
// Returns: 10px (dark + compact + desktop + high-contrast + reduced-motion)

// Platform-specific resolution
let css_value = button_padding_token.resolve_for_platform(Platform::CSS, &variation_context);
// Returns: "--spectrum-button-padding: 10px;"

let swift_value = button_padding_token.resolve_for_platform(Platform::iOS, &variation_context);
// Returns: "static let buttonPadding: CGFloat = 10.0"
```

## Integration with Existing Systems

### Backward Compatibility

```rust
// Current color-set tokens automatically work
impl From<ColorSetToken> for ContextualToken {
    fn from(color_set: ColorSetToken) -> Self {
        ContextualToken {
            uuid: color_set.uuid,
            base_value: color_set.sets.light.value, // Use light as base
            variations: VariationMatrix {
                dimensions: vec![COLOR_THEME_DIMENSION],
                values: {
                    "color-theme:light" => color_set.sets.light.value,
                    "color-theme:dark" => color_set.sets.dark.value,
                    "color-theme:wireframe" => color_set.sets.wireframe.value,
                }
            },
            // ... migrate other fields
        }
    }
}

// Current scale-set tokens automatically work
impl From<ScaleSetToken> for ContextualToken {
    fn from(scale_set: ScaleSetToken) -> Self {
        ContextualToken {
            uuid: scale_set.uuid,
            base_value: scale_set.sets.desktop.value, // Use desktop as base
            variations: VariationMatrix {
                dimensions: vec![PLATFORM_SCALE_DIMENSION],
                values: {
                    "platform-scale:desktop" => scale_set.sets.desktop.value,
                    "platform-scale:mobile" => scale_set.sets.mobile.value,
                }
            },
            // ... migrate other fields
        }
    }
}
```

### Platform Code Generation

```rust
// Generate platform-specific variation resolution
impl ContextualToken {
    pub fn generate_css_custom_properties(&self) -> String {
        format!(r#"
            --spectrum-{}: {};

            @media (prefers-color-scheme: dark) {{
                --spectrum-{}: {};
            }}

            @media (prefers-contrast: high) {{
                --spectrum-{}: {};
            }}

            @media (prefers-reduced-motion: reduce) {{
                --spectrum-{}: {};
            }}
        "#,
            self.css_name(), self.resolve_value(&DEFAULT_CONTEXT),
            self.css_name(), self.resolve_value(&DARK_CONTEXT),
            self.css_name(), self.resolve_value(&HIGH_CONTRAST_CONTEXT),
            self.css_name(), self.resolve_value(&REDUCED_MOTION_CONTEXT),
        )
    }

    pub fn generate_swift_variations(&self) -> String {
        format!(r#"
            static var {}: {} {{
                if UITraitCollection.current.userInterfaceStyle == .dark {{
                    return {}
                }} else if UIAccessibility.isDarkerSystemColorsEnabled {{
                    return {}
                }} else {{
                    return {}
                }}
            }}
        "#,
            self.swift_name(), self.swift_type(),
            self.resolve_value(&DARK_CONTEXT).to_swift(),
            self.resolve_value(&HIGH_CONTRAST_CONTEXT).to_swift(),
            self.resolve_value(&DEFAULT_CONTEXT).to_swift(),
        )
    }
}
```

## Implementation Phases

### Phase 1: Core Variation Architecture (4 weeks)

- [ ] Design and implement `VariationMatrix` and `VariationDimension` types
- [ ] Create variation resolution algorithm with fallback strategies
- [ ] Build migration tools from current set types to new variation system
- [ ] Implement backward compatibility for existing color-set, scale-set, system-set tokens

### Phase 2: New Variation Dimensions (6 weeks)

- [ ] Implement density variation system with multiplier-based scaling
- [ ] Add contrast variation with accessibility compliance checking
- [ ] Create motion preference variation with duration scaling
- [ ] Build localization context variation for international support

### Phase 3: Authoring & Tooling (4 weeks)

- [ ] Create YAML-based variation dimension authoring system
- [ ] Build validation tools for variation completeness and consistency
- [ ] Implement variation conflict detection and resolution
- [ ] Create visual tools for exploring variation combinations

### Phase 4: Platform Integration (6 weeks)

- [ ] Generate platform-specific variation resolution code (CSS, Swift, Kotlin)
- [ ] Integrate with platform detection APIs and media queries
- [ ] Build runtime libraries for each platform to resolve variations
- [ ] Create testing tools for variation resolution across platforms

### Phase 5: Design Tool Integration (4 weeks)

- [ ] Integrate variation system with Figma plugin for design-time preview
- [ ] Build variation context switcher for design tools
- [ ] Create variation documentation and visualization tools
- [ ] Implement variation impact analysis for design changes

## Benefits

### For Design Teams

- **Flexible Variations**: Support any number of contextual dimensions
- **Real-World Scenarios**: Density, accessibility, motion preferences addressed
- **Design Tool Integration**: Preview variations in Figma/Sketch
- **Systematic Approach**: Consistent variation handling across all tokens

### For Platform Teams

- **Native Integration**: Platform-specific detection and resolution
- **Performance Optimized**: Efficient resolution with smart fallbacks
- **Extensible**: Add platform-specific variation dimensions as needed
- **Consistent API**: Uniform variation resolution across all platforms

### For Users & Accessibility

- **Accessibility First**: Built-in support for contrast, motion, density preferences
- **User Control**: Users can customize density, contrast, motion preferences
- **Platform Native**: Respects platform accessibility settings automatically
- **Standards Compliant**: WCAG compliance built into contrast variations

This contextual variations system provides a comprehensive foundation for handling the complex reality of design tokens across different themes, platforms, densities, accessibility needs, and future requirements while maintaining backward compatibility and platform-specific optimization.
