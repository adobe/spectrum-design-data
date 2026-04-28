# Platform Extensions Guide

This guide explains how platform teams can extend the Spectrum Design System Registry with platform-specific terminology and implementation details.

## Overview

The Platform Extension system allows platform implementations (iOS, Android, Web Components, Qt, etc.) to:

* Define platform-specific terminology for registry terms
* Document implementation differences
* Provide code examples in platform-specific APIs
* Map Spectrum terms to platform conventions

## Extension Approaches

Platform teams have two options for contributing extensions:

### Option 1: Centralized Contributions (Recommended)

Contribute platform-specific metadata directly to the central registry via pull requests.

**Pros**:

* Single source of truth
* Easy to discover for all users
* Maintained alongside core registry
* Included in npm package

**Cons**:

* Requires PR approval from registry maintainers
* May slow down platform-specific updates

**When to use**: For stable, well-established platform terminology that benefits the entire Spectrum community.

### Option 2: Plugin/Extension System

Maintain platform extensions in your own repository or as separate files.

**Pros**:

* Platform teams have full control
* Faster iteration for platform-specific changes
* Can be versioned independently
* No approval required from central team

**Cons**:

* Users must load extensions separately
* Risk of fragmentation
* May become out of sync with base registry

**When to use**: For experimental features, platform-specific implementations, or rapidly changing APIs.

## Creating a Platform Extension

### 1. Create Extension File

Extensions are JSON files that reference base registry terms and add platform-specific information.

**File naming convention**: `{platform}-{registry}.json`

Examples:

* `ios-states.json` - iOS extensions for interaction states
* `android-sizes.json` - Android extensions for size values
* `web-components-variants.json` - Web Components extensions for variants

### 2. Extension Schema

```json
{
  "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/platform-extension.json",
  "platform": "iOS",
  "platformVersion": "iOS 17+",
  "description": "iOS-specific terminology for interaction states",
  "extends": "states",
  "extensions": [
    {
      "termId": "hover",
      "platformTerm": "highlighted",
      "platformAliases": ["isHighlighted"],
      "notes": "iOS uses 'highlighted' state for pointer interactions",
      "reference": "UIControl.State.highlighted",
      "codeExample": "button.isHighlighted = true",
      "differences": [
        "Only available on devices with pointer support",
        "Not triggered by touch interactions"
      ]
    }
  ]
}
```

### 3. Extension Fields

| Field             | Required | Description                                               |
| ----------------- | -------- | --------------------------------------------------------- |
| `platform`        | Yes      | Platform name (iOS, Android, Web Components, Qt, etc.)    |
| `platformVersion` | No       | Platform or framework version                             |
| `description`     | No       | What this extension provides                              |
| `extends`         | Yes      | Which registry it extends (sizes, states, variants, etc.) |
| `extensions`      | Yes      | Array of term extensions                                  |

### 4. Term Extension Fields

| Field             | Required | Description                                  |
| ----------------- | -------- | -------------------------------------------- |
| `termId`          | Yes      | ID of the base term (must exist in registry) |
| `platformTerm`    | No       | Platform-specific term name                  |
| `platformAliases` | No       | Platform-specific aliases                    |
| `notes`           | No       | Implementation notes                         |
| `reference`       | No       | API name or documentation reference          |
| `codeExample`     | No       | Code snippet showing usage                   |
| `differences`     | No       | Key differences from base term               |

## Using Platform Extensions

### In Code

```javascript
import { 
  states, 
  getTermForPlatform,
  loadPlatformExtension 
} from '@adobe/design-system-registry';

// Load platform extension
const iosStates = loadPlatformExtension('./platform-extensions/ios-states.json');

// Get platform-specific term
const hoverTerm = getTermForPlatform(states, 'hover', 'iOS', iosStates);

console.log(hoverTerm.platform.term); // "highlighted"
console.log(hoverTerm.platform.reference); // "UIControl.State.highlighted"
console.log(hoverTerm.platform.codeExample); // "button.isHighlighted = true"
```

### Loading All Extensions

```javascript
import { loadAllPlatformExtensions } from '@adobe/design-system-registry';
import { join } from 'node:path';

const extensionsDir = join(__dirname, 'registry', 'platform-extensions');
const allExtensions = loadAllPlatformExtensions(extensionsDir);

// Filter by platform
const iosExtensions = allExtensions.filter(ext => ext.platform === 'iOS');
```

## Example: iOS States Extension

Here's a complete example showing how iOS extends the states registry:

```json
{
  "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/platform-extension.json",
  "platform": "iOS",
  "platformVersion": "iOS 17+",
  "description": "iOS-specific terminology for interaction states",
  "extends": "states",
  "extensions": [
    {
      "termId": "hover",
      "platformTerm": "highlighted",
      "platformAliases": ["isHighlighted"],
      "notes": "iOS uses 'highlighted' for pointer interactions on devices with pointer support",
      "reference": "UIControl.State.highlighted",
      "codeExample": "button.isHighlighted = true",
      "differences": [
        "Only available on iOS devices with pointer support",
        "Not triggered by touch interactions",
        "Maps to UIControl.State.highlighted property"
      ]
    },
    {
      "termId": "disabled",
      "platformTerm": "disabled",
      "platformAliases": ["isEnabled"],
      "notes": "iOS uses isEnabled property (inverted boolean)",
      "reference": "UIControl.isEnabled",
      "codeExample": "button.isEnabled = false",
      "differences": [
        "Property is named 'isEnabled' but inverted (false = disabled)",
        "Affects both visual appearance and interaction"
      ]
    }
  ]
}
```

## Contributing Centralized Extensions

### 1. Fork and Clone

```bash
git clone https://github.com/adobe/spectrum-design-data.git
cd spectrum-design-data
pnpm install
```

### 2. Create Extension File

Create your extension file in `packages/design-system-registry/registry/platform-extensions/`.

### 3. Validate

```bash
cd packages/design-system-registry
pnpm validate
```

### 4. Test

Ensure helper functions work with your extension:

```bash
pnpm test
```

### 5. Create Changeset

```bash
pnpm changeset
```

Select `@adobe/design-system-registry` and describe your changes.

### 6. Submit Pull Request

```bash
git checkout -b feat/add-{platform}-{registry}-extension
git add .
git commit -m "feat(registry): add {platform} extensions for {registry}"
git push origin feat/add-{platform}-{registry}-extension
```

Create a PR with:

* Clear description of platform and what's being extended
* Examples of how the extension improves platform consistency
* Link to platform documentation

## Maintaining Platform Extensions

### Versioning

* Extension files should evolve with the platform
* Use `platformVersion` field to indicate compatibility
* Breaking changes should be documented in commit messages

### Deprecation

When platform APIs change:

1. Add new extension for the new API
2. Mark old extension term with deprecation note
3. Provide migration guidance in `differences` field

Example:

```json
{
  "termId": "hover",
  "platformTerm": "highlighted",
  "notes": "DEPRECATED: Use isPointerInteractionEnabled instead (iOS 18+)",
  "differences": [
    "Deprecated in iOS 18",
    "Replace with isPointerInteractionEnabled property"
  ]
}
```

### Review Cycle

Centralized extensions should be reviewed:

* Annually for accuracy
* When platform versions update
* When base registry terms change

## Best Practices

### DO

* ✅ Use official platform terminology
* ✅ Link to official platform documentation
* ✅ Provide code examples in platform's language
* ✅ Document key differences from base term
* ✅ Use platform naming conventions

### DON'T

* ❌ Invent new terminology not used by platform
* ❌ Duplicate information already in base term
* ❌ Include deprecated APIs without notes
* ❌ Skip validation before submitting
* ❌ Mix multiple platforms in one extension file

## Questions?

For questions or feedback:

* Slack: #spectrum\_dna
* GitHub: [Spectrum Design Data Issues](https://github.com/adobe/spectrum-design-data/issues)
* Email platform leads for platform-specific questions

## Related Resources

* [Design System Registry README](README.md)
* [Authoring Guide](AUTHORING.md)
* [Platform Extension Schema](schemas/platform-extension.json)
* [Example: iOS States Extension](registry/platform-extensions/ios-states.json)
* [Example: Web Components States Extension](registry/platform-extensions/web-components-states.json)
