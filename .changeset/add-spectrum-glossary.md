---
"spectrum-glossary": major
---

feat(docs): add Spectrum Design System Glossary web viewer

Introduces a comprehensive, searchable web interface for browsing Spectrum 
Design System terminology. Built with 11ty and Spectrum Web Components.

**Features:**
- 179 terms across 11 registries (states, sizes, variants, anatomy, etc.)
- 21 enhanced definitions with superordinates and essential characteristics
- Platform-specific terminology for iOS, Web Components, Android
- Full-text search with fuzzy matching (Fuse.js)
- Advanced filters by registry, platform, status, and usage
- Static JSON API for programmatic access
- Dark mode support with theme switcher
- Mobile responsive design
- WCAG 2.1 AA compliant accessibility
- Individual term detail pages with rich metadata
- Category browsing and navigation
- Related terms suggestions
- Export functionality (JSON)

**Technical Stack:**
- 11ty (Eleventy) v3.0.0 for static site generation
- Spectrum Web Components v0.49.0 for UI
- Spectrum CSS for styling
- Fuse.js v7.0.0 for client-side search
- Nunjucks templating

**Deployment:**
- Integrated into main docs deployment workflow
- Deployed to GitHub Pages via `deploy-docs.yml`
- URL: https://adobe.github.io/spectrum-design-data/glossary/

**API Endpoints:**
- `/api/v1/glossary.json` - All terms
- `/api/v1/search-index.json` - Search index
- `/api/v1/terms/{termId}.json` - Individual term
- `/api/v1/categories/{category}.json` - Terms by category
- `/api/v1/platforms/{platform}.json` - Terms by platform
- `/api/v1/stats.json` - Statistics
