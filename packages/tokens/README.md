# Spectrum Tokens

Design tokens are primarily name-value pairs used to store design decisions and distributed in a way platforms, implementations, and products can use across design tools and coding languages. These value types are represented as data, which include spacing, color, typography, object styles, animation, etc. These can represent anything defined by design: a color as an RGB value, an opacity as a number, and an animation ease function as Bezier coordinates. They're used in place of hard-coded values to ensure flexibility and unity across all product experiences.

Design tokens are directly integrated into our component libraries, UI kits, and the Spectrum XD plugin. They cover the various options of platform scales, color themes, component states, and more. We also offer teams a variety of token types to use directly within their products if they are not using a Spectrum component library.

## Getting started

Follow the monorepo [setup guide](../../README.md#setup-monorepo-locally).

## Generate a Diff from the last release

The `pnpm generateDiffResult` script will build the project and compare the tokens in the `dist` directory with the last released version of Spectrum Tokens. It will generate a report of added tokens, deleted tokens, tokens with value changes, and tokens with potential name changes. The script can't guarantee the correct name changes; it compares new tokens and deleted tokens to see if any have the same value and are likely to be token name changes.

## Versioning

This project uses [Semantic Versioning (semver)](https://semver.org/). It also utilizes [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) and [semantic-release](https://semantic-release.gitbook.io/semantic-release/) with a GitHub Action to automate the release process.

### Major, minor, and patch criteria

#### Patches

x.x.n+1 releases are for bug fixes and patches.

- bug fixes
- typos
- mistakes

Example: a token name changing from `detail-margin-top-mulitplier` to `detail-margin-top-multiplier` to fix a spelling mistake.

#### Minor

x.n+1.0 releases are for new tokens and features.

- adding new token
- changing a value intentionally
- adding deprecation metadata and aliased new tokens where applicable

#### Major

n+1.0.0 releases are for breaking changes.

- deleting tokens
- changing token value type (e.g., from a color to a dimension; anything that would break a parser expecting specific data types)

## Deprecations

### Planned token name changes

Tokens with a name changed will first be marked as deprecated, while a new token will be created with the new name; the deprecated token will then become an alias for the new token. Finally, the deprecated token will eventually be removed, most likely in the next major release if there has been sufficient time to notify teams. The required amount of time is still to be determined.

## Releases

All commits merged or pushed to the `main` branch will be released as a stable version with the `latest` tag on [NPM](https://www.npmjs.com/package/@adobe/spectrum-tokens?activeTab=versions). All commits merged or pushed to `next`, or `next-major` will update the version number according to the types of commits made in the branch (breaking change, feature, bug fix) and release it to NPM with the `next` tag.

More details can be found in this [example workflow](https://semantic-release.gitbook.io/semantic-release/recipes/release-workflow/distribution-channels).

## Spectrum Tokens 11.x.x and 12.x.x

Starting with `@adobe/spectrum-tokens` v12.0.0, this project uses a more efficient list of tokens. Previously in v11.x.x, every possible combination of component options was used to define tokens, resulting in an unnecessarily large list of tokens. However, while the work is ongoing in migrating components from the old system to the newer one, v12.0.0 and future versions will be published under the `latest` tag. To install it, use the script:

```
pnpm add @adobe/spectrum-tokens
```

or

```
npm install --save @adobe/spectrum-tokens
```

If you need to use the older and more complete set of tokens side by side with the v12.x.x release while the development of this migration is ongoing, you can use the [`@adobe/spectrum-tokens-depreacated`](https://www.npmjs.com/package/@adobe/spectrum-tokens-deprecated) package, which is an archived release of `@adobe/spectrum-tokens@11.8.0`.

## Token Types and `$schema`

Tokens now have a `$schema` property that relates to a type defined in the `schemas/token-types/` directory. Even those these are being released as part of the regular releases, they shouldn't be considered formal API yet. There are planned adjustments with further data integration in design tools and workflows. Ideally, designers would be able to author new tokens and manage type across all the data.
