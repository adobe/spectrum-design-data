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
import { property } from 'lit/decorators.js';
import '@spectrum-web-components/theme/sp-theme.js';
import '@spectrum-web-components/theme/src/themes.js';
import '@spectrum-web-components/card/sp-card.js';
import '@spectrum-web-components/button/sp-button.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-compare.js';
import './compare-card.js';
import './DiffReport.js';
import './diff-report.js';
import { DiffReport } from './DiffReport.js';
import { githubAPIKey } from '../github-api-key.js';
// import { tokenDiff } from '@adobe/token-diff-generator/src/lib/index.js';

export class TokenDiff extends LitElement {
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
    .warning-text {
      color: #222;
      font-size: 18px;
      font-style: normal;
      font-weight: 400;
      line-height: 27px; /* 150% */
      margin-bottom: 40px;
    }
    .page {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
    }
    .compare-button {
      margin-top: 40px;
      margin-bottom: 65px;
    }
    @media only screen and (max-width: 1100px) {
      :host {
        overflow-x: auto;
      }
      .page {
        padding-left: 0;
        padding-right: 0;
      }
      .title {
        padding-top: 50px;
      }
    }
  `;

  @property({ type: String }) originalBranchOrTag = '';
  @property({ type: String }) updatedBranchOrTag = '';
  @property({ type: String }) originalSchema = '';
  @property({ type: String }) updatedSchema = '';
  @property({ type: String }) originalVers = '';
  @property({ type: String }) updatedVers = '';
  @property({ type: Array }) branchOptions: string[] = [];
  @property({ type: Array }) tagOptions: string[] = [];
  @property({ type: Array }) branchSchemaOptions: string[] = [];
  @property({ type: Array }) tagSchemaOptions: string[] = [];

  __originalCardListener(e: CustomEvent) {
    this.__updatedProperty(true, e.detail);
  }

  __updatedProperty(original: boolean, newValue: string) {
    const key = Object.keys(newValue)[0];
    if (original) {
      if (key !== 'schema') {
        this.originalBranchOrTag = Object.values(newValue)[0];
        this.originalVers = key === 'branch' ? 'branch' : 'tag';
      } else {
        this.originalSchema = Object.values(newValue)[0];
      }
    } else {
      if (key !== 'schema') {
        this.updatedBranchOrTag = Object.values(newValue)[0];
        this.updatedVers = key === 'branch' ? 'branch' : 'tag';
      } else {
        this.updatedSchema = Object.values(newValue)[0];
      }
    }
  }

  __updatedCardListener(e: CustomEvent) {
    this.__updatedProperty(false, e.detail);
  }

  __generateReport() {
    // call token diff generator library
    const report = this.shadowRoot?.getElementById('report')!;
    if (report.firstChild) {
      report.removeChild(report.firstChild);
    }
    const diffReport = document.createElement('diff-report') as DiffReport;
    diffReport.tokenDiffJSON = this.jsonObj;
    diffReport.originalBranchOrTag = this.originalBranchOrTag;
    diffReport.updatedBranchOrTag = this.updatedBranchOrTag;
    diffReport.originalSchema = this.originalSchema;
    diffReport.updatedSchema = this.updatedSchema;
    let url = new URL(
      'http://localhost:8000' +
        '/demo?original_branch_tag=' +
        this.originalBranchOrTag +
        '&updated_branch_tag=' +
        this.updatedBranchOrTag +
        '&original_schema=' +
        this.originalSchema +
        '&updated_schema=' +
        this.updatedSchema,
    );
    diffReport.url = url.href;
    if (report) {
      report.appendChild(diffReport);
      let options = {
        detail: url.href,
        bubbles: true,
        composed: true,
      };
      this.dispatchEvent(new CustomEvent('urlChange', options));
      window.history.pushState(this.jsonObj, 'Report', url.href);
    }
  }

  async __fetchBranchTagOptions(type: string) {
    const url =
      type === 'branch'
        ? 'https://api.github.com/repos/adobe/spectrum-tokens/branches'
        : 'https://api.github.com/repos/adobe/spectrum-tokens/releases';
    return await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `token ${githubAPIKey}`,
      },
    }).then(async response => {
      const arr: any[] | PromiseLike<any[]> = [];
      const obj = await response.json();
      Object.values(obj).forEach((value: any) => {
        arr.push(value.name);
      });
      return arr;
    });
  }

  async __fetchSchemaOptions(branchOrTagKey: string, branchOrTag: string) {
    let schemaOptions = [];
    const source = 'https://raw.githubusercontent.com/adobe/spectrum-tokens/';
    let branchOrTagArr = branchOrTag.split('@');
    const url =
      branchOrTagKey !== 'branch'
        ? source +
          '%40adobe/spectrum-tokens%40' +
          branchOrTagArr[branchOrTagArr.length - 1]
        : source + branchOrTag;
    schemaOptions = await this.__fetchTokens('manifest.json', url);
    schemaOptions.unshift('all');
    return schemaOptions;
  }

  async __fetchTokens(tokenName: string, url: string) {
    return (await fetch(`${url}/packages/tokens/${tokenName}`)).json();
  }

  async firstUpdated() {
    const currentUrl = window.location.href;
    const firstQuestionMark = currentUrl.indexOf('?');
    this.branchOptions = await this.__fetchBranchTagOptions('branch');
    this.branchSchemaOptions = await this.__fetchSchemaOptions(
      'branch',
      this.branchOptions[0],
    );
    if (firstQuestionMark > 0) {
      const parameters = currentUrl.substring(firstQuestionMark + 1);
      const paramSplit = parameters.split('&');
      this.originalBranchOrTag = paramSplit[0]
        .substring(paramSplit[0].indexOf('=') + 1)
        .replaceAll('%20', ' ')
        .replaceAll('%40', '@');
      this.originalVers = this.branchOptions.includes(this.originalBranchOrTag)
        ? 'branch'
        : 'tag';
      this.updatedBranchOrTag = paramSplit[1]
        .substring(paramSplit[1].indexOf('=') + 1)
        .replaceAll('%20', ' ')
        .replaceAll('%40', '@');
      this.updatedVers = this.branchOptions.includes(this.updatedBranchOrTag)
        ? 'branch'
        : 'tag';
      this.originalSchema = paramSplit[2]
        .substring(paramSplit[2].indexOf('=') + 1)
        .replaceAll('%20', ' ')
        .replaceAll('%40', '@');
      this.updatedSchema = paramSplit[3]
        .substring(paramSplit[3].indexOf('=') + 1)
        .replaceAll('%20', ' ')
        .replaceAll('%40', '@');
      this.__generateReport();
    } else {
      this.originalBranchOrTag = this.updatedBranchOrTag =
        this.branchOptions[0];
      this.originalSchema = this.updatedSchema = this.branchSchemaOptions[0];
    }
    this.tagOptions = await this.__fetchBranchTagOptions('tag');
    this.tagSchemaOptions = await this.__fetchSchemaOptions(
      'tag',
      this.tagOptions[0].substring(1),
    );
    this.originalVers = this.branchOptions.includes(this.originalBranchOrTag)
      ? 'branch'
      : 'tag';
    this.updatedVers = this.branchOptions.includes(this.updatedBranchOrTag)
      ? 'branch'
      : 'tag';
  }

  @property({ type: Object }) jsonObj = {
    added: {
      'i-like-pizza': {
        component: 'table',
        $schema:
          'https://opensource.adobe.com/spectrum-tokens/schemas/token-types/opacity.json',
        value: '0.07',
        uuid: '1234',
      },
      'hi-how-are-you': {
        component: 'color-handle',
        $schema:
          'https://opensource.adobe.com/spectrum-tokens/schemas/token-types/opacity.json',
        value: '0.42',
        uuid: '234',
      },
    },
    deleted: {
      'floating-action-button-drop-shadow-color': undefined,
      'floating-action-button-shadow-color': undefined,
      'table-selected-row-background-opacity-non-emphasized-hover': undefined,
      'table-selected-row-background-opacity-non-emphasized': undefined,
    },
    deprecated: {
      'color-slider-border-color': {
        deprecated: true,
        deprecated_comment: 'insert random deprecated comment',
      },
      'color-loupe-outer-border': {
        deprecated: true,
        deprecated_comment: 'insert random deprecated comment',
      },
    },
    reverted: {
      'color-handle-drop-shadow-color': {
        deprecated: undefined,
        deprecated_comment: undefined,
      },
    },
    renamed: {
      'i-like-ice-cream': {
        'old-name': 'color-area-border-color',
      },
      'i-like-char-siu': {
        'old-name': 'color-handle-inner-border-color',
      },
    },
    updated: {
      added: {},
      deleted: {},
      renamed: {},
      updated: {
        'thumbnail-border-color': {
          $schema: {
            'new-value':
              'https://opensource.adobe.com/spectrum-tokens/schemas/token-types/not-a-thumbnail.json',
            'original-value':
              'https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json',
            path: '$schema',
          },
        },
        'opacity-checkerboard-square-dark': {
          sets: {
            light: {
              value: {
                'new-value': '{gray-500}',
                'original-value': '{gray-200}',
                path: 'sets.light.value',
              },
            },
            darkest: {
              value: {
                'new-value': '{gray-900}',
                'original-value': '{gray-800}',
                path: 'sets.darkest.value',
              },
            },
          },
        },
        'color-slider-border-opacity': {
          component: {
            'new-value': 'not-a-color-slider',
            'original-value': 'color-slider',
            path: 'component',
          },
        },
        'color-loupe-inner-border': {
          uuid: {
            'new-value': 'if a uuid ever change lol',
            'original-value': 'd2c4cb48-8a90-461d-95bc-d882ba01472b',
            path: 'uuid',
          },
        },
        'drop-zone-background-color': {
          component: {
            'new-value': 'woohoo!',
            'original-value': 'drop-zone',
            path: 'component',
          },
          value: {
            'new-value': '{fushcia pink}',
            'original-value': '{accent-visual-color}',
            path: 'value',
          },
        },
      },
    },
  };

  protected override render(): TemplateResult {
    return html`
      <div>
        <sp-theme theme="spectrum" color="light" scale="medium">
          <div
            class="title spectrum-Typography spectrum-Heading--sizeXXL spectrum-Heading--serif"
          >
            Token diff generator
          </div>
          <div class="warning-text">
            WARNING: Will either be inaccurate or will throw an error if used
            for releases or branches that use tokens from before
            @adobe/spectrum-tokens@12.26.0!
          </div>
          <div class="page">
            <compare-card
              @selection=${this.__originalCardListener}
              heading="Version A"
              .branchOrTag=${this.originalBranchOrTag}
              .schema=${this.originalSchema}
              .toggle=${this.originalVers}
              .branchOptions=${this.branchOptions}
              .tagOptions=${this.tagOptions}
              .branchSchemaOptions=${this.branchSchemaOptions}
              .tagSchemaOptions=${this.tagSchemaOptions}
            ></compare-card>
            <compare-card
              @selection=${this.__updatedCardListener}
              heading="Version B"
              .branchOrTag=${this.updatedBranchOrTag}
              .schema=${this.updatedSchema}
              .toggle=${this.updatedVers}
              .branchOptions=${this.branchOptions}
              .tagOptions=${this.tagOptions}
              .branchSchemaOptions=${this.branchSchemaOptions}
              .tagSchemaOptions=${this.tagSchemaOptions}
            ></compare-card>
          </div>
          <div class="page compare-button">
            <sp-button
              @click=${this.__generateReport}
              variant="accent"
              size="m"
            >
              <sp-icon-compare slot="icon"></sp-icon-compare>
              Compare
            </sp-button>
          </div>
          <div id="report"></div>
        </sp-theme>
      </div>
    `;
  }
}
