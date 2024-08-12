# Token Diff Generator Library and CLI

###### WARNING: Will either be inaccurate or will throw an error if used for releases or branches that use tokens from before @adobe/spectrum-tokens@12.26.0!

The token diff generator library and cli is a npm package containing the CLI and standalone Javascript library that you can use to generate reports detailing the changes made between two different Spectrum token schema. Both the CLI and the standalone Javascript library are located in the Spectrum Tokens monorepo.

## Installation

Installing the package is done preferably with pnpm.

```
pnpm i @adobe/token-diff-generator
```

## Imports

Import the token diff generator as a module per ES6 standards.

```
import tokenDiff from “@adobe/token-diff-generator”;
```

## Token diff generator library

The token diff generator library holds the functions used to generate diffs between two compilations of design tokens. It uses the deep-object-diff open-source library to extract a JSON object containing the changes, and then runs that JSON object through various functions to tailor the result specifically for design tokens.

An example of tailoring involves detecting when tokens are renamed. The deep-object-diff library is unable to tell whether or not a token has been renamed due to it being designed for general JSON objects. Instead, it will mark the new name as a new token being added to the schema and the old name as a deleted token.

This is where the token diff generator comes in. It goes through the changes detected by deep-object-diff and checks if a token is renamed via its uuid. Since the token diff generator relies on all tokens having their own uuid, the library—including the CLI and web version—will not work for versions of spectrum-tokens before the @adobe/spectrum-tokens@12.26.0 release.

### Usage examples

The most basic usage case is calling tokenDiff with two JSON objects, one for the original token(s) and the other for the updated token(s).

```
import tokenDiff from “@adobe/token-diff-generator”;

const report = tokenDiff(originalSchema, updatedSchema);
```

If you are interested in comparing tokens locally between different versions or branches, you can use the following code snippet.

```
import tokenDiff from “@adobe/token-diff-generator”;
import fileImport from “@adobe/token-diff-generator”;

const [originalSchema, updatedSchema] = await Promise.all([
              fileImport(tokenNames, originalVersion, originalBranch),
              fileImport(tokenNames, updatedVersion, updatedBranch),
            ]);

const report = tokenDiff(originalSchema, updatedSchema);
```

Both of these examples output a JSON object containing the changes made between the two schema.

## Token diff cli

The token diff cli is a command line interface tool used to generate reports in the terminal with data from the token diff generator. It is included in the same package as the standalone Javascript library and uses the commander open-source library.

### Commands

There currently is only one command to run in the CLI. It generates a diff report for two inputted schema.

```
tdiff report
```

### Options

| Shorthand | Name                  | Argument(s)    | Description                                            |
| --------- | --------------------- | -------------- | ------------------------------------------------------ |
| `-y`      | `-y`                  | `null`         | answers yes to removing deprecated status of token(s)  |
| `-otv`    | `--old-token-version` | `<oldVersion>` | npm package version/github tag to pull old tokens from |
| `-ntv`    | `--new-token-version` | `<newVersion>` | npm package version/github tag to pull new tokens from |
| `-otb`    | `--old-token-branch`  | `<oldBranch>`  | branch to fetch old token data from                    |
| `-ntb`    | `--new-token-branch`  | `<newBranch>`  | branch to fetch new token data from                    |
| `-t`      | `--test`              | `<tokens...>`  | indicates test mode and runs only on tokens passed in  |
| `-tn`     | `--token-names`       | `<tokens...>`  | indicates specific tokens to compare                   |

### Usage examples

This is how you can compare between branches and/or versions.

```
tdiff report -otv shirlsli/diff-generator-cli-tests -ntb shirlsli/file-import-tests
```
