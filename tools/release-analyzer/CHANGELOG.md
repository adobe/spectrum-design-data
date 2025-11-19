# @adobe/spectrum-tokens-release-analyzer

## 0.2.0

### Minor Changes

- [#566](https://github.com/adobe/spectrum-design-data/pull/566) [`e0de953`](https://github.com/adobe/spectrum-design-data/commit/e0de953fb8ef5aba92782838094eeec3a4c78321) Thanks [@GarthDB](https://github.com/GarthDB)! - Add release timeline visualization and analysis tools for Spectrum Tokens change tracking.

  This adds new internal tooling for analyzing and visualizing the frequency and scope of Spectrum Tokens releases:
  - **Release Analyzer Tool** (`tools/release-analyzer/`): Parses git tags and CHANGELOG.md to extract release data and change scope metrics
  - **Interactive Timeline Visualization** (`docs/release-timeline/`): D3.js-powered charts showing release frequency, change scope, and development activity over time
  - **GitHub Pages Integration**: Build system to deploy static visualization to `/spectrum-tokens/release-timeline/`

  These tools provide data-driven insights into design system evolution patterns and coordination costs, supporting the business case for systematic token infrastructure at scale.

  The visualization demonstrates:
  - 220+ releases across 3 years with varying change scope (1-2000+ tokens)
  - High development activity (61 beta releases, 24 experimental snapshots)
  - 11 concurrent development feature streams
  - Clear trends in release frequency and impact

  All new packages are marked as private and will not be published to npm.
