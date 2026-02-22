# Spectrum Token Metrics

Extracts and reports design token metrics from `@adobe/spectrum-tokens` for tracking the health, coverage, and growth of the Spectrum design token system.

This tool supports the OKR: **"Token metrics are defined and included into our metrics system & have a baseline to compare moving forward."**

## What This Answers for Leadership

**"What does 'token metrics' mean specifically, and when should this be done by?"**

Token metrics are quantitative measurements extracted from the design token data in `packages/tokens` that give us visibility into the health, maturity, and coverage of Spectrum's design data layer. They establish a baseline so we can measure progress over time and make data-informed decisions about where to invest in the token system.

## Metrics Available Today (Baseline)

These metrics are extracted directly from the current token source files with zero additional instrumentation:

### 1. Token Inventory (Health)

| Metric                             | Current Value            | Why It Matters                                                      |
| ---------------------------------- | ------------------------ | ------------------------------------------------------------------- |
| **Total tokens**                   | 2,338                    | Size of the design data surface area                                |
| **Active tokens**                  | 2,150                    | Tokens currently in use                                             |
| **Deprecated tokens**              | 188 (8.0%)               | Technical debt in the token layer                                   |
| **Deprecated with migration path** | 57 (30.3% of deprecated) | How well we support migration when tokens change                    |
| **Private tokens**                 | 372                      | Internal implementation tokens not intended for direct consumer use |

### 2. Token Scope (Architecture)

| Metric                            | Current Value | Why It Matters                                   |
| --------------------------------- | ------------- | ------------------------------------------------ |
| **Global (system) tokens**        | 965           | Foundation tokens available to all components    |
| **Component tokens**              | 1,373         | Tokens scoped to specific components             |
| **Unique components with tokens** | 95            | How many components have dedicated token support |

### 3. Token Architecture (Complexity)

| Metric                       | Current Value | Why It Matters                                     |
| ---------------------------- | ------------- | -------------------------------------------------- |
| **Alias (reference) tokens** | 654           | Tokens that reference other tokens for consistency |
| **Direct-value tokens**      | 459           | Tokens with hard-coded values                      |
| **Color theme set tokens**   | 470           | Tokens with light/dark/wireframe variants          |
| **Scale set tokens**         | 755           | Tokens with desktop/mobile variants                |
| **Max alias chain depth**    | 4             | Deepest nesting of token references                |

### 4. Data Quality

| Metric                      | Current Value              | Why It Matters                                   |
| --------------------------- | -------------------------- | ------------------------------------------------ |
| **UUID coverage**           | 100%                       | Every token has a unique identifier for tracking |
| **Migration path coverage** | 30.3% of deprecated tokens | Gap in providing clear upgrade guidance          |

### 5. Component Coverage

| Metric                    | Current Value | Why It Matters                                 |
| ------------------------- | ------------- | ---------------------------------------------- |
| **Registered components** | 54            | Components in the design system registry       |
| **With tokens**           | 44 (81.5%)    | Components that have design token support      |
| **With schema**           | 54 (100%)     | Components that have formal schema definitions |

### 6. Semantic Categories

| Category   | Count | What It Covers                                    |
| ---------- | ----- | ------------------------------------------------- |
| Layout     | 741   | Spacing, sizing, dimensions, margins              |
| Other      | 550   | Component-specific tokens not in other categories |
| Content    | 289   | Text and content-related colors/styles            |
| Typography | 284   | Font families, sizes, weights, line heights       |
| Color      | 227   | Color values and visual tokens                    |
| Background | 151   | Background colors and opacity                     |
| Border     | 58    | Border colors and styles                          |
| Shadow     | 23    | Drop shadows and elevation                        |
| Opacity    | 9     | Opacity values                                    |
| Icon       | 6     | Icon-specific tokens                              |

## Additional Metrics Worth Working On

These require additional instrumentation or cross-system integration:

### Phase 2 (Recommended for Q2)

1. **Token adoption rate** - Track which tokens are actually used in downstream implementations (Spectrum CSS, React Spectrum, S2) via automated source code scanning.

2. **Token change velocity** - Tokens added/modified/deleted per release. The existing `release-analyzer` tool partially supports this; it can be extended to track token-level changes per version.

3. **Deprecation lifecycle duration** - How long deprecated tokens remain before removal. This measures how effectively we communicate and complete migrations.

4. **Cross-platform token parity** - Compare tokens available for web vs iOS vs Android to measure multi-platform readiness. This directly supports the "multi-platform philosophy" OKR item.

### Phase 3 (Q3+)

5. **Consumer migration completeness** - For each deprecated token, what percentage of known consumers have migrated. Requires integration with downstream repos.

6. **Token request/gap tracking** - Track feature requests for new tokens and measure time-to-delivery.

7. **Design-to-code token fidelity** - Measure how well design tool tokens map to implementation tokens (requires Figma API integration).

8. **Custom token prevalence** - Track how often teams create custom tokens outside the system, indicating gaps in the core offering.

## Usage

### Generate a full metrics report

```bash
node src/cli.js
```

### Print summary only

```bash
node src/cli.js --summary
```

### Output to a specific file

```bash
node src/cli.js --output metrics-2026-Q1.json
```

### Using moon

```bash
moon run token-metrics:metrics
```

## Integration with Metrics Systems

The tool outputs a JSON report that can be:

* Stored in the repo as a baseline snapshot (commit the output file)
* Ingested by dashboarding tools (Grafana, Datadog, etc.)
* Compared across releases to show trends
* Included in CI to track regressions (e.g., deprecation rate exceeding threshold)

## Suggested Timeline

| Milestone             | Target            | Description                                   |
| --------------------- | ----------------- | --------------------------------------------- |
| Baseline established  | **Now (Q1 2026)** | This tool generates the initial baseline      |
| CI integration        | Q1 2026           | Run metrics on every PR to detect regressions |
| Dashboard             | Q2 2026           | Visualize metrics trends over time            |
| Adoption metrics      | Q2 2026           | Cross-reference with downstream consumers     |
| Multi-platform parity | Q2-Q3 2026        | Compare web/iOS/Android token coverage        |
