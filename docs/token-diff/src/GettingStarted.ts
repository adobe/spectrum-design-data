/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
import { html, css, LitElement, TemplateResult } from 'lit';
import '@spectrum-web-components/theme/sp-theme.js';
import '@spectrum-web-components/theme/src/themes.js';
import '@spectrum-web-components/card/sp-card.js';
import '@spectrum-web-components/button/sp-button.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-compare.js';
import './compare-card.js';
import './code-panel.js';
import '@spectrum-web-components/table/sp-table.js';
import '@spectrum-web-components/table/sp-table-body.js';
import '@spectrum-web-components/table/sp-table-cell.js';
import '@spectrum-web-components/table/sp-table-head.js';
import '@spectrum-web-components/table/sp-table-head-cell.js';
import '@spectrum-web-components/table/sp-table-row.js';

export class GettingStarted extends LitElement {
  static styles = css`
    :host {
      display: flex;
      padding-top: 25px;
      color: var(--token-diff-text-color, #000);
      flex: auto;
      top: 0;
      overflow-x: hidden;
      min-height: 100vh;
      flex-wrap: wrap;
      width: auto;
      box-sizing: border-box;
    }
    .title {
      color: #000;
      font-family: 'Adobe Clean Serif';
      font-size: 58px;
      font-style: normal;
      font-weight: 900;
      line-height: 66.7px; /* 115% */
      margin-top: 15px;
    }
    .subtitle {
      color: #000;
      font-family: 'Adobe Clean Serif';
      font-size: 40px;
      font-style: normal;
      font-weight: 900;
      margin-top: 15px;
    }
    .text {
      color: #222;
      font-size: 18px;
      font-style: normal;
      font-weight: 400;
      line-height: 27px;
      margin-bottom: 10px;
      margin-top: 10px;
    }
    .section {
      padding-bottom: 20px;
      padding-top: 20px;
    }
    .container {
      padding-bottom: 20px;
    }
    .ending-panel {
      margin-bottom: 10px;
    }
    .table {
      overflow-x: auto;
      resize: none;
      position: relative;
      margin-top: 10px;
      margin-bottom: 10px;
    }
    .page {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
    }
    @media only screen and (max-width: 1100px) {
      :host {
        display: flex;
        flex-wrap: wrap;
        box-sizing: border-box;
      }
      .title {
        padding-top: 50px;
      }
    }
    @media only screen and (max-width: 600px) {
      :host {
        display: block;
        box-sizing: border-box;
      }
      .title {
        padding-top: 50px;
      }
      .table {
        overflow-x: auto;
        resize: none;
        width: 100%;
      }
      .theme {
        min-width: calc(100% - 50px);
      }
      .row {
        width: 100vw;
      }
    }
  `;

  protected override render(): TemplateResult {
    return html`
      <div class="page">
        <sp-theme class="theme" system="spectrum" color="light" scale="medium">
          <div class="container">
            <div
              class="title spectrum-Typography spectrum-Heading--sizeXXL spectrum-Heading--serif"
            >
              Getting started
            </div>
            <p class="text spectrum-Typography spectrum-Heading--sizeXXL">
              Other than the web version of the token diff generator, there is
              also a npm package containing the CLI and standalone Javascript
              library that you can use in your development environment. Both the
              CLI and the standalone Javascript library are located in the
              Spectrum Tokens monorepo.
            </p>
          </div>
          <div class="container">
            <div
              class="subtitle spectrum-Typography spectrum-Heading--sizeXL spectrum-Heading--serif"
            >
              Installation
            </div>
            <p class="text spectrum-Typography spectrum-Heading--sizeXXL">
              Installing the package is done preferably with pnpm, but npm or
              yarn will also work.
            </p>
            <div class="ending-panel">
              <code-panel
                class="section"
                codeSnippet="i @adobe/token-diff-generator"
                .tagOptions=${['pnpm', 'npm', 'yarn']}
              ></code-panel>
            </div>
          </div>
          <div class="container">
            <div
              class="subtitle spectrum-Typography spectrum-Heading--sizeXXL spectrum-Heading--serif"
            >
              Imports
            </div>
            <p class="text spectrum-Typography spectrum-Heading--sizeXXL">
              Import the token diff generator as a module per ES6 standards.
            </p>
            <div class="ending-panel">
              <code-panel
                class="section"
                codeSnippet="import tokenDiff from '@adobe/token-diff-generator';"
                .tagOptions=${[]}
              ></code-panel>
            </div>
          </div>
          <div class="container">
            <div
              class="subtitle spectrum-Typography spectrum-Heading--sizeXXL spectrum-Heading--serif"
            >
              Token diff generator library
            </div>
            <p class="text spectrum-Typography spectrum-Heading--sizeXXL">
              The token diff generator library holds the functions used to
              generate diffs between two compilations of design tokens. It uses
              the deep-object-diff open-source library to extract a JSON object
              containing the changes, and then runs that JSON object through
              various functions to tailor the result specifically for design
              tokens. <br /><br />
              An example of tailoring involves detecting when tokens are
              renamed. The deep-object-diff library is unable to tell whether or
              not a token has been renamed due to it being designed for general
              JSON objects. Instead, it will mark the new name as a new token
              being added to the schema and the old name as a deleted token.
              This is where the token diff generator comes in. It goes through
              the changes detected by deep-object-diff and checks if a token is
              renamed via its uuid. <br /><br />
              Since the token diff generator relies on all tokens having their
              own uuid, the library—including the CLI and web version—will not
              work for versions of spectrum-tokens before the
              @adobe/spectrum-tokens@12.26.0 release.
            </p>
          </div>
          <div class="container">
            <div
              class="subtitle spectrum-Typography spectrum-Heading--sizeXXL spectrum-Heading--serif"
            >
              Usage examples
            </div>
            <p class="text spectrum-Typography spectrum-Heading--sizeXXL">
              The most basic usage case is calling tokenDiff with two JSON
              objects, one for the original token(s) and the other for the
              updated token(s).
            </p>
            <code-panel
              class="section"
              codeSnippet="import tokenDiff from “@adobe/token-diff-generator”;

const report = tokenDiff(originalSchema, updatedSchema);"
              .tagOptions=${[]}
            ></code-panel>
            <p class="text spectrum-Typography spectrum-Heading--sizeXXL">
              If you are interested in comparing tokens locally between
              different versions or branches, you can use the following code
              snippet.
            </p>
            <code-panel
              class="section"
              codeSnippet="import tokenDiff from “@adobe/token-diff-generator”;
import fileImport from “@adobe/token-diff-generator”;

const [originalSchema, updatedSchema] = await Promise.all([
              fileImport(tokenNames, originalVersion, originalBranch),
              fileImport(tokenNames, updatedVersion, updatedBranch),
            ]);

const report = tokenDiff(originalSchema, updatedSchema);"
              .tagOptions=${[]}
            ></code-panel>
            <p class="text spectrum-Typography spectrum-Heading--sizeXXL">
              Both of these examples output a JSON object containing the changes
              made between the two schema.
            </p>
          </div>
          <div class="container">
            <div
              class="subtitle spectrum-Typography spectrum-Heading--sizeXXL spectrum-Heading--serif"
            >
              Token diff cli
            </div>
            <p class="text spectrum-Typography spectrum-Heading--sizeXXL">
              The token diff cli is a command line interface tool used to
              generate reports in the terminal with data from the token diff
              generator. It is included in the same package as the standalone
              Javascript library and uses the commander open-source library.
            </p>
          </div>
          <div class="container">
            <div
              class="subtitle spectrum-Typography spectrum-Heading--sizeXXL spectrum-Heading--serif"
            >
              Commands
            </div>
            <p class="text spectrum-Typography spectrum-Heading--sizeXXL">
              There currently is only one command to run in the CLI. It
              generates a diff report for two inputted schema.
            </p>
            <div class="ending-panel">
              <code-panel
                class="section"
                codeSnippet="tdiff report"
                .tagOptions=${[]}
              ></code-panel>
            </div>
          </div>
          <div class="container">
            <div
              class="subtitle spectrum-Typography spectrum-Heading--sizeXXL spectrum-Heading--serif"
            >
              Options
            </div>
            <div class="table">
              <sp-table class="row" quiet density="compact">
                <sp-table-head class="row">
                  <sp-table-head-cell>Shorthand</sp-table-head-cell>
                  <sp-table-head-cell>Name</sp-table-head-cell>
                  <sp-table-head-cell>Argument(s)</sp-table-head-cell>
                  <sp-table-head-cell>Description</sp-table-head-cell>
                </sp-table-head>
                <sp-table-body>
                  <sp-table-row class="row">
                    <sp-table-cell><code>-y</code></sp-table-cell>
                    <sp-table-cell><code>-y</code></sp-table-cell>
                    <sp-table-cell><code>null</code></sp-table-cell>
                    <sp-table-cell
                      >answers yes to removing deprecated status of
                      token(s)</sp-table-cell
                    >
                  </sp-table-row>
                  <sp-table-row class="row">
                    <sp-table-cell><code>-otv</code></sp-table-cell>
                    <sp-table-cell
                      ><code>--old-token-version</code></sp-table-cell
                    >
                    <sp-table-cell
                      ><code>${`<oldVersion>`}</code></sp-table-cell
                    >
                    <sp-table-cell
                      >npm package version/github tag to pull old tokens
                      from</sp-table-cell
                    >
                  </sp-table-row>
                  <sp-table-row class="row">
                    <sp-table-cell><code>-ntv</code></sp-table-cell>
                    <sp-table-cell
                      ><code>--new-token-version</code></sp-table-cell
                    >
                    <sp-table-cell
                      ><code>${`<newVersion>`}</code></sp-table-cell
                    >
                    <sp-table-cell
                      >npm package version/github tag to pull new tokens
                      from</sp-table-cell
                    >
                  </sp-table-row>
                  <sp-table-row class="row">
                    <sp-table-cell><code>-otb</code></sp-table-cell>
                    <sp-table-cell
                      ><code>--old-token-branch</code></sp-table-cell
                    >
                    <sp-table-cell><code>${`<oldBranch>`}</code></sp-table-cell>
                    <sp-table-cell
                      >branch to fetch old token data from</sp-table-cell
                    >
                  </sp-table-row>
                  <sp-table-row class="row">
                    <sp-table-cell><code>-ntb</code></sp-table-cell>
                    <sp-table-cell
                      ><code>--new-token-branch</code></sp-table-cell
                    >
                    <sp-table-cell><code>${`<newBranch>`}</code></sp-table-cell>
                    <sp-table-cell
                      >branch to fetch new token data from</sp-table-cell
                    >
                  </sp-table-row>
                  <sp-table-row class="row">
                    <sp-table-cell><code>-t</code></sp-table-cell>
                    <sp-table-cell><code>--test</code></sp-table-cell>
                    <sp-table-cell><code>${`<tokens...>`}</code></sp-table-cell>
                    <sp-table-cell
                      >indicates test mode and runs only on tokens passed
                      in</sp-table-cell
                    >
                  </sp-table-row>
                  <sp-table-row class="row">
                    <sp-table-cell><code>-tn</code></sp-table-cell>
                    <sp-table-cell><code>--token-names</code></sp-table-cell>
                    <sp-table-cell><code>${`<tokens...>`}</code></sp-table-cell>
                    <sp-table-cell
                      >indicates specific tokens to compare</sp-table-cell
                    >
                  </sp-table-row>
                </sp-table-body>
              </sp-table>
            </div>
          </div>
          <div class="container">
            <div
              class="subtitle spectrum-Typography spectrum-Heading--sizeXXL spectrum-Heading--serif"
            >
              Usage examples
            </div>
            <p class="text spectrum-Typography spectrum-Heading--sizeXXL">
              An example of using the cli involves running the
              <code class="spectrum-Code spectrum-Code--sizeXS">report</code>
              command with two branches and/or releases.
            </p>
            <div class="section">
              <code-panel
                codeSnippet="tdiff report -otb shirlsli/diff-generator-cli-tests -ntb shirlsli/file-import-tests"
                .tagOptions=${[]}
              >
              </code-panel>
            </div>
            <div class="section">
              <code-panel
                class="section"
                codeSnippet="tdiff report -otv @adobe/spectrum-tokens@12.26.0 -ntv @adobe/spectrum-tokens@12.26.0"
                .tagOptions=${[]}
              >
              </code-panel>
            </div>
            <div class="section">
              <code-panel
                class="section"
                codeSnippet="tdiff report -otv @adobe/spectrum-tokens@12.26.0 -ntb shirlsli/file-import-tests"
                .tagOptions=${[]}
              >
              </code-panel>
            </div>
            <div class="section">
              <code-panel
                class="section"
                codeSnippet="tdiff report -otb shirlsli/diff-generator-cli-tests -ntv @adobe/spectrum-tokens@12.26.0"
                .tagOptions=${[]}
              >
              </code-panel>
            </div>
          </div>
        </sp-theme>
      </div>
    `;
  }
}
