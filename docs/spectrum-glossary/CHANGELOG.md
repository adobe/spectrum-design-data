# Changelog

## 2.0.0

### Major Changes

- [#660](https://github.com/adobe/spectrum-design-data/pull/660) [`4051014`](https://github.com/adobe/spectrum-design-data/commit/4051014951c5c68c01b69be5ee156b4fc8fe98ed) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(docs): add Spectrum Design System Glossary web viewer

  Comprehensive, searchable web interface for browsing Spectrum Design System
  terminology with 179 terms across 11 registries.

  **Key Features:**
  - Full-text search with Fuse.js and advanced filters
  - 21 enhanced definitions with platform-specific variations
  - Static JSON API for programmatic access
  - Dark mode, mobile responsive, WCAG 2.1 AA compliant
  - Built with 11ty + Spectrum Web Components
  - Integrated into main docs deployment workflow

  **URL:** https://adobe.github.io/spectrum-design-data/glossary/

### Patch Changes

- Updated dependencies [[`4051014`](https://github.com/adobe/spectrum-design-data/commit/4051014951c5c68c01b69be5ee156b4fc8fe98ed)]:
  - @adobe/design-system-registry@1.1.0

All notable changes to the Spectrum Design System Glossary will be documented in this file.

## [1.0.0] - 2026-01-13

### Added

- Initial release of the Spectrum Design System Glossary
- 179 terms across 11 registries
- 21 enhanced definitions with superordinates and essential characteristics
- Platform-specific terminology for iOS, Web Components, Android, and more
- Full-text search with fuzzy matching using Fuse.js
- Advanced filters by registry, platform, status, and usage
- Static JSON API for programmatic access
- Dark mode support with theme switcher
- Mobile responsive design
- WCAG 2.1 AA compliant accessibility
- Individual term detail pages with rich metadata
- Category browsing pages
- Related terms navigation
- Export functionality (JSON)
- GitHub Pages deployment

### Features

#### Core Functionality

- Searchable interface with real-time results
- Keyboard shortcuts (⌘K / Ctrl+K for search)
- Category-based navigation
- Alphabet navigation for long lists

#### Term Detail Pages

- Comprehensive definitions with superordinates
- Essential characteristics lists
- Platform variations with tabs
- Terminology metadata (concept type, naming rationale)
- Sources and references
- Governance information
- Related terms suggestions

#### Static JSON API

- `/api/v1/glossary.json` - All terms
- `/api/v1/search-index.json` - Optimized search index
- `/api/v1/terms/{termId}.json` - Individual term data
- `/api/v1/categories/{category}.json` - Terms by category
- `/api/v1/platforms/{platform}.json` - Terms by platform
- `/api/v1/stats.json` - Usage statistics

#### Developer Experience

- 11ty static site generation
- Spectrum Web Components integration
- ES modules support
- Moon monorepo task management
- Fast builds and hot reload

### Technical Stack

- **Static Site Generator**: 11ty (Eleventy) v3.0.0
- **UI Components**: Spectrum Web Components v0.49.0
- **Styling**: Spectrum CSS with custom theme support
- **Search**: Fuse.js v7.0.0 for client-side fuzzy search
- **Templating**: Nunjucks
- **Deployment**: GitHub Pages via GitHub Actions

### Related Packages

- `@adobe/design-system-registry@1.0.0` - Source data for the glossary
