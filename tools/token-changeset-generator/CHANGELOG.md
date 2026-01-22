# @adobe/token-changeset-generator

## 0.2.6

### Patch Changes

- Updated dependencies [[`ae68c41`](https://github.com/adobe/spectrum-design-data/commit/ae68c412101b32b114d0d56893d1214f5225210a)]:
  - @adobe/token-diff-generator@2.5.3

## 0.2.5

### Patch Changes

- Updated dependencies [[`fa28b11`](https://github.com/adobe/spectrum-design-data/commit/fa28b117c6b84776f4ebe9bb281c29e14e0d64b6)]:
  - @adobe/token-diff-generator@2.5.2

## 0.2.4

### Patch Changes

- Updated dependencies []:
  - @adobe/token-diff-generator@2.5.1

## 0.2.3

### Patch Changes

- Updated dependencies [[`6fe3d3a`](https://github.com/adobe/spectrum-design-data/commit/6fe3d3a64e0da4e07cef86e70590b5af65a70470)]:
  - @adobe/token-diff-generator@2.5.0

## 0.2.2

### Patch Changes

- Updated dependencies [[`e4053fb`](https://github.com/adobe/spectrum-design-data/commit/e4053fb7a92c000c6c6efde1766766e8fa6aa0d2)]:
  - @adobe/token-diff-generator@2.4.0

## 0.2.1

### Patch Changes

- Updated dependencies []:
  - @adobe/token-diff-generator@2.3.1

## 0.2.0

### Minor Changes

- [#559](https://github.com/adobe/spectrum-design-data/pull/559) [`d77ced3`](https://github.com/adobe/spectrum-design-data/commit/d77ced33a56092e71a7d9d14c5768bb9bb295eeb) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - ## New Token Changeset Generator Tool

  Added a new command line tool `@adobe/token-changeset-generator` to automate the creation of changeset files for Spectrum token changes synced from tokens studio.

  ### Features
  - **Automated PR parsing**: Extracts design motivation from tokens studio PRs
  - **Token diff integration**: Uses `tdiff` to generate comprehensive token change reports
  - **Smart semver detection**: Automatically determines appropriate bump types (major/minor/patch) based on token changes
  - **Changeset generation**: Creates properly formatted changeset files with:
    - Design motivation from tokens studio
    - Detailed token diff reports
    - Appropriate semver bump types
    - PR references

  ### Usage

  ```bash
  token-changeset generate \
    --tokens-studio-pr https://github.com/adobe/spectrum-design-data-studio-data/pull/275 \
    --spectrum-tokens-pr https://github.com/adobe/spectrum-design-data/pull/559
  ```

  This tool streamlines the workflow for maintainers when syncing token changes from the design team's tokens studio data repository.
