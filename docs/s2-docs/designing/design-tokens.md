---
title: Design tokens
category: designing
source_url: https://preview.spectrum.adobe.com/foundations/design-data/design-tokens
last_updated: '2026-08-14'
status: published
tags:
  - design tokens
  - token taxonomy
  - aliasing
  - semantic design
  - color
  - spacing
  - typography
hub_path: /foundations/design-data/design-tokens
---

# Design tokens

### What are design tokens?

Design tokens — or tokens — are a methodology for expressing reusable design decisions as structured data. Tokens can represent many kinds of design decisions, including color, spacing, typography, motion, sizing, and more. At its simplest, a token connects a design use case to a value, allowing that decision to be reused consistently across tools, teams, products, and platforms. For example, accent-content-color-default expresses the decision: “Use this value when text content should be accentuated”.

### Image: Design token swatch labeled "accent-content-color-default" showing a solid blue circle next to the hex value #3B63FB, displayed in a light gray pill-shaped container on a white background (source: https://preview.spectrum.adobe.com/foundations/design-data/media_1bb9ef4926947e9f2fde76434a4df3a0e4b42e3f6.png?width=750&format=png&optimize=medium)

## Why design tokens?

Design tokens enable alignment, automation, learnability, and multi-platform fidelity, resulting in high-quality experiences and efficient system management. By defining design decisions once and reusing them consistently, tokens create a shared foundation that helps maintain a common design language across teams, tools, products, and platforms. This allows experiences to adapt to different implementation needs while preserving the intent of the design language.

## Principles of Spectrum tokens

Spectrum design tokens follow three core principles. Image: Stylized 3D icon of an eye with a peach-orange gradient, featuring a simplified almond-shaped outline and a comma-shaped iris, on a soft white background. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_1d90512cff87b0d35848a6d000c3818847ecab8d1.png?width=750&format=png&optimize=medium)Image: Stylized 3D icon of a curved S-shaped ribbon with rounded, flared ends, in a pink-to-purple gradient, on a soft white background. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_1da00d7c95e5c782f9d78f540e516f09ea7efa84a.png?width=750&format=png&optimize=medium)Image: Stylized 3D icon of a graduation cap with a blue gradient, rendered with soft rounded edges and a tassel hanging from one corner, on a soft white background. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_17c589c9017bb067f3860ba2a42c6afe8ca7d3390.png?width=750&format=png&optimize=medium)

### Clear

Design tokens are created within a well-defined scope, purpose, and meaning so they remain understandable and accurately represent the design language.

### Systematic

Design tokens are defined and managed through a structured system that spans design and development resources.

### Learnable

Design tokens are supported through documentation, guidance, and educational resources that help people identify, understand, and use them effectively.

## Spectrum's design token system

Spectrum uses tokens as a shared foundation for expressing and reusing design decisions throughout the design system. Rather than representing every possible design scenario, the token system focuses on reusable decisions that support many structures, components, products, and experiences Spectrum also prioritizes semantic design decisions over direct values whenever possible. By expressing intent rather than implementation details, tokens become easier to understand, easier to reuse, and more resilient to change over time. Design tokens work together with component libraries, implementation frameworks, documentation, and other Spectrum resources to help maintain a cohesive design language across products and platforms. While tokens capture many design decisions, they are only one part of the broader system used to design, document, and implement Spectrum experiences. Image: Nested concentric semicircle diagram illustrating a design system hierarchy, with "Products" as the outermost layer, "Platform components" in the middle, and "Tokens" at the innermost core, rendered in purple gradient tones. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_1c3063afa864ec179a458d95d51558937b4bc43ed.png?width=750&format=png&optimize=medium)

## Token terminology

Understanding a few foundational concepts makes design tokens easier to read, discuss, and use.

### Token

A reusable design decision represented as structured data. A token consists of a name and a value. Together, these define both the purpose of a design decision and the data used to implement it.

### Image: Code snippet showing a JSON token definition for "accent-content-color-default," including its schema reference, a value pointing to "{accent-color-900}," and a UUID. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_180c6be1720908c84590aced0e4ea46ec42d8c386.png?width=750&format=png&optimize=medium)

### Token name

The structured classification of a design use case. Token names are created using Spectrum's token taxonomy, which defines the categories, terminology, and ordering used to describe design decisions. This helps ensure that names remain predictable, scalable, and understandable across teams, tools, products, and platforms. Token names form a shared language that helps people and systems understand and apply design decisions consistently across tools, products, and platforms.

### Image: Three example design tokens labeled "Token name," each pointing to a specific token: a blue color swatch named "blue-900" with value rgb(59, 99, 251); a ruler icon for "base-padding-vertical-large" with value 10px; and a font icon for "sans-serif-font-family" with value "Adobe Clean Spectrum VF." (source: https://preview.spectrum.adobe.com/foundations/design-data/media_16849d171f58f0ed54185afd8a10028da399cd46c.png?width=750&format=png&optimize=medium)

### Value

The data associated with a token. A value may be a final implementation value such as a color, dimension, percentage, or duration. A value can be dependent on context, such as light or dark color themes. It may also be a reference to another token through aliasing.

### Image: Three tokens—"blue-900" (rgb(59, 99, 251)), "base-padding-vertical-large" (10px), and "sans-serif-font-family" (Adobe Clean Spectrum VF)—each with their resolved output highlighted and labeled "Value." (source: https://preview.spectrum.adobe.com/foundations/design-data/media_18b43d82026c0f02530b5ce62978951a800a60d4c.png?width=750&format=png&optimize=medium)

Token nameValue blue-900 rgb(59, 99, 251) spacing-100 8px container-padding-medium spacing-300

### Alias

A token that references another token instead of a final value. Aliasing allows broad design decisions to be refined into more specific contexts and use cases while preserving consistency and reducing duplication. Each layer adds additional context without redefining the underlying value.

### Image: Diagram showing a token aliasing chain: the base color token "blue-900" ( #3B63FB) flows down through an alias called "accent-color-900," which in turn flows into a further alias called "accent-content-color-default." (source: https://preview.spectrum.adobe.com/foundations/design-data/media_11cea602f9ef5940fc07648edb357982ec8e90c5f.png?width=750&format=png&optimize=medium)

Token nameValue (alias) accent-content-color-default accent-color-900

## Token tiers

Spectrum uses multiple token tiers to represent design decisions at different levels of abstraction. Each tier serves a different purpose, and together they create a flexible system that supports both reuse and adaptation.

### Primitive (aka Global) tokens

Primitive tokens define the available values in the design language. They represent raw design values and generally communicate little or no information about how those values should be used. Examples: blue-800 gray-100 corner-radius-75 Primitive tokens provide the foundation for higher-level design decisions. Because they communicate values with no intent, they are typically used indirectly through semantic tokens as an alias.

### Image: Two token scales side by side: a vertical blue color ramp from light to dark labeled "blue-900" at its mid-dark point, and a vertical spacing scale of gray squares increasing in size labeled "spacing-400" at a mid-sized square. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_179482299e81daea4dfee0b8609e53447561d4bbb.png?width=750&format=png&optimize=medium)

### Semantic tokens

Semantic tokens define how design decisions are used throughout the system. Rather than describing values directly, they communicate purpose, intent, structure, or application. Examples: accent-background-color-default negative-content-color-default container-padding-medium group-gap-small Semantic tokens help people understand: Why a decision exists Where it should be used How it relates to other design decisions Semantic tokens are the primary way consumers interact with Spectrum design tokens.

### Image: Diagram showing the token "accent-content-color-default" branching out to five UI examples that use it: a radio button label, a checkbox label, a toggle switch label, a hyperlink, and a menu item checkmark—all rendered in the same blue. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_1dc05f4cd2a0071e6256b9da67fd14f92340485e7.png?width=750&format=png&optimize=medium)

### Component-specific tokens

Component-specific tokens represent design decisions that apply to a specific component or implementation. Examples: tooltip-maximum-width divider-thickness-small Spectrum prioritizes reusable semantic decisions whenever possible, which reduces the need for component-specific tokens. However, some implementation-specific needs may still require decisions that are scoped to a particular component. For this reason, component-specific tokens may exist within Spectrum or individual platform implementations, but they play a much smaller role than reusable semantic tokens.

### Image: Diagram showing the token "tab-gap-horizontal-medium" pointing to the pink-highlighted gap between two radio button labels in a UI example. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_1de0d50e78fdc61dfc5ba6ac5e78ab4db2ea9bbdf.png?width=750&format=png&optimize=medium)

## Building interfaces with tokens

Design decisions are most valuable when they can be reused. Rather than organizing decisions around individual components, Spectrum organizes many design decisions around semantic meaning and reusable structures. Together, these concepts help create a shared language that is easier to understand, reuse, and scale across products and platforms. Image: Diagram connecting the token "positive-background-color-default" (green) to a green toast notification example reading "Toast message describing what happened," which in turn branches out to four reusable spacing tokens: banner-padding-vertical, banner-padding-horizontal, banner-padding-horizontal-compact, and banner-gap-horizontal. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_12317944fcdcd3d94db4c7d4e9d74465e032ba123.png?width=750&format=png&optimize=medium)

### Meaning

Every design decision serves a purpose. Some decisions communicate meaning, helping users understand status, emphasis, importance, or feedback. Examples include: accent-background-color-default negative-border-color-default negative-content-color-default positive-background-color-default These decisions describe what a design choice is intended to communicate.

### Image: Diagram grouping UI examples by feedback type: "Positive" links to a green "Approved" tag and a password field with a matching-passwords confirmation; "Negative" links to a red "Rejected" tag and a password field showing a "Passwords do not match" error with a red tooltip; "Informative" links to a blue "Active" tag and a blue tooltip. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_1492d46785f384e217b76912d774fa3f5b96d6b28.png?width=750&format=png&optimize=medium)

Meaning helps people understand not only how an interface looks, but what it is trying to convey. By expressing meaning directly in token names, decisions become easier to understand, reuse, and apply consistently across products and platforms.

### Reusable structures

While some design decisions communicate meaning, others help define how components are organized and constructed. Examples include: container-padding-medium group-gap-small base-padding-vertical-large banner-gap-horizontal These decisions describe how interfaces are built.

### Image: Diagram grouping UI components by structure type: "Base" links to individual elements like an "Approved" tag, a value field, a delete button, a list item, and a stepper; "Group" links to sets of related elements like paired radio buttons, toggles, and stacked checkboxes. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_129333dbe5f3c9919f4aa947c23a26c2453169a48.png?width=750&format=png&optimize=medium)

To improve reuse and consistency, Spectrum organizes many of these decisions around recurring interface structures. These reusable structures are abstract concepts that describe common UI patterns. They are not specific components or implementation types. Instead, they provide a shared framework for organizing design decisions that can be reused across many different components, products, and technologies. Because these structures represent patterns rather than implementations, they help create design decisions that are more reusable, predictable, and easier to understand. Some structures may closely resemble familiar interface concepts, but they remain independent of any specific platform or implementation. These structures help answer “Where does this design decision apply?” Common structures include: Structure Description BaseThe primary functional element within a structureAccessoryA supporting element associated with another structureGroupA collection of related elementsListA sequence of repeated itemsContainerA structure that organizes contentBannerA structure used for prominent messagingThese structures help answer “Where does this design decision apply?”

## Components as compositions

Components are often composed from one or more reusable structures. Rather than creating unique design decisions for every component, Spectrum reuses decisions across common patterns that appear throughout the system. This approach allows many components to share the same underlying design language while adapting to different contexts and use cases. Platform implementations combine these reusable structures with platform-specific requirements, interaction patterns, accessibility considerations, and implementation constraints to create complete component experiences. By reusing tokens, structures, and components, teams can build cohesive experiences without redefining the same decisions in every implementation. As a result, decisions become more reusable, components become more modular, and the system becomes easier to learn, maintain, and evolve. Image: Diagram showing how reusable structures combine into compositions and then components: a "Base" structure and a "List item" structure each flow into composition examples with labels, descriptions, and toggles, which then combine into a finished "Menu item" component with a value and toggle. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_19eceefe7f3c359ba6f591936e3bf009582d70ea1.png?width=750&format=png&optimize=medium)

## Reading token names

Token names are designed to communicate the purpose of a design decision. Reading a token name from left to right reveals progressively more specific context about how that decision should be used. Names communicate information from broad concepts toward more specific details. Image: Diagram breaking down the token name "positive-color-600," with callouts showing that "positive" indicates what's communicated and "600" indicates which color option is used, next to a green color swatch. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_1d58375a6ae7a9f1fc730f649f485123c2614161a.png?width=750&format=png&optimize=medium)

### Positive color 600

The name identifies: what’s being communicated (positive) which option is used (600) Together they represent a specific color decision. Image: Diagram breaking down the token name "accent-background-color-hover," with callouts showing that "accent" indicates what's communicated, "background-color" indicates what it affects, and "hover" indicates when it applies, next to a blue color swatch. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_138f950047d55d3e1a89f6f1cbd0b22558cab1ca2.png?width=750&format=png&optimize=medium)

### Accent background color hover

The name identifies: what’s being communicated (accent) what it affects (background-color) when it applies (hover) Together they describe the background color used when an accentuated interface element is hovered. Image: Diagram breaking down the token name "base-padding-vertical-small," with callouts showing that "base" indicates where it applies, "padding-vertical" indicates what it affects, and "small" indicates which option is used. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_1a19e41620a76ada5ceae2dbb74a4778609a34e35.png?width=750&format=png&optimize=medium)

### Base padding vertical small

The name identifies: where it’s applied (base) what it affects (padding) how it’s applied (vertical) which option is used (small) Together they describe a specific spacing decision used by base structures (Action button, Text field, List item contents, etc).

## Using tokens

Design tokens are intended to make design decisions easier to find, understand, and apply consistently. The following guidelines can help you choose appropriate tokens, avoid common mistakes, and build experiences that remain aligned with the broader Spectrum design language.

### Start with Spectrum components

Whenever possible, use your platform's Spectrum components before working directly with design tokens. Components bring together design decisions, behavior, accessibility, and implementation guidance into reusable solutions that are already aligned with the Spectrum design language. Design tokens provide the foundation that supports those solutions. When existing components don't meet your needs, tokens can help you extend, compose, or create experiences that remain consistent with Spectrum. Image: Diagram tracing the token "Spectrum Button" to a purple-to-blue gradient "Upgrade" button with a crown icon, and further down to a plain rounded rectangle in the same gradient with no label. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_1fe9a6362a1479a1f5959aced7df1ca13884e86b1.png?width=750&format=png&optimize=medium)

### Prioritize semantic tokens

Start with semantic tokens whenever possible. They communicate intent and context, making design decisions easier to understand, reuse, and maintain over time. Image: Diagram connecting the token "background-layer-2-color" to the light gray toolbar background of a Photoshop-style document window, showing a hamburger menu, the Photoshop app icon, "Document" text, and a cloud icon. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_1b62af86b141ebe7a61e41687f36c25c542915749.png?width=750&format=png&optimize=medium)Image: Diagram connecting the token "gray-25" to the light gray toolbar background of a Photoshop-style document window, showing a hamburger menu, the Photoshop app icon, "Document" text, and a cloud icon. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_1c851b0861fdf571ce6a19a98cbca1ef0be7c5f48.png?width=750&format=png&optimize=medium)

### Use primitive tokens only when necessary

Primitive tokens define important building blocks of the design language but contain less contextual meaning. Use them only when no appropriate semantic decision exists. Image: Diagram connecting the token "static-fuchsia-900," shown as a purple circle swatch, to a purple-to-blue gradient "Upgrade" button with a crown icon. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_1ddaad670f23bdc8178d3642bf345d2c4bb13737a.png?width=750&format=png&optimize=medium)

### Use component-specific tokens only for their intended component

Component-specific tokens are intentionally limited. Use them only for their intended component or implementation and avoid reusing them as general-purpose design decisions. Image: Diagram showing the token "tab-gap-horizontal-medium" pointing to the pink-highlighted gap between two radio button labels in a UI example. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_1de0d50e78fdc61dfc5ba6ac5e78ab4db2ea9bbdf.png?width=750&format=png&optimize=medium)Image: Diagram showing the token "tab-gap-horizontal-medium" pointing to the pink-highlighted gap between two colorful gradient card components, each with a card title and description. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_111549edcd66a118c25888112eb46457758a1d42d.png?width=750&format=png&optimize=medium)

## Platform adaptability

Spectrum supports many products and platforms, each with different requirements. As the token system evolves, Spectrum is establishing a shared foundation of reusable design decisions that can support platform-specific adaptation while maintaining a common design language.

### Foundational tokens

Foundational tokens are shared design decisions that form the common language of Spectrum. They serve as the source of truth across products, platforms, and implementations.

### Platform tokens

Platform tokens support the unique requirements of a specific platform implementation. They allow platforms to adapt shared design decisions to their own needs while remaining connected to the broader Spectrum design language.

### Shared language, flexible implementation

Not every platform needs every foundational token, and token values may differ between platforms to support differences in sizing, density, theming, or platform capabilities. Even when implementations differ, they remain rooted in the same taxonomy, terminology, and design language. Image: Diagram illustrating a design system's flexible structure: a purple diamond labeled "Spectrum Foundations" and a green pentagon labeled "Platform" combine under "Flexible implementation," where the shapes overlap with dashed red gaps highlighted, resulting in "Spectrum Platform" — a purple pentagon that fully fills the green pentagon's shape. (source: https://preview.spectrum.adobe.com/foundations/design-data/media_1098f8070212b263e4d2aaeae48257cb8a3c74623.png?width=750&format=png&optimize=medium)Design data can be re-shaped to fit platform needs while maintaining system cohesion.

## Resources

Spectrum design data Spectrum iOS tokens Spectrum Android tokens

## Resources

Spectrum design data
