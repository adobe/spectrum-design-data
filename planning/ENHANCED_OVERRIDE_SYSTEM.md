# Enhanced Platform Override System

## Executive Summary

This document expands the platform override system to support advanced data manipulation capabilities including filtering/exclusion, aliasing/renaming, and value transformations. These features enable platforms to create truly native experiences while maintaining consistency with the core design system.

## Enhanced Override Capabilities

### 1. Data Filtering and Exclusion

Platform SDKs can exclude irrelevant data to reduce bundle size and improve performance.

#### Filter Configuration

```yaml
# android-spectrum/overrides/filters.yml
platform: android_spectrum
override_schema_version: "1.4.0"

filters:
  # Exclude desktop-specific variations
  exclude_variations:
    - dimension: "platform-scale"
      values: ["desktop", "tv"]
      reason: "Android only supports mobile and tablet scales"

    - dimension: "density"
      values: ["super-dense"]
      reason: "Android UI guidelines don't support super-dense layouts"

  # Exclude specific token types
  exclude_token_types:
    - type: "animation"
      properties: ["duration", "easing"]
      condition: "value.duration > 500ms"
      reason: "Android prefers shorter animations per Material Design"

  # Exclude components not relevant to platform
  exclude_components:
    - name: "breadcrumbs"
      reason: "Not part of Material Design patterns"

    - name: "tabs"
      condition: "variant == 'vertical'"
      reason: "Android tabs are always horizontal"

  # Exclude tokens by semantic context
  exclude_tokens:
    - pattern: "*-desktop-*"
      reason: "Desktop-specific tokens not needed on Android"

    - pattern: "*-mouse-*"
      reason: "Mouse interaction tokens not relevant for touch"

    - component: "breadcrumbs"
      reason: "Component excluded, so tokens not needed"

# Size reduction impact
estimated_size_reduction:
  tokens: "significant reduction (exclude irrelevant tokens)"
  components: "moderate reduction (exclude unused components)"
  variations: "substantial reduction (exclude platform-specific variations)"
  total_sdk_size: "estimated significant reduction"
```

#### iOS Filter Example

```yaml
# ios-spectrum/overrides/filters.yml
platform: ios_spectrum
override_schema_version: "1.4.0"

filters:
  # iOS-specific exclusions
  exclude_variations:
    - dimension: "platform-scale"
      values: ["desktop"]
      reason: "iOS uses size classes, not desktop scale"

    - dimension: "density"
      values: ["super-dense", "compact"]
      reason: "iOS Human Interface Guidelines prefer comfortable spacing"

  # Exclude web-specific tokens
  exclude_tokens:
    - pattern: "*-focus-ring-*"
      reason: "iOS uses different focus indication patterns"

    - pattern: "*-cursor-*"
      reason: "No cursor on iOS touch interfaces"

  # Exclude components that map to native iOS patterns
  exclude_components:
    - name: "breadcrumbs"
      reason: "iOS uses navigation bar with back button instead"
      replacement: "UINavigationBar"

    - name: "tabs"
      condition: "container == 'popover'"
      reason: "iOS uses UITabBarController for tabs"
      replacement: "UITabBarController"

# iOS-specific optimizations
optimizations:
  bundle_size_target: "< 500KB"
  tree_shaking: true
  dead_code_elimination: true
```

### 2. Aliasing and Renaming

Platforms can rename components, properties, and tokens to match platform conventions.

#### Component Aliasing

```yaml
# react-spectrum/overrides/aliases.yml
platform: react_spectrum
override_schema_version: "1.4.0"

component_aliases:
  # Web platform prefers 'select' over 'picker'
  picker:
    alias: "select"
    reason: "Web developers expect 'Select' component naming"
    properties:
      # Property renaming within aliased component
      selectedKey: "value"
      onSelectionChange: "onChange"

  # Rename for React conventions
  action-button:
    alias: "IconButton"
    reason: "React ecosystem uses IconButton naming"
    properties:
      isQuiet: "variant"
      isSelected: "pressed"

  # Complex aliasing with property transformation
  combo-box:
    alias: "Combobox"
    reason: "React Aria uses Combobox spelling"
    properties:
      inputValue: "value"
      onInputChange: "onValueChange"
      selectedKey: "selectedValue"
      onSelectionChange: "onSelectedValueChange"

token_aliases:
  # Rename tokens to match web conventions
  "picker-*":
    alias_pattern: "select-*"
    reason: "Align token names with component alias"

  "action-button-*":
    alias_pattern: "icon-button-*"
    reason: "Align token names with component alias"

# Case transformation rules
naming_conventions:
  components: "PascalCase" # Button, Select, IconButton
  properties: "camelCase" # onChange, selectedValue
  tokens: "kebab-case" # select-background-color
  css_variables: "kebab-case" # --spectrum-select-background-color
```

#### iOS Aliasing Example

```yaml
# ios-spectrum/overrides/aliases.yml
platform: ios_spectrum
override_schema_version: "1.4.0"

component_aliases:
  # Map to iOS native component names
  picker:
    alias: "UIPickerView"
    reason: "iOS developers expect native UIKit naming"
    properties:
      selectedKey: "selectedRow"
      onSelectionChange: "didSelectRow"

  action-button:
    alias: "UIButton"
    reason: "Most action buttons map to UIButton"
    properties:
      isQuiet: "configuration.buttonStyle"
      icon: "configuration.image"

  menu:
    alias: "UIMenu"
    reason: "iOS 14+ uses UIMenu for contextual menus"
    properties:
      items: "children"
      onAction: "actionHandler"

token_aliases:
  # Transform to iOS naming patterns
  "*-background-color-*":
    alias_pattern: "*BackgroundColor*"
    case_transform: "camelCase"
    reason: "iOS uses camelCase for color properties"

  "*-border-radius":
    alias: "*CornerRadius"
    case_transform: "camelCase"
    reason: "iOS uses cornerRadius terminology"

# iOS-specific naming conventions
naming_conventions:
  components: "UIKitStyle" # UIButton, UIPickerView
  properties: "camelCase" # backgroundColor, cornerRadius
  tokens: "camelCase" # buttonBackgroundColor
  constants: "camelCase" # SpectrumColor.buttonBackgroundAccent
```

#### Android Aliasing Example

```yaml
# android-spectrum/overrides/aliases.yml
platform: android_spectrum
override_schema_version: "1.4.0"

component_aliases:
  # Map to Material Design component names
  picker:
    alias: "Spinner"
    reason: "Android uses Spinner for dropdown selection"
    properties:
      selectedKey: "selectedItemPosition"
      onSelectionChange: "onItemSelectedListener"

  action-button:
    alias: "FloatingActionButton"
    condition: "variant == 'accent' && style == 'fill'"
    reason: "Accent filled action buttons map to FAB"
    fallback: "MaterialButton"

  menu:
    alias: "PopupMenu"
    reason: "Android uses PopupMenu for contextual menus"
    properties:
      items: "menuItems"
      onAction: "onMenuItemClickListener"

token_aliases:
  # Transform to Android naming patterns
  "*-background-color-*":
    alias_pattern: "*_background_color_*"
    case_transform: "snake_case"
    reason: "Android resources use snake_case"

  "*-padding-*":
    alias_pattern: "*_padding_*"
    case_transform: "snake_case"
    reason: "Android dimension resources use snake_case"

# Android-specific naming conventions
naming_conventions:
  components: "MaterialDesign" # MaterialButton, Spinner
  properties: "camelCase" # backgroundColor, cornerRadius
  tokens: "snake_case" # button_background_color
  resources: "snake_case" # spectrum_button_background_color
```

### 3. Value Transformations

Platforms can transform token values to match platform-specific units, formats, and conventions.

#### Dimension Transformations

```yaml
# ios-spectrum/overrides/transformations.yml
platform: ios_spectrum
override_schema_version: "1.4.0"

value_transformations:
  # Convert pixels to points for iOS
  dimensions:
    - from_unit: "px"
      to_unit: "pt"
      conversion_factor: 1.0  # 1px = 1pt on iOS (handled by system)
      reason: "iOS uses points instead of pixels"

    - from_unit: "rem"
      to_unit: "pt"
      base_size: 16  # 1rem = 16pt
      reason: "Convert web rem units to iOS points"

  # Transform border radius values
  border_radius:
    - condition: "value > 50% || value == '50%'"
      transform: "pill"
      reason: "iOS prefers semantic 'pill' shape over percentage"

    - condition: "value < 4pt"
      transform: "round(value)"
      reason: "iOS prefers integer point values for small radii"

  # Transform color formats
  colors:
    - from_format: "hex"
      to_format: "uicolor"
      reason: "Generate UIColor initialization code"

    - from_format: "hsl"
      to_format: "uicolor"
      reason: "Convert HSL to UIColor"

  # Transform animation values
  animations:
    - property: "duration"
      transform: "clamp(value, 0.1, 0.4)"
      reason: "iOS prefers shorter animations (0.1-0.4s)"

    - property: "easing"
      mapping:
        "ease-in-out": "UIView.AnimationCurve.easeInOut"
        "ease-in": "UIView.AnimationCurve.easeIn"
        "ease-out": "UIView.AnimationCurve.easeOut"
        "linear": "UIView.AnimationCurve.linear"

# Example transformations
examples:
  input: "12px"
  output: "12.0"  # CGFloat points

  input: "1.5rem"
  output: "24.0"  # 1.5 * 16 = 24pt

  input: "#0066CC"
  output: "UIColor(red: 0.0, green: 0.4, blue: 0.8, alpha: 1.0)"

  input: "50%"
  output: "CGFloat.greatestFiniteMagnitude"  # Pill shape
```

#### Android Transformations

```yaml
# android-spectrum/overrides/transformations.yml
platform: android_spectrum
override_schema_version: "1.4.0"

value_transformations:
  # Convert pixels to density-independent pixels
  dimensions:
    - from_unit: "px"
      to_unit: "dp"
      conversion_factor: 1.0  # Assume baseline density
      reason: "Android uses dp for density independence"

    - from_unit: "rem"
      to_unit: "sp"
      base_size: 16  # Text uses sp (scalable pixels)
      condition: "property_type == 'font-size'"
      reason: "Android text uses sp for accessibility scaling"

  # Transform color formats to Android resources
  colors:
    - from_format: "hex"
      to_format: "android_color"
      reason: "Generate Android color resource format"

    - from_format: "rgba"
      to_format: "android_color"
      reason: "Convert RGBA to Android color format"

  # Transform shadows to Android elevation
  shadows:
    - property: "drop-shadow"
      transform: "extract_elevation(shadow.blur, shadow.offset)"
      reason: "Android uses elevation instead of explicit shadows"

  # Transform animations to Android values
  animations:
    - property: "duration"
      transform: "round(value * 1000)"  # Convert to milliseconds
      reason: "Android animations use milliseconds"

    - property: "easing"
      mapping:
        "ease-in-out": "android.view.animation.AccelerateDecelerateInterpolator"
        "ease-in": "android.view.animation.AccelerateInterpolator"
        "ease-out": "android.view.animation.DecelerateInterpolator"
        "linear": "android.view.animation.LinearInterpolator"

# Example transformations
examples:
  input: "12px"
  output: "12dp"

  input: "16px" (font-size)
  output: "16sp"

  input: "#0066CC"
  output: "@color/spectrum_blue_600"  # Resource reference

  input: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
  output: "2dp"  # Elevation value
```

#### CSS/Web Transformations

```yaml
# react-spectrum/overrides/transformations.yml
platform: react_spectrum
override_schema_version: "1.4.0"

value_transformations:
  # CSS custom property generation
  css_variables:
    - pattern: "*"
      prefix: "--spectrum-"
      case_transform: "kebab-case"
      reason: "Generate CSS custom properties with consistent naming"

  # Transform dimensions for web
  dimensions:
    - from_unit: "pt"
      to_unit: "px"
      conversion_factor: 1.333  # 1pt = 1.333px at 96dpi
      reason: "Web uses pixels, design uses points"

    - condition: "value < 1px"
      transform: "1px"
      reason: "Web minimum of 1px for visibility"

  # Transform colors for web accessibility
  colors:
    - condition: "contrast_ratio < 4.5"
      transform: "adjust_contrast(color, 4.5)"
      reason: "Ensure WCAG AA compliance"

  # Transform component names for web conventions
  component_names:
    - from: "action-button"
      to: "icon-button"
      reason: "Web developers expect IconButton naming"

    - from: "picker"
      to: "select"
      reason: "HTML select element naming convention"

# CSS output examples
examples:
  input: "button-background-color-accent"
  output: "--spectrum-button-background-color-accent"

  input: "12pt"
  output: "16px"  # 12 * 1.333 = 16px

  input: "actionButton"
  output: "icon-button"
```

## Advanced Override Processing

### Conditional Transformations

```yaml
# Complex conditional logic for transformations
conditional_transformations:
  # iOS-specific conditional transforms
  - platform: ios_spectrum
    conditions:
      - if: "component == 'button' && size == 'small'"
        then:
          min_height: "44pt"  # iOS minimum touch target
          reason: "iOS Human Interface Guidelines minimum touch target"

      - if: "token_type == 'color' && usage_context == 'text'"
        then:
          ensure_contrast: "4.5:1"
          reason: "iOS accessibility requirements"

  # Android-specific conditional transforms
  - platform: android_spectrum
    conditions:
      - if: "component == 'button' && variant == 'accent'"
        then:
          map_to: "MaterialButton"
          style: "Widget.Material3.Button"
          reason: "Use Material Design 3 accent button style"

      - if: "dimension_type == 'spacing' && value < 8dp"
        then:
          round_to: "4dp"
          reason: "Android prefers 4dp grid alignment"

# Transformation pipeline order
processing_order:
  1. "filters"        # Remove irrelevant data first
  2. "aliases"        # Rename components/properties
  3. "transformations" # Transform values
  4. "conditionals"   # Apply conditional logic
  5. "validation"     # Validate final output
```

### Override Composition

```yaml
# Multiple override files can be composed
override_composition:
  base_overrides: "base-android.yml"      # Common Android overrides
  device_overrides: "tablet-android.yml"  # Tablet-specific overrides
  brand_overrides: "creative-android.yml" # Creative Cloud brand overrides

composition_strategy: "merge_with_priority"
priority_order:
  1. "brand_overrides"   # Highest priority
  2. "device_overrides"  # Medium priority
  3. "base_overrides"    # Lowest priority

# Merge conflict resolution
conflict_resolution:
  strategy: "explicit_override"
  require_justification: true
  log_conflicts: true
```

## Implementation in SDK Generation

### Enhanced Override Processor

```rust
// Enhanced override processing in Rust core
pub struct EnhancedOverrideProcessor {
    pub filters: FilterConfig,
    pub aliases: AliasConfig,
    pub transformations: TransformationConfig,
    pub platform: Platform,
}

impl EnhancedOverrideProcessor {
    pub fn process_design_data(&self, design_data: &SpectrumDesignData) -> ProcessedDesignData {
        let mut processed = design_data.clone();

        // 1. Apply filters first (remove irrelevant data)
        processed = self.apply_filters(processed);

        // 2. Apply aliases (rename components/properties/tokens)
        processed = self.apply_aliases(processed);

        // 3. Apply value transformations
        processed = self.apply_transformations(processed);

        // 4. Apply conditional logic
        processed = self.apply_conditionals(processed);

        // 5. Validate final output
        self.validate_processed_data(&processed);

        processed
    }

    fn apply_filters(&self, mut data: SpectrumDesignData) -> SpectrumDesignData {
        // Remove excluded variations
        for exclusion in &self.filters.exclude_variations {
            data.variations.remove_dimension_values(&exclusion.dimension, &exclusion.values);
        }

        // Remove excluded components
        for exclusion in &self.filters.exclude_components {
            if self.should_exclude_component(&exclusion, &data) {
                data.components.remove(&exclusion.name);
            }
        }

        // Remove excluded tokens
        data.tokens.retain(|token_id, token| {
            !self.should_exclude_token(token_id, token, &self.filters.exclude_tokens)
        });

        data
    }

    fn apply_aliases(&self, mut data: SpectrumDesignData) -> SpectrumDesignData {
        // Alias components
        for (original_name, alias_config) in &self.aliases.component_aliases {
            if let Some(component) = data.components.remove(original_name) {
                let mut aliased_component = component;

                // Rename properties within component
                for (original_prop, alias_prop) in &alias_config.properties {
                    if let Some(prop_def) = aliased_component.properties.remove(original_prop) {
                        aliased_component.properties.insert(alias_prop.clone(), prop_def);
                    }
                }

                data.components.insert(alias_config.alias.clone(), aliased_component);
            }
        }

        // Alias tokens
        for (pattern, alias_config) in &self.aliases.token_aliases {
            let matching_tokens: Vec<_> = data.tokens.keys()
                .filter(|name| self.matches_pattern(name, pattern))
                .cloned()
                .collect();

            for token_name in matching_tokens {
                if let Some(token) = data.tokens.remove(&token_name) {
                    let new_name = self.apply_alias_pattern(&token_name, &alias_config.alias_pattern);
                    data.tokens.insert(new_name, token);
                }
            }
        }

        data
    }

    fn apply_transformations(&self, mut data: SpectrumDesignData) -> SpectrumDesignData {
        for (token_id, token) in &mut data.tokens {
            // Transform token values based on type and platform
            token.value = self.transform_token_value(&token.value, &token.context);

            // Transform variation values
            for (variation_key, variation_value) in &mut token.variations.values {
                *variation_value = self.transform_token_value(variation_value, &token.context);
            }
        }

        data
    }

    fn transform_token_value(&self, value: &TokenValue, context: &TokenContext) -> TokenValue {
        match (&value, &context.property.property_type) {
            (TokenValue::Dimension(dim), PropertyType::Dimension { unit, .. }) => {
                self.transform_dimension(dim, unit)
            },
            (TokenValue::Color(color), PropertyType::Color { .. }) => {
                self.transform_color(color, context)
            },
            (TokenValue::Animation(anim), PropertyType::Animation { .. }) => {
                self.transform_animation(anim)
            },
            _ => value.clone(),
        }
    }

    fn transform_dimension(&self, dimension: &Dimension, unit: &DimensionUnit) -> TokenValue {
        match self.platform {
            Platform::iOS => {
                // Convert to points
                let points = match dimension.unit {
                    DimensionUnit::Pixels => dimension.value, // 1px = 1pt on iOS
                    DimensionUnit::Rem => dimension.value * 16.0, // 1rem = 16pt
                    DimensionUnit::Points => dimension.value,
                    _ => dimension.value,
                };
                TokenValue::Dimension(Dimension { value: points, unit: DimensionUnit::Points })
            },
            Platform::Android => {
                // Convert to dp
                let dp = match dimension.unit {
                    DimensionUnit::Pixels => dimension.value, // Assume 1px = 1dp
                    DimensionUnit::Rem => dimension.value * 16.0, // 1rem = 16dp
                    DimensionUnit::Points => dimension.value * 1.333, // 1pt = 1.333dp
                    _ => dimension.value,
                };
                TokenValue::Dimension(Dimension { value: dp, unit: DimensionUnit::Dp })
            },
            Platform::Web => {
                // Keep as pixels or convert from points
                let pixels = match dimension.unit {
                    DimensionUnit::Points => dimension.value * 1.333, // 1pt = 1.333px
                    DimensionUnit::Rem => dimension.value * 16.0, // 1rem = 16px
                    _ => dimension.value,
                };
                TokenValue::Dimension(Dimension { value: pixels, unit: DimensionUnit::Pixels })
            },
        }
    }

    fn transform_color(&self, color: &Color, context: &TokenContext) -> TokenValue {
        match self.platform {
            Platform::iOS => {
                // Generate UIColor format
                TokenValue::PlatformSpecific(PlatformValue::iOS(IOSColor {
                    red: color.red / 255.0,
                    green: color.green / 255.0,
                    blue: color.blue / 255.0,
                    alpha: color.alpha,
                }))
            },
            Platform::Android => {
                // Generate Android color resource
                TokenValue::PlatformSpecific(PlatformValue::Android(AndroidColor {
                    resource_name: self.generate_android_color_name(context),
                    hex_value: color.to_hex(),
                }))
            },
            Platform::Web => {
                // Keep as hex or generate CSS custom property
                TokenValue::Color(color.clone())
            },
        }
    }
}
```

### Platform SDK Integration

```typescript
// React SDK with enhanced overrides
export class ReactSpectrumSDK {
  private overrideProcessor: EnhancedOverrideProcessor;

  constructor() {
    this.overrideProcessor = new EnhancedOverrideProcessor({
      platform: Platform.React,
      filters: this.loadFilters(),
      aliases: this.loadAliases(),
      transformations: this.loadTransformations(),
    });
  }

  // Components are automatically aliased
  public get Select() {
    // Aliased from 'picker'
    return this.getComponent("picker"); // Internal name still 'picker'
  }

  public get IconButton() {
    // Aliased from 'action-button'
    return this.getComponent("action-button");
  }

  // Tokens are automatically transformed and aliased
  public getToken(tokenName: string): string {
    // tokenName can use alias (e.g., 'select-background-color')
    // Internally resolves to 'picker-background-color'
    const internalName = this.resolveAlias(tokenName);
    const token = this.designData.getToken(internalName);
    return this.transformValueForWeb(token.value);
  }
}
```

## Benefits

### For Platform Teams

- ✅ **Reduced Bundle Size**: Filter out irrelevant data (estimated significant size reduction)
- ✅ **Platform-Native APIs**: Aliases create familiar naming conventions
- ✅ **Proper Value Types**: Transformations ensure platform-appropriate units/formats
- ✅ **Maintainable Overrides**: Declarative YAML configuration instead of code

### For Developers

- ✅ **Familiar APIs**: Components and tokens use expected platform naming
- ✅ **Correct Units**: Values automatically converted to platform standards
- ✅ **Smaller Downloads**: Only relevant data included in SDK
- ✅ **Better Performance**: Less data to process at runtime

### For Design System Team

- ✅ **Platform Flexibility**: Platforms can adapt without compromising core design
- ✅ **Consistent Governance**: All transformations are documented and versioned
- ✅ **Impact Visibility**: Clear understanding of how data is modified per platform
- ✅ **Quality Assurance**: Validation ensures transformations don't break design intent

This enhanced override system provides the flexibility needed for truly platform-native SDKs while maintaining the integrity and consistency of the core design system.
