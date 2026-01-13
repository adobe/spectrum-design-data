# Spectrum Design System Glossary

A searchable, accessible web interface for browsing the Spectrum Design System terminology and definitions.

## Features

* **179 Terms** across 11 registries
* **Enhanced Definitions** with superordinates and essential characteristics
* **Platform Extensions** showing iOS, Web, Android-specific terminology
* **Full-Text Search** with fuzzy matching
* **Advanced Filters** by registry, platform, status, and usage
* **Static JSON API** for programmatic access
* **Dark Mode Support** with theme switcher
* **Mobile Responsive** design
* **WCAG 2.1 AA Compliant** accessibility

## Development

### Install Dependencies

```bash
pnpm install
```

### Start Development Server

```bash
pnpm start
```

Open <http://localhost:8080> to view the glossary.

### Build for Production

```bash
pnpm build
```

This will:

1. Generate static JSON API (`build:api`)
2. Build search index (`build:search`)
3. Generate static HTML pages (`build:eleventy`)

Output is in `dist/` directory.

## Architecture

**Stack**:

* **11ty** (Eleventy) for static site generation
* **Spectrum Web Components** for interactive UI
* **Spectrum CSS** for styling
* **Fuse.js** for client-side search
* **Nunjucks** for templating

**Directory Structure**:

```
docs/spectrum-glossary/
├── src/
│   ├── _data/          # Data files (registry, meta, navigation)
│   ├── _includes/      # Templates and components
│   ├── assets/         # CSS and JavaScript
│   ├── index.njk       # Homepage
│   ├── terms/          # Term detail pages
│   └── categories/     # Category listing pages
├── scripts/            # Build scripts
├── .eleventy.js        # 11ty configuration
└── dist/               # Build output
```

## Deployment

The glossary is automatically deployed to GitHub Pages when changes are pushed to `main`:

**URL**: <https://adobe.github.io/spectrum-design-data/glossary/>

See `.github/workflows/deploy-glossary.yml` for the deployment workflow.

## Content Management

Glossary content is managed in the `@adobe/design-system-registry` package:

```
packages/design-system-registry/
├── registry/
│   ├── states.json
│   ├── sizes.json
│   ├── variants.json
│   └── ...
└── schemas/
    └── registry-value.json
```

See [Design System Registry README](../../packages/design-system-registry/README.md) for content authoring guidelines.

## API Endpoints

The glossary generates a static JSON API:

* `/api/v1/glossary.json` - All terms
* `/api/v1/search-index.json` - Search index
* `/api/v1/terms/{termId}.json` - Individual term
* `/api/v1/categories/{category}.json` - Terms by category
* `/api/v1/platforms/{platform}.json` - Terms by platform
* `/api/v1/stats.json` - Statistics

## License

Apache-2.0 © Adobe
