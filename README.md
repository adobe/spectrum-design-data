# Spectrum Tokens

Design tokens are all the values needed to construct and maintain a design system — spacing, color, typography, object styles, animation, etc. — represented as data. These can represent anything defined by design: a color as an RGB value, an opacity as a number, and an animation ease function as Bezier coordinates. They're used in place of hard-coded values to ensure flexibility and unity across all product experiences.

Design tokens are directly integrated into our component libraries, UI kits, and the Spectrum XD plugin. They cover the various options of platform scales, color themes, component states, and more. We also offer teams a variety of token types to use directly within their products if they are not using a Spectrum component library.

## Getting started

Start by installing all the project dependencies.

```bash
yarn 
```

Running this script will also build the tokens to the `dist` directory.

To manually build the project, you can also run the following script:

```bash
yarn build
```

## Generate a Diff from the last release

The `yarn generateDiffResult` script will build the project and compare the tokens in the `dist` directory with the last released version of Spectrum Tokens. It will generate a report of added tokens, deleted tokens, tokens with value changes, and tokens with potential name changes. The script can't guarantee the correct name changes; it compares new tokens and deleted tokens to see if any have the same value and are likely to be token name changes.

## Versioning

This project uses [Semantic Versioning (semver)](https://semver.org/). It also utilizes [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) and [semantic-release](https://semantic-release.gitbook.io/semantic-release/) with a GitHub Action to automate the release process.

### Major, minor, and patch criteria

#### Patches

x.x.n+1 releases are for bug fixes and patches.

* bug fixes
* typos
* mistakes

Example: a token name changing from `detail-margin-top-mulitplier` to `detail-margin-top-multiplier` to fix a spelling mistake.

#### Minor

x.n+1.0 releases are for new tokens and features.

* adding new token
* changing a value intentionally
* adding deprecation metadata and aliased new tokens where applicable

#### Major

n+1.0.0 releases are for breaking changes.

* deleting tokens
* changing token value type (e.g., from a color to a dimension; anything that would break a parser expecting specific data types)

## Releases

All commits merged or pushed to the `main` branch will be released as a stable version with the `latest` tag on [NPM](https://www.npmjs.com/package/@adobe/spectrum-tokens?activeTab=versions). All commits merged or pushed to `next`, or `next-major` will update the version number according to the types of commits made in the branch (breaking change, feature, bug fix) and release it to NPM with the `next` tag.

More details can be found in this [example workflow](https://semantic-release.gitbook.io/semantic-release/recipes/release-workflow/distribution-channels).