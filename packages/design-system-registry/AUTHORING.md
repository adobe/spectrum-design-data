# Authoring Guide: Spectrum Design System Glossary

This guide explains how to author and maintain glossary terms in the Spectrum Design System Registry.

## Overview

The Design System Registry serves as the single source of truth for Spectrum design terminology. Each term includes:

* **Basic Information**: ID, label, description
* **Definition**: Structured definition following Spectrum's naming methodology
* **Platform Variations**: How the term differs across platforms (web, iOS, Android, etc.)
* **Terminology Metadata**: Classification and naming rationale
* **Sources**: References to documentation and standards
* **Governance**: Ownership and review information
* **Related Terms**: Cross-references to related concepts

## File Structure

Registry files are located in `registry/` and organized by type:

* `sizes.json` - Size scale values (xs, s, m, l, xl, etc.)
* `states.json` - Interaction states (default, hover, focus, etc.)
* `variants.json` - Color and style variants (accent, negative, primary, etc.)
* `anatomy-terms.json` - Component anatomy parts (edge, visual, text, icon, etc.)
* `components.json` - Spectrum component names
* `scale-values.json` - Numeric scale values (50, 75, 100, 200, etc.)
* `categories.json` - Component categories
* `platforms.json` - Platform names (desktop, mobile, web, iOS, Android)

## Writing Definitions

Follow the [Spectrum Naming and Definition Writing Guide](https://wiki.corp.adobe.com/display/AdobeDesign/Spectrum+Design+System%3A+Naming+and+definition+writing+guide) methodology:

### 1. Superordinate

The higher-level category or class this term belongs to. This provides context for the reader.

**Examples**:

* "interaction state" for states like hover or focus
* "size value" for size scales
* "user interface component" for components
* "design token" for token-related terms

### 2. Description

A clear, concise explanation of what the term is and how it differs from related concepts.

**Good example**:

> "The state when a component receives focus through keyboard navigation, indicating it will respond to keyboard input"

**Bad example**:

> "When you tab to something"

### 3. Essential Characteristics

Key features that distinguish this term from similar concepts. Use bullet points for clarity.

**Example for "keyboard-focus"**:

* Specifically indicates focus achieved through keyboard interaction (Tab, arrow keys)
* Requires prominent visual indicator for accessibility (WCAG 2.4.7)
* Different from generic focus to support :focus-visible patterns
* Critical for keyboard-only users to understand their current position

## JSON Structure

### Basic Entry (Minimum Required)

```json
{
  "id": "unique-identifier",
  "label": "Human Readable Label",
  "description": "Brief description of the term",
  "usedIn": ["tokens", "component-schemas"]
}
```

### Enhanced Entry (Full Glossary)

```json
{
  "id": "keyboard-focus",
  "label": "Keyboard Focus",
  "aliases": ["keyboard focus"],
  "description": "Focused via keyboard navigation",
  "usedIn": ["tokens", "component-options", "component-schemas"],
  
  "definition": {
    "superordinate": "interaction state",
    "description": "The state when a component receives focus through keyboard navigation",
    "essentialCharacteristics": [
      "Specifically indicates focus achieved through keyboard interaction",
      "Requires prominent visual indicator for accessibility",
      "Different from generic focus to support :focus-visible patterns"
    ]
  },
  
  "platforms": {
    "web": {
      "term": "keyboard-focus",
      "notes": "Often implemented with :focus-visible pseudo-class",
      "reference": "https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible"
    },
    "iOS": {
      "term": "focused",
      "notes": "UIFocusSystem for keyboard and pointer navigation",
      "reference": "UIFocusSystem"
    }
  },
  
  "terminology": {
    "conceptType": "term",
    "namingRationale": "Distinguishes keyboard-based focus from programmatic focus",
    "alternatives": ["tab-focus", "keyboard-navigated"]
  },
  
  "sources": [
    {
      "type": "industry-standard",
      "reference": "WCAG 2.4.7 Focus Visible",
      "url": "https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html",
      "date": "2025-01-12"
    }
  ],
  
  "governance": {
    "owner": "Spectrum Core Team",
    "reviewDate": "2025-01-12",
    "status": "approved"
  },
  
  "relatedTerms": ["focus", "default", "hover"]
}
```

## Field Reference

### Required Fields

| Field   | Type   | Description                    |
| ------- | ------ | ------------------------------ |
| `id`    | string | Unique identifier (kebab-case) |
| `label` | string | Human-readable label           |

### Optional Fields

| Field              | Type                  | Description                                                |
| ------------------ | --------------------- | ---------------------------------------------------------- |
| `aliases`          | array                 | Alternative names or spellings                             |
| `description`      | string                | Brief description                                          |
| `default`          | boolean               | Whether this is the default value                          |
| `deprecated`       | boolean               | Whether this value is deprecated                           |
| `usedIn`           | array                 | Where this value is used (tokens, component-schemas, etc.) |
| `category`         | string                | Category or grouping                                       |
| `value`            | string/number/boolean | Actual value (if different from id)                        |
| `documentationUrl` | string                | URL to documentation                                       |

### Enhanced Fields (Glossary)

| Field          | Type   | Description                                                                  |
| -------------- | ------ | ---------------------------------------------------------------------------- |
| `definition`   | object | Structured definition (superordinate, description, essentialCharacteristics) |
| `platforms`    | object | Platform-specific terminology and notes                                      |
| `terminology`  | object | Classification and naming rationale                                          |
| `sources`      | array  | References to source documentation                                           |
| `governance`   | object | Ownership and review metadata                                                |
| `relatedTerms` | array  | IDs of related terms                                                         |

## Concept Types

From the Spectrum Naming Guide:

* **word**: Fundamental building block with multiple possible meanings
* **term**: Word or phrase with precise meaning in a specific domain
* **name**: Identifier that distinguishes one thing from another (proper noun)
* **concept**: Abstract idea that words/terms/names represent

## Source Types

* **wiki**: Internal Spectrum wiki pages
* **industry-standard**: W3C, WCAG, platform specifications
* **platform-standard**: Apple HIG, Material Design, etc.
* **internal-doc**: Internal Adobe documentation
* **research**: User research or design research

## Governance Status

* **draft**: Work in progress, not yet reviewed
* **review**: Under review by stakeholders
* **approved**: Reviewed and approved for use
* **deprecated**: No longer recommended (use `replacedBy` field)

## Workflow

### Adding a New Term

1. **Research**: Understand the concept thoroughly
2. **Write Definition**: Follow the naming guide methodology
3. **Check References**: Validate against industry standards and platform docs
4. **Add Entry**: Create JSON entry with all required fields
5. **Validate**: Run `pnpm validate` to check schema compliance
6. **Test**: Run `pnpm test` to ensure no regressions
7. **Create PR**: Submit for review with changeset

### Updating an Existing Term

1. **Load Term**: Find the term in the appropriate registry file
2. **Update Fields**: Make necessary changes
3. **Update Governance**: Update `reviewDate` and `owner` if needed
4. **Validate**: Run validation and tests
5. **Create PR**: Submit for review with changeset explaining changes

### Deprecating a Term

1. **Set Deprecated**: Add `"deprecated": true`
2. **Add Replacement**: Set `governance.replacedBy` to new term ID
3. **Update Status**: Set `governance.status` to `"deprecated"`
4. **Document Reason**: Add note in PR description
5. **Create Changeset**: Document the deprecation

## Best Practices

### Naming

* Use kebab-case for IDs
* Be descriptive but concise
* Follow industry standards when they exist
* Avoid metaphorical or fanciful names
* Name for the action, not the appearance

### Definitions

* Start with the superordinate to set context
* Explain what it is AND how it differs from similar concepts
* Use essential characteristics to highlight unique features
* Write for both humans and AI systems
* Avoid circular definitions

### Platform Variations

* Document when platforms use different terminology
* Include platform-specific implementation notes
* Link to official platform documentation
* Help designers understand cross-platform differences

### Cross-References

* Link to related terms with `relatedTerms` array
* Use term IDs, not labels
* Bi-directional relationships are ideal but not required
* Help users discover related concepts

## Validation

Run validation before submitting:

```bash
# Validate all registry files
pnpm validate

# Run test suite
pnpm test
```

The validation script checks:

* JSON schema compliance
* No duplicate IDs
* No duplicate aliases
* Only one default value per registry
* Valid relatedTerms references
* Valid governance.replacedBy references

## Questions?

For questions or feedback:

* Slack: #spectrum\_dna
* Content Strategists: Jess Sattell, Kari Brookmyer
* GitHub: [Spectrum Design Data Discussions](https://github.com/adobe/spectrum-design-data/discussions)

## Related Resources

* [Spectrum Naming and Definition Writing Guide](https://wiki.corp.adobe.com/display/AdobeDesign/Spectrum+Design+System%3A+Naming+and+definition+writing+guide)
* [Spectrum Tokens Wiki](https://wiki.corp.adobe.com/display/AdobeDesign/Spectrum+tokens)
* [Design System Registry Package README](README.md)
* [RFC: Spectrum Design System Glossary](https://github.com/adobe/spectrum-design-data/discussions/661)
