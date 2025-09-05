# Enhanced Token Distribution Architecture

## Executive Summary

This document outlines an enhanced token distribution system that builds on the existing `@adobe/spectrum-tokens` package to provide better consumption patterns, richer metadata, and improved tooling while maintaining backward compatibility and voluntary adoption.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│              Enhanced Spectrum Tokens (Node.js)                │
│  • Lifecycle metadata (introduced, deprecated, removed)        │
│  • Contextual metadata (component, property, usage)            │
│  • Simple build system (no Style Dictionary complexity)        │
└─────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   Enhanced JSON     │ │   Legacy Formats    │ │   Future Formats    │
│                     │ │                     │ │                     │
│ • Rich metadata     │ │ • variables.json    │ │ • Platform-specific │
│ • Semantic queries  │ │ • drover.json       │ │   (if teams want)   │
│ • Better diffs      │ │ • Backward compat   │ │ • Optional adoption │
│ • Migration guides  │ │ • No breaking chgs  │ │ • Prove value first │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

## Simple Node.js Build System

### Enhanced Token Processing

```javascript
// tasks/buildTokens.js - Simple, maintainable build system
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { glob } from "glob";

class TokenBuilder {
  constructor() {
    this.tokens = new Map();
  }

  // Load all source files (existing format)
  loadSources() {
    const files = glob.sync("src/**/*.json");
    for (const file of files) {
      const content = JSON.parse(readFileSync(file, "utf8"));
      Object.entries(content).forEach(([name, token]) => {
        this.tokens.set(name, {
          ...token,
          sourceFile: file,
          // Add lifecycle metadata if present
          lifecycle: token.lifecycle || { status: "stable" },
        });
      });
    }
  }

  // Generate clean output formats
  generateOutputs() {
    this.generateVariables(); // Clean variables.json
    this.generateEnhanced(); // Rich metadata format
    this.generateDrover(); // Maintain Drover compatibility
  }
}
```

### Cross-Platform Compilation

```rust
// spectrum-design-data/src/lib.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpectrumDesignData {
    pub components: HashMap<String, Component>,
    pub tokens: HashMap<String, ContextualToken>,
    pub variations: VariationRegistry,
    pub lifecycle_metadata: LifecycleRegistry,
}

// Platform-specific exports
#[cfg(feature = "ios")]
pub mod ios_bindings;

#[cfg(feature = "android")]
pub mod android_bindings;

#[cfg(feature = "web")]
pub mod web_bindings;

// Core API that all platforms use
impl SpectrumDesignData {
    pub fn resolve_token_value(&self, token_id: &str, context: &VariationContext) -> Option<TokenValue> {
        // Universal token resolution logic
    }

    pub fn get_component_lifecycle(&self, component: &str) -> Option<&LifecycleMetadata> {
        // Universal lifecycle querying
    }

    pub fn generate_platform_assets(&self, platform: Platform, overrides: &PlatformOverrides) -> PlatformAssets {
        // Generate platform-specific assets
    }
}
```

## Platform SDK Generation

### iOS SDK (Swift Package)

```swift
// SpectrumDesignDataiOS/Sources/SpectrumDesignData/SpectrumDesignData.swift
import Foundation
import spectrum_design_data_ios // Rust FFI bindings

@available(iOS 13.0, *)
public final class SpectrumDesignData {
    private let rustCore: OpaquePointer
    private let overrides: iOSOverrides

    public init(overrides: iOSOverrides = .default) {
        self.rustCore = spectrum_design_data_ios_new()
        self.overrides = overrides
    }

    deinit {
        spectrum_design_data_ios_free(rustCore)
    }
}

// Platform-native API
public extension SpectrumDesignData {
    /// Get button padding for current iOS context
    func buttonPadding(
        size: ButtonSize = .medium,
        style: ButtonStyle = .filled,
        traitCollection: UITraitCollection = .current
    ) -> CGFloat {
        let context = VariationContext(
            colorTheme: traitCollection.userInterfaceStyle.spectrumTheme,
            platformScale: traitCollection.userInterfaceIdiom.spectrumScale,
            density: overrides.density,
            contrast: traitCollection.accessibilityContrast.spectrumContrast
        )

        return spectrum_design_data_ios_resolve_token(
            rustCore,
            "button-padding",
            size.rawValue,
            style.rawValue,
            context.toCStruct()
        )
    }

    /// Get component lifecycle information
    func componentLifecycle(for component: String) -> ComponentLifecycle? {
        guard let cLifecycle = spectrum_design_data_ios_get_lifecycle(rustCore, component) else {
            return nil
        }
        return ComponentLifecycle(cLifecycle: cLifecycle, overrides: overrides)
    }
}

// iOS-specific types that feel native
public enum ButtonSize: String, CaseIterable {
    case small = "s"
    case medium = "m"
    case large = "l"
    case extraLarge = "xl"
}

public enum ButtonStyle: String, CaseIterable {
    case filled = "fill"
    case outlined = "outline"
}

// iOS-specific lifecycle information
public struct ComponentLifecycle {
    public let introduced: Version?
    public let deprecated: DeprecationInfo?
    public let removed: Version?

    /// Check if component is available in current iOS version
    public var isAvailable: Bool {
        guard let introduced = introduced else { return true }
        return ProcessInfo.processInfo.operatingSystemVersion >= introduced.operatingSystemVersion
    }

    /// Get deprecation warning for Xcode
    public var deprecationAttribute: String? {
        guard let deprecated = deprecated else { return nil }
        return "@available(iOS, deprecated: \(deprecated.version.ios), message: \"\(deprecated.reason)\")"
    }
}
```

### React SDK (TypeScript Package)

```typescript
// @adobe/spectrum-design-data-react/src/index.ts
import { SpectrumDesignDataWasm } from "./wasm-bindings";
import type { ReactOverrides } from "./overrides";

export class SpectrumDesignData {
  private wasmModule: SpectrumDesignDataWasm;
  private overrides: ReactOverrides;

  constructor(overrides: ReactOverrides = ReactOverrides.default()) {
    this.wasmModule = new SpectrumDesignDataWasm();
    this.overrides = overrides;
  }

  // React-specific API
  public useButtonStyles(props: ButtonProps): ButtonStyles {
    const context = this.getReactContext();

    return {
      padding: this.resolveToken(
        "button-padding",
        props.size,
        props.variant,
        context,
      ),
      backgroundColor: this.resolveToken(
        "button-background-color",
        props.variant,
        props.state,
        context,
      ),
      borderRadius: this.resolveToken(
        "button-border-radius",
        props.size,
        context,
      ),
      fontSize: this.resolveToken("button-font-size", props.size, context),
    };
  }

  public useComponentLifecycle(component: string): ComponentLifecycle {
    const lifecycle = this.wasmModule.getComponentLifecycle(component);
    return new ComponentLifecycle(lifecycle, this.overrides);
  }

  // React Hook for runtime deprecation warnings
  public useDeprecationWarning(component: string, prop?: string): void {
    React.useEffect(() => {
      const lifecycle = this.useComponentLifecycle(component);
      if (lifecycle.isDeprecated) {
        console.warn(
          `${component}${prop ? `.${prop}` : ""} is deprecated since v${lifecycle.deprecated?.version}. ` +
            `${lifecycle.deprecated?.reason}. ` +
            `Use ${lifecycle.deprecated?.replacement} instead. ` +
            `Migration guide: ${lifecycle.deprecated?.migrationGuide}`,
        );
      }
    }, [component, prop]);
  }

  private getReactContext(): VariationContext {
    return {
      colorTheme: window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light",
      density: this.overrides.density,
      contrast: window.matchMedia("(prefers-contrast: high)").matches
        ? "high"
        : "standard",
      motionPreference: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
        ? "reduced"
        : "full",
      platformScale: "desktop", // React is typically desktop
    };
  }
}

// React-specific types
export interface ButtonProps {
  size?: "small" | "medium" | "large" | "extra-large";
  variant?: "accent" | "negative" | "primary" | "secondary";
  style?: "fill" | "outline";
  state?: "default" | "hover" | "focus" | "pressed";
}

export interface ButtonStyles {
  padding: string;
  backgroundColor: string;
  borderRadius: string;
  fontSize: string;
}

// React Hook for easy integration
export function useSpectrumToken(
  tokenId: string,
  ...variants: string[]
): string {
  const spectrum = React.useContext(SpectrumContext);
  const context = spectrum.getReactContext();
  return spectrum.resolveToken(tokenId, ...variants, context);
}
```

### Android SDK (Kotlin Package)

```kotlin
// com.adobe.spectrum.designdata/SpectrumDesignData.kt
package com.adobe.spectrum.designdata

import android.content.Context
import android.content.res.Configuration
import androidx.annotation.ColorInt
import androidx.annotation.Dimension

class SpectrumDesignData(
    private val context: Context,
    private val overrides: AndroidOverrides = AndroidOverrides.default()
) {
    private val rustCore: Long = nativeInit()

    // Android-specific API using native types
    @Dimension(unit = Dimension.DP)
    fun getButtonPadding(
        size: ButtonSize = ButtonSize.MEDIUM,
        style: ButtonStyle = ButtonStyle.FILLED
    ): Float {
        val variationContext = getAndroidContext()
        return nativeResolveToken(
            rustCore,
            "button-padding",
            size.value,
            style.value,
            variationContext
        )
    }

    @ColorInt
    fun getButtonBackgroundColor(
        variant: ButtonVariant = ButtonVariant.ACCENT,
        state: ButtonState = ButtonState.DEFAULT
    ): Int {
        val variationContext = getAndroidContext()
        val colorValue = nativeResolveToken(
            rustCore,
            "button-background-color",
            variant.value,
            state.value,
            variationContext
        )
        return Color.parseColor(colorValue)
    }

    fun getComponentLifecycle(component: String): ComponentLifecycle? {
        val nativeLifecycle = nativeGetLifecycle(rustCore, component) ?: return null
        return ComponentLifecycle(nativeLifecycle, overrides)
    }

    private fun getAndroidContext(): VariationContext {
        val configuration = context.resources.configuration

        return VariationContext(
            colorTheme = when (configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) {
                Configuration.UI_MODE_NIGHT_YES -> "dark"
                else -> "light"
            },
            density = overrides.density,
            contrast = if (isHighContrastEnabled()) "high" else "standard",
            platformScale = when (configuration.screenLayout and Configuration.SCREENLAYOUT_SIZE_MASK) {
                Configuration.SCREENLAYOUT_SIZE_LARGE,
                Configuration.SCREENLAYOUT_SIZE_XLARGE -> "tablet"
                else -> "mobile"
            }
        )
    }

    private fun isHighContrastEnabled(): Boolean {
        return context.getSystemService(Context.ACCESSIBILITY_SERVICE)
            ?.let { it as AccessibilityManager }
            ?.isHighTextContrastEnabled == true
    }

    // JNI bindings
    private external fun nativeInit(): Long
    private external fun nativeResolveToken(handle: Long, tokenId: String, vararg variants: String): String
    private external fun nativeGetLifecycle(handle: Long, component: String): ByteArray?

    companion object {
        init {
            System.loadLibrary("spectrum_design_data_android")
        }
    }
}

// Android-specific enums
enum class ButtonSize(val value: String) {
    SMALL("s"),
    MEDIUM("m"),
    LARGE("l"),
    EXTRA_LARGE("xl")
}

enum class ButtonVariant(val value: String) {
    ACCENT("accent"),
    NEGATIVE("negative"),
    PRIMARY("primary"),
    SECONDARY("secondary")
}

// Android-specific lifecycle with proper deprecation annotations
data class ComponentLifecycle(
    val introduced: Version?,
    val deprecated: DeprecationInfo?,
    val removed: Version?
) {
    val isAvailable: Boolean
        get() = introduced?.let { Build.VERSION.SDK_INT >= it.androidApiLevel } ?: true

    val isDeprecated: Boolean
        get() = deprecated != null

    // Generate Android lint suppression
    val lintSuppressionAnnotation: String?
        get() = deprecated?.let { "@SuppressLint(\"SpectrumDeprecated${it.version.replace(".", "_")}\")" }
}
```

## Platform-Specific Documentation Generation

### iOS Documentation (DocC)

````swift
// Generated iOS documentation
/// # Spectrum Design Data for iOS
///
/// The Spectrum Design Data SDK provides access to design tokens and component specifications
/// optimized for iOS development patterns.
///
/// ## Overview
///
/// This SDK wraps the core Spectrum design system with iOS-specific overrides and provides
/// native Swift APIs that integrate seamlessly with UIKit and SwiftUI.
///
/// ```swift
/// let spectrum = SpectrumDesignData()
/// let buttonPadding = spectrum.buttonPadding(size: .medium, style: .filled)
/// ```
///
/// ## Topics
///
/// ### Components
/// - ``Button``
/// - ``Menu``
/// - ``Dialog``
///
/// ### Tokens
/// - ``ColorTokens``
/// - ``SpacingTokens``
/// - ``TypographyTokens``
///
/// ### Lifecycle Management
/// - ``ComponentLifecycle``
/// - ``DeprecationInfo``

public extension SpectrumDesignData {
    /// Button component tokens and lifecycle information
    ///
    /// Provides access to all button-related design tokens with iOS-specific overrides applied.
    ///
    /// ## Availability
    ///
    /// Available since iOS 13.0. Some button variants require iOS 15.0+.
    ///
    /// ## Deprecation Notices
    ///
    /// - `isQuiet` parameter deprecated in iOS Spectrum 1.8.0, use `style: .outline` instead
    /// - Migration guide: [Button Style Migration](https://ios-spectrum.adobe.com/migration/button-style)
    ///
    /// ## Example
    ///
    /// ```swift
    /// // Get button padding for current context
    /// let padding = spectrum.buttonPadding(size: .large, style: .filled)
    ///
    /// // Apply to UIButton
    /// button.contentEdgeInsets = UIEdgeInsets(
    ///     top: padding, left: padding * 2,
    ///     bottom: padding, right: padding * 2
    /// )
    /// ```
    struct Button {
        /// Get button padding for specified size and style
        /// - Parameters:
        ///   - size: Button size variant
        ///   - style: Button style (fill or outline)
        ///   - traitCollection: Current trait collection (defaults to current)
        /// - Returns: Padding value in points
        static func padding(
            size: ButtonSize,
            style: ButtonStyle,
            traitCollection: UITraitCollection = .current
        ) -> CGFloat

        /// Get button background color
        /// - Parameters:
        ///   - variant: Button color variant (accent, primary, etc.)
        ///   - state: Button interaction state
        ///   - traitCollection: Current trait collection
        /// - Returns: UIColor for current context
        static func backgroundColor(
            variant: ButtonVariant,
            state: ButtonState,
            traitCollection: UITraitCollection = .current
        ) -> UIColor
    }
}
````

### React Documentation (Storybook + TypeDoc)

````typescript
// Generated React documentation
/**
 * # Spectrum Design Data for React
 *
 * The Spectrum Design Data SDK provides React-specific hooks and utilities for accessing
 * design tokens with platform overrides applied.
 *
 * ## Installation
 *
 * ```bash
 * npm install @adobe/spectrum-design-data-react
 * ```
 *
 * ## Basic Usage
 *
 * ```tsx
 * import { SpectrumProvider, useSpectrumToken } from '@adobe/spectrum-design-data-react';
 *
 * function MyButton({ size = 'medium', variant = 'accent' }) {
 *   const padding = useSpectrumToken('button-padding', size);
 *   const backgroundColor = useSpectrumToken('button-background-color', variant);
 *
 *   return (
 *     <button style={{ padding, backgroundColor }}>
 *       Click me
 *     </button>
 *   );
 * }
 * ```
 *
 * ## Lifecycle Management
 *
 * The SDK automatically provides deprecation warnings in development:
 *
 * ```tsx
 * // This will show a console warning in development
 * <Button isQuiet={true} /> // ⚠️ isQuiet deprecated, use style="outline"
 * ```
 *
 * @packageDocumentation
 */

/**
 * Hook for accessing Spectrum design tokens with React-specific context
 *
 * @example
 * ```tsx
 * function CustomButton({ size, variant }) {
 *   const padding = useSpectrumToken('button-padding', size);
 *   const color = useSpectrumToken('button-text-color', variant);
 *
 *   return <button style={{ padding, color }}>Button</button>;
 * }
 * ```
 *
 * @param tokenId - The design token identifier
 * @param variants - Token variant values (size, state, etc.)
 * @returns Resolved token value for current React context
 *
 * @since React Spectrum 3.15.0
 * @deprecated Use `useSpectrumStyles` for better performance with multiple tokens
 */
export function useSpectrumToken(
  tokenId: string,
  ...variants: string[]
): string;

/**
 * Hook for accessing multiple related tokens efficiently
 *
 * @example
 * ```tsx
 * function Button({ size, variant, children }) {
 *   const styles = useSpectrumStyles('button', { size, variant });
 *
 *   return (
 *     <button
 *       style={{
 *         padding: styles.padding,
 *         backgroundColor: styles.backgroundColor,
 *         fontSize: styles.fontSize,
 *         borderRadius: styles.borderRadius,
 *       }}
 *     >
 *       {children}
 *     </button>
 *   );
 * }
 * ```
 *
 * @param component - Component name
 * @param variants - Object with variant values
 * @returns Object with all component-related token values
 *
 * @since React Spectrum 4.0.0
 */
export function useSpectrumStyles(
  component: string,
  variants: Record<string, string>,
): Record<string, string>;
````

### Android Documentation (KDoc)

````kotlin
/**
 * # Spectrum Design Data for Android
 *
 * The Spectrum Design Data SDK provides Android-specific APIs for accessing design tokens
 * with proper Material Design integration and accessibility support.
 *
 * ## Setup
 *
 * ```kotlin
 * // In your Application class
 * class MyApplication : Application() {
 *     override fun onCreate() {
 *         super.onCreate()
 *         SpectrumDesignData.initialize(this)
 *     }
 * }
 * ```
 *
 * ## Usage
 *
 * ```kotlin
 * class MainActivity : AppCompatActivity() {
 *     private val spectrum = SpectrumDesignData(this)
 *
 *     override fun onCreate(savedInstanceState: Bundle?) {
 *         super.onCreate(savedInstanceState)
 *
 *         val button = Button(this).apply {
 *             setPadding(spectrum.getButtonPadding(ButtonSize.LARGE).toInt())
 *             setBackgroundColor(spectrum.getButtonBackgroundColor(ButtonVariant.ACCENT))
 *         }
 *     }
 * }
 * ```
 *
 * @since Android Spectrum 1.0.0
 */
class SpectrumDesignData(private val context: Context) {

    /**
     * Get button padding for specified configuration
     *
     * Automatically adapts to:
     * - Current theme (light/dark)
     * - Screen density
     * - Accessibility settings (high contrast, large text)
     * - Platform overrides for Android
     *
     * @param size Button size variant
     * @param style Button style variant
     * @return Padding value in density-independent pixels (dp)
     *
     * @sample
     * ```kotlin
     * val padding = spectrum.getButtonPadding(ButtonSize.MEDIUM, ButtonStyle.FILLED)
     * button.setPadding(padding.toInt())
     * ```
     *
     * @since Android Spectrum 1.0.0
     */
    @Dimension(unit = Dimension.DP)
    fun getButtonPadding(
        size: ButtonSize = ButtonSize.MEDIUM,
        style: ButtonStyle = ButtonStyle.FILLED
    ): Float

    /**
     * Get component lifecycle information for deprecation management
     *
     * Use this to check if components or properties are deprecated and get
     * migration guidance.
     *
     * @param component Component name (e.g., "Button", "Menu")
     * @return Lifecycle information or null if component not found
     *
     * @sample
     * ```kotlin
     * val lifecycle = spectrum.getComponentLifecycle("Button")
     * if (lifecycle?.isDeprecated == true) {
     *     Log.w("Spectrum", "Button deprecated: ${lifecycle.deprecated?.reason}")
     * }
     * ```
     *
     * @since Android Spectrum 1.2.0
     */
    fun getComponentLifecycle(component: String): ComponentLifecycle?
}
````

## Figma Asset Generation

### Platform-Specific Figma Libraries

```rust
// Figma asset generation system
pub struct FigmaAssetGenerator {
    pub design_data: SpectrumDesignData,
    pub platform_overrides: PlatformOverrides,
    pub figma_client: FigmaClient,
}

impl FigmaAssetGenerator {
    pub fn generate_platform_library(&self, platform: Platform) -> FigmaLibrary {
        let mut library = FigmaLibrary::new(&format!("Spectrum {} Library", platform.display_name()));

        // Generate platform-specific color variables
        library.add_page(self.generate_color_variables(platform));

        // Generate platform-specific spacing variables
        library.add_page(self.generate_spacing_variables(platform));

        // Generate platform-specific components
        library.add_page(self.generate_component_library(platform));

        // Generate platform-specific documentation
        library.add_page(self.generate_documentation_page(platform));

        library
    }

    fn generate_color_variables(&self, platform: Platform) -> FigmaPage {
        let mut page = FigmaPage::new("Color Variables");

        // Get all color tokens for this platform
        let color_tokens = self.design_data.get_tokens_by_type(TokenType::Color);

        for token in color_tokens {
            // Resolve token value with platform overrides
            let resolved_values = self.resolve_token_variations(&token, platform);

            // Create Figma variable with platform-specific naming
            let variable = FigmaVariable {
                name: self.generate_platform_variable_name(&token, platform),
                description: self.generate_platform_description(&token, platform),
                values: resolved_values.into_iter().map(|(context, value)| {
                    FigmaVariableValue {
                        mode: self.context_to_figma_mode(&context, platform),
                        value: self.color_to_figma_value(&value),
                    }
                }).collect(),
                scopes: self.get_platform_scopes(&token, platform),
            };

            page.add_variable(variable);
        }

        page
    }

    fn generate_platform_variable_name(&self, token: &ContextualToken, platform: Platform) -> String {
        match platform {
            Platform::iOS => {
                // iOS naming: spectrumButtonBackgroundColorAccent
                format!("spectrum{}{}",
                    token.context.component.to_pascal_case(),
                    token.context.property.semantic_meaning.to_pascal_case()
                )
            },
            Platform::React => {
                // React naming: spectrum-button-background-color-accent
                format!("spectrum-{}-{}",
                    token.context.component.to_kebab_case(),
                    token.context.property.semantic_meaning.to_kebab_case()
                )
            },
            Platform::Android => {
                // Android naming: spectrum_button_background_color_accent
                format!("spectrum_{}_{}",
                    token.context.component.to_snake_case(),
                    token.context.property.semantic_meaning.to_snake_case()
                )
            },
            Platform::CSS => {
                // CSS naming: --spectrum-button-background-color-accent
                format!("--spectrum-{}-{}",
                    token.context.component.to_kebab_case(),
                    token.context.property.semantic_meaning.to_kebab_case()
                )
            },
        }
    }

    fn generate_platform_description(&self, token: &ContextualToken, platform: Platform) -> String {
        let mut description = format!(
            "{} {} for {} component",
            token.context.property.semantic_meaning,
            token.context.property.property_type.display_name(),
            token.context.component.name
        );

        // Add platform-specific usage information
        if let Some(platform_mapping) = token.context.property.platform_mappings.get(&platform) {
            description.push_str(&format!("\n\nPlatform usage: {}", platform_mapping));
        }

        // Add lifecycle information
        if let Some(deprecated) = &token.lifecycle.deprecated {
            description.push_str(&format!(
                "\n\n⚠️ Deprecated since {}: {}",
                deprecated.version,
                deprecated.reason
            ));

            if let Some(replacement) = &deprecated.replacement {
                description.push_str(&format!("\nUse {} instead.", replacement));
            }
        }

        // Add platform-specific override information
        if let Some(override_info) = self.platform_overrides.get_override_info(&token.uuid, platform) {
            description.push_str(&format!(
                "\n\nPlatform override: {}",
                override_info.reason
            ));
        }

        description
    }

    fn generate_component_library(&self, platform: Platform) -> FigmaPage {
        let mut page = FigmaPage::new("Components");

        for component in self.design_data.components.values() {
            // Generate platform-specific component variants
            let component_variants = self.generate_component_variants(component, platform);

            // Create Figma component set
            let component_set = FigmaComponentSet {
                name: format!("{} / {}", platform.display_name(), component.name),
                description: self.generate_component_description(component, platform),
                variants: component_variants,
                documentation: self.generate_component_documentation(component, platform),
            };

            page.add_component_set(component_set);
        }

        page
    }

    fn generate_component_variants(&self, component: &Component, platform: Platform) -> Vec<FigmaComponent> {
        let mut variants = Vec::new();

        // Get all possible variant combinations from component schema
        let variant_combinations = component.get_variant_combinations();

        for combination in variant_combinations {
            // Check if this variant is supported on this platform
            if self.is_variant_supported(&combination, platform) {
                let figma_component = self.create_figma_component(component, &combination, platform);
                variants.push(figma_component);
            }
        }

        variants
    }

    fn create_figma_component(&self, component: &Component, variants: &VariantCombination, platform: Platform) -> FigmaComponent {
        let mut figma_component = FigmaComponent::new(&format!(
            "{} {} {}",
            component.name,
            variants.to_string(),
            platform.display_name()
        ));

        // Apply platform-specific styling
        match platform {
            Platform::iOS => {
                figma_component.add_layer(self.create_ios_component_layers(component, variants));
            },
            Platform::Android => {
                figma_component.add_layer(self.create_android_component_layers(component, variants));
            },
            Platform::React => {
                figma_component.add_layer(self.create_web_component_layers(component, variants));
            },
            Platform::CSS => {
                figma_component.add_layer(self.create_css_component_layers(component, variants));
            },
        }

        // Add platform-specific annotations
        figma_component.add_annotation(FigmaAnnotation {
            text: self.generate_platform_usage_code(component, variants, platform),
            position: AnnotationPosition::Bottom,
        });

        figma_component
    }

    fn generate_platform_usage_code(&self, component: &Component, variants: &VariantCombination, platform: Platform) -> String {
        match platform {
            Platform::iOS => {
                format!(r#"
// iOS Usage
let button = SpectrumButton()
button.size = .{}
button.variant = .{}
button.style = .{}
"#,
                    variants.size.to_lowercase(),
                    variants.variant.to_lowercase(),
                    variants.style.to_lowercase()
                )
            },
            Platform::React => {
                format!(r#"
// React Usage
<Button
  size="{}"
  variant="{}"
  style="{}"
>
  Button Text
</Button>
"#,
                    variants.size.to_lowercase(),
                    variants.variant.to_lowercase(),
                    variants.style.to_lowercase()
                )
            },
            Platform::Android => {
                format!(r#"
// Android Usage
<com.adobe.spectrum.Button
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    app:spectrum_size="{}"
    app:spectrum_variant="{}"
    app:spectrum_style="{}"
    android:text="Button Text" />
"#,
                    variants.size.to_lowercase(),
                    variants.variant.to_lowercase(),
                    variants.style.to_lowercase()
                )
            },
            Platform::CSS => {
                format!(r#"
/* CSS Usage */
<button class="spectrum-Button spectrum-Button--size{} spectrum-Button--{} spectrum-Button--{}">
  Button Text
</button>
"#,
                    variants.size.to_pascal_case(),
                    variants.variant.to_kebab_case(),
                    variants.style.to_kebab_case()
                )
            },
        }
    }
}
```

### Figma Library Structure

```
Spectrum iOS Library
├── 📄 Color Variables
│   ├── 🎨 spectrum.button.background.color.accent
│   ├── 🎨 spectrum.button.background.color.primary
│   └── 🎨 spectrum.button.text.color.accent
├── 📄 Spacing Variables
│   ├── 📏 spectrum.button.padding.small
│   ├── 📏 spectrum.button.padding.medium
│   └── 📏 spectrum.button.padding.large
├── 📄 Components
│   ├── 🧩 Button / iOS
│   │   ├── Size=Small, Variant=Accent, Style=Fill
│   │   ├── Size=Medium, Variant=Accent, Style=Fill
│   │   └── Size=Large, Variant=Primary, Style=Outline
│   └── 🧩 Menu / iOS
└── 📄 Documentation
    ├── 📖 iOS Integration Guide
    ├── 📖 Lifecycle Information
    └── 📖 Migration Guides

Spectrum React Library
├── 📄 Color Variables
│   ├── 🎨 spectrum-button-background-color-accent
│   └── 🎨 spectrum-button-text-color-accent
├── 📄 Components
│   ├── 🧩 Button / React
│   └── 🧩 Menu / React
└── 📄 Documentation
```

## SDK Build & Distribution

### Multi-Platform Build Pipeline

```yaml
# .github/workflows/build-platform-sdks.yml
name: Build Platform SDKs

on:
  push:
    tags: ["v*"]
  workflow_dispatch:

jobs:
  build-rust-core:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          targets: |
            x86_64-apple-darwin
            aarch64-apple-darwin
            x86_64-pc-windows-msvc
            x86_64-unknown-linux-gnu
            wasm32-unknown-unknown
            aarch64-linux-android
            armv7-linux-androideabi

      - name: Build iOS Static Library
        run: |
          cargo build --release --target x86_64-apple-darwin --features ios
          cargo build --release --target aarch64-apple-darwin --features ios

      - name: Build Android JNI Library
        run: |
          cargo build --release --target aarch64-linux-android --features android
          cargo build --release --target armv7-linux-androideabi --features android

      - name: Build WASM Module
        run: |
          cargo build --release --target wasm32-unknown-unknown --features web
          wasm-pack build --target web --features web

      - name: Upload Build Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: rust-binaries
          path: target/

  build-ios-sdk:
    needs: build-rust-core
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Download Rust Binaries
        uses: actions/download-artifact@v3
        with:
          name: rust-binaries
          path: target/

      - name: Setup iOS SDK Structure
        run: |
          mkdir -p ios-sdk/Sources/SpectrumDesignData
          mkdir -p ios-sdk/Resources

      - name: Generate Swift Bindings
        run: |
          swift-bridge-cli generate-bindings \
            --rust-crate spectrum-design-data \
            --output ios-sdk/Sources/SpectrumDesignData/

      - name: Load iOS Overrides
        run: |
          cp ios-spectrum/overrides/*.yml ios-sdk/Resources/

      - name: Generate iOS Documentation
        run: |
          spectrum-docs-generator \
            --platform ios \
            --format docc \
            --output ios-sdk/Documentation/

      - name: Generate Figma iOS Library
        run: |
          spectrum-figma-generator \
            --platform ios \
            --overrides ios-sdk/Resources/ \
            --output ios-figma-library.fig

      - name: Build Swift Package
        run: |
          cd ios-sdk
          swift build
          swift test

      - name: Create iOS SDK Release
        run: |
          tar -czf spectrum-design-data-ios-${{ github.ref_name }}.tar.gz ios-sdk/

  build-react-sdk:
    needs: build-rust-core
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Download WASM Module
        uses: actions/download-artifact@v3
        with:
          name: rust-binaries
          path: target/

      - name: Setup React SDK Structure
        run: |
          mkdir -p react-sdk/src
          mkdir -p react-sdk/docs

      - name: Generate TypeScript Bindings
        run: |
          wasm-bindgen target/wasm32-unknown-unknown/release/spectrum_design_data.wasm \
            --out-dir react-sdk/src/wasm-bindings \
            --typescript

      - name: Load React Overrides
        run: |
          cp react-spectrum/overrides/*.yml react-sdk/src/overrides/

      - name: Generate React Documentation
        run: |
          spectrum-docs-generator \
            --platform react \
            --format storybook \
            --output react-sdk/docs/

      - name: Generate Figma React Library
        run: |
          spectrum-figma-generator \
            --platform react \
            --overrides react-sdk/src/overrides/ \
            --output react-figma-library.fig

      - name: Build NPM Package
        run: |
          cd react-sdk
          npm install
          npm run build
          npm test

      - name: Publish to NPM
        run: |
          cd react-sdk
          npm publish --access public
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

  build-android-sdk:
    needs: build-rust-core
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Android SDK
        uses: android-actions/setup-android@v2

      - name: Download Android JNI Libraries
        uses: actions/download-artifact@v3
        with:
          name: rust-binaries
          path: target/

      - name: Setup Android SDK Structure
        run: |
          mkdir -p android-sdk/src/main/kotlin/com/adobe/spectrum/designdata
          mkdir -p android-sdk/src/main/jniLibs/arm64-v8a
          mkdir -p android-sdk/src/main/jniLibs/armeabi-v7a

      - name: Copy JNI Libraries
        run: |
          cp target/aarch64-linux-android/release/libspectrum_design_data_android.so \
             android-sdk/src/main/jniLibs/arm64-v8a/
          cp target/armv7-linux-androideabi/release/libspectrum_design_data_android.so \
             android-sdk/src/main/jniLibs/armeabi-v7a/

      - name: Generate Kotlin Bindings
        run: |
          spectrum-kotlin-bindgen \
            --rust-crate spectrum-design-data \
            --output android-sdk/src/main/kotlin/

      - name: Load Android Overrides
        run: |
          cp android-spectrum/overrides/*.yml android-sdk/src/main/assets/

      - name: Generate Android Documentation
        run: |
          spectrum-docs-generator \
            --platform android \
            --format kdoc \
            --output android-sdk/docs/

      - name: Generate Figma Android Library
        run: |
          spectrum-figma-generator \
            --platform android \
            --overrides android-sdk/src/main/assets/ \
            --output android-figma-library.fig

      - name: Build AAR Package
        run: |
          cd android-sdk
          ./gradlew assembleRelease

      - name: Publish to Maven Central
        run: |
          cd android-sdk
          ./gradlew publishToMavenCentral
        env:
          MAVEN_USERNAME: ${{ secrets.MAVEN_USERNAME }}
          MAVEN_PASSWORD: ${{ secrets.MAVEN_PASSWORD }}
```

## Benefits

### For Platform Teams

- ✅ **Native APIs**: Platform-specific SDKs that feel natural to each ecosystem
- ✅ **Native Documentation**: DocC for iOS, Storybook for React, KDoc for Android
- ✅ **Platform Overrides**: Automatic integration of platform-specific customizations
- ✅ **Figma Integration**: Platform-specific Figma libraries with proper naming conventions

### For Designers

- ✅ **Platform-Aware Design**: Figma libraries show platform-specific implementations
- ✅ **Accurate Specifications**: Variables and components reflect actual platform behavior
- ✅ **Usage Examples**: Platform-specific code examples in Figma annotations
- ✅ **Lifecycle Visibility**: Deprecation and migration information in design tools

### For Developers

- ✅ **Zero Configuration**: SDKs work out of the box with platform conventions
- ✅ **Type Safety**: Full type safety with platform-native type systems
- ✅ **Performance**: Native compilation for optimal runtime performance
- ✅ **Integration**: Seamless integration with platform build systems and IDEs

This SDK architecture provides a comprehensive foundation for delivering platform-native experiences while maintaining the unified design system core.
