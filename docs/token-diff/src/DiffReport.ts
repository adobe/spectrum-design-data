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
import '@spectrum-web-components/icons-workflow/icons/sp-icon-share.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-copy.js';
import '@spectrum-web-components/toast/sp-toast.js';
import './compare-card.js';

interface TokenDiffJSON {
  renamed: any;
  deprecated: any;
  reverted: any;
  added: any;
  deleted: any;
  updated: {
    added: any;
    deleted: any;
    updated: any;
    renamed: any;
  };
}

export class DiffReport extends LitElement {
  static styles = css`
    :host {
      display: flex;
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
    h1 {
      margin-top: 0;
    }
    h2 {
      color: #000;
      font-size: 20px;
      font-style: normal;
      font-weight: 600;
      line-height: 40px;
      line-height: 66.7px;
      margin-top: 30px;
    }
    h3 {
      color: #000;
      font-size: 18px;
      font-style: normal;
      font-weight: 600;
      line-height: 40px;
      padding-left: 20px;
    }
    sp-toast {
      position: fixed;
      top: 1em;
      right: 1em;
    }
    .theme {
      width: 100%;
    }
    .report-text {
      color: #222;
      padding-left: 20px;
      font-size: 14px;
    }
    .page {
      display: flex;
      flex-wrap: wrap;
      background-color: #f8f8f8;
      padding-top: 25px;
      padding-bottom: 25px;
      padding-left: 50px;
      padding-right: 50px;
      border-radius: 10px;
      margin-bottom: 15px;
      width: 100%;
      height: fit-content;
    }
    .share-header {
      display: inline-block;
      align-items: flex-end;
      width: 100%;
    }
    .share-button {
      display: flex;
      float: right;
    }
    #reportBody {
      max-width: inherit;
      overflow-x: wrap;
    }
    .updated-section {
      flex-wrap: wrap;
    }
    @media only screen and (max-width: 600px) {
      .page {
        padding-left: 25px;
        padding-right: 25px;
      }
      h1 {
        margin-top: 15px;
      }
      h2 {
        font-size: 18px;
      }
      h3 {
        font-size: 16px;
      }
    }
  `;

  constructor(
    tokenDiffJSON: TokenDiffJSON,
    originalBranchOrTag: string,
    originalSchema: string,
    updatedBranchOrTag: string,
    updatedSchema: string,
    url: string,
  ) {
    super();
    this.tokenDiffJSON = tokenDiffJSON;
    this.originalBranchOrTag = originalBranchOrTag;
    this.originalSchema = originalSchema;
    this.updatedBranchOrTag = updatedBranchOrTag;
    this.updatedSchema = updatedSchema;
    this.url = url;
  }

  firstUpdated() {
    this.totalTokens =
      Object.keys(this.tokenDiffJSON.renamed).length +
      Object.keys(this.tokenDiffJSON.deprecated).length +
      Object.keys(this.tokenDiffJSON.reverted).length +
      Object.keys(this.tokenDiffJSON.added).length +
      Object.keys(this.tokenDiffJSON.deleted).length +
      Object.keys(this.tokenDiffJSON.updated.added).length +
      Object.keys(this.tokenDiffJSON.updated.deleted).length +
      Object.keys(this.tokenDiffJSON.updated.updated).length +
      Object.keys(this.tokenDiffJSON.updated.renamed).length;
    this.totalUpdatedTokens =
      Object.keys(this.tokenDiffJSON.updated.added).length +
      Object.keys(this.tokenDiffJSON.updated.deleted).length +
      Object.keys(this.tokenDiffJSON.updated.updated).length +
      Object.keys(this.tokenDiffJSON.updated.renamed).length;
  }

  @property() tokenDiffJSON: any = {
    renamed: {},
    deprecated: {},
    reverted: {},
    added: {},
    deleted: {},
    updated: {
      added: {},
      deleted: {},
      updated: {},
      renamed: {},
    },
  };

  @property({ type: Number }) totalTokens = 0;
  @property({ type: String }) originalBranchOrTag = '';
  @property({ type: String }) originalSchema = '';
  @property({ type: String }) updatedBranchOrTag = '';
  @property({ type: String }) updatedSchema = '';
  @property({ type: String }) url = '';
  @property({ type: Number }) totalUpdatedTokens = 0;

  readonly order: any = [
    'renamed',
    'deprecated',
    'reverted',
    'added',
    'deleted',
    'updated',
  ];
  readonly emojis: any = ['📝', '🕒', '⏰', '🔼', '🔽', '🆕'];

  readonly orderForUpdatedSection: any = [
    'renamed',
    'added',
    'deleted',
    'updated',
  ];

  __createArrowItems(original: string, updated: string) {
    return html`
      <p class="report-text">
        ${original.replace(/{|}/g, '')} -> ${updated.replace(/{|}/g, '')}
      </p>
    `;
  }

  __createItemsWithDescription(token: string, description: string) {
    return html` <p class="report-text">${token}: ${description}</p> `;
  }

  __createItems(token: string) {
    return html` <p class="report-text">${token.replace(/{|}/g, '')}</p> `;
  }

  __createEmbeddedItems(tokens: any) {
    return Object.keys(tokens).map((token: any) => {
      return html`
        <p class="report-text">${token}</p>
        <div class="report-text">
          ${this.__printNestedChanges(tokens[token])}
        </div>
      `;
    });
  }

  __printNestedChanges(token: any): any {
    if (token['path'] !== undefined) {
      return html`
        <p class="report-text">${token['path']}</p>
        <div class="report-text">${this.__determineChanges(token)}</div>
      `;
    }
    return Object.keys(token).map((property: any) => {
      return this.__printNestedChanges(token[property]);
    });
  }

  __determineChanges(token: any) {
    if (token['original-value'] === undefined) {
      return this.__createItems(
        token['path'].includes('$schema')
          ? `"${token['new-value']}"`
          : token['new-value'],
      );
    } else if (token['path'].includes('$schema')) {
      const newValue = token['new-value'].split('/');
      const originalPart = `"${token['original-value']}" ->`;
      const updatedPart =
        `"${token['new-value'].substring(0, token['new-value'].length - newValue[newValue.length - 1].length)}` +
        `${newValue[newValue.length - 1].split('.')[0]}` +
        `.${newValue[newValue.length - 1].split('.')[1]}"`;
      const part = html`${this.__createItems(originalPart)}
      ${this.__createItems(updatedPart)}`;
      return part;
    } else {
      return this.__createArrowItems(
        token['original-value'],
        token['new-value'],
      );
    }
  }

  __shareReport() {
    const currentUrl = window.location.href;
    if (currentUrl) {
      navigator.clipboard.writeText(currentUrl);
    }
  }

  __copyReport() {
    const reportBody = this.shadowRoot?.getElementById('reportBody');
    if (reportBody) {
      const textContent = reportBody.textContent;
      if (textContent) {
        navigator.clipboard.writeText(textContent);
      }
    }
  }

  protected override render(): TemplateResult {
    return html`
      <div class="page">
        <sp-theme class="theme" system="spectrum" color="light" scale="medium">
          <sp-overlay trigger="triggerShare@click" type="auto">
            <sp-toast open variant="info">
              The report url has been copied to your clipboard!
            </sp-toast>
          </sp-overlay>
          <sp-overlay trigger="triggerCopy@click" type="auto">
            <sp-toast open variant="info">
              The report's contents has been copied to your clipboard!
            </sp-toast>
          </sp-overlay>
          <div class="share-header">
            <sp-action-button
              class="share-button"
              quiet
              @click=${this.__shareReport}
              id="triggerShare"
            >
              <sp-icon-share slot="icon"></sp-icon-share>
              Share
            </sp-action-button>
            <sp-action-button
              class="share-button"
              quiet
              @click=${this.__copyReport}
              id="triggerCopy"
            >
              <sp-icon-copy slot="icon"></sp-icon-copy>
              Copy to clipboard
            </sp-action-button>
          </div>
          <div id="reportBody">
            <h1>Tokens Changed (${this.totalTokens})</h1>
            <p>${this.originalBranchOrTag} | ${this.updatedBranchOrTag}</p>
            <p>${this.originalSchema} | ${this.updatedSchema}</p>
            ${this.order.map((section: string, idx: number) => {
              this.totalUpdatedTokens =
                Object.keys(this.tokenDiffJSON.updated.added).length +
                Object.keys(this.tokenDiffJSON.updated.deleted).length +
                Object.keys(this.tokenDiffJSON.updated.updated).length +
                Object.keys(this.tokenDiffJSON.updated.renamed).length;
              let name: string;
              let totalTokens: number;
              if (section === 'deprecated') {
                name = 'Newly Deprecated';
              } else if (section === 'reverted') {
                name = 'Newly "Un-deprecated"';
              } else {
                name = `${section.charAt(0).toUpperCase()}${section.substring(1)}`;
              }
              totalTokens =
                section === 'updated'
                  ? this.totalUpdatedTokens
                  : Object.keys(this.tokenDiffJSON[section]).length;
              if (
                (section === 'updated' && this.totalUpdatedTokens > 0) ||
                (section !== 'updated' &&
                  Object.keys(this.tokenDiffJSON[section]).length > 0)
              ) {
                return html`
                  <div id="section">
                    <h2>${`${this.emojis[idx]} ${name} (${totalTokens})`}</h2>
                    ${Object.keys(this.tokenDiffJSON[section]).map(
                      (token: any) => {
                        switch (section) {
                          case 'renamed':
                            return this.__createArrowItems(
                              this.tokenDiffJSON.renamed[token]['old-name'],
                              token,
                            );
                          case 'deprecated':
                            return this.__createItemsWithDescription(
                              token,
                              this.tokenDiffJSON.deprecated[token][
                                'deprecated_comment'
                              ],
                            );
                          case 'updated':
                            break;
                          default:
                            return this.__createItems(token);
                        }
                      },
                    )}
                  </div>
                `;
              }
            })}
            <div class="updated-section">
              ${this.orderForUpdatedSection.map((name: any) => {
                if (Object.keys(this.tokenDiffJSON.updated[name]).length > 0) {
                  return html`
                    <div id=${name}>
                      <h3>
                        ${`${this.emojis[this.emojis.length - 1]} ${name.charAt(0).toUpperCase()}${name.substring(1)} Properties`}
                        (${Object.keys(this.tokenDiffJSON.updated[name])
                          .length})
                      </h3>
                      <div class="report-text">
                        ${this.__createEmbeddedItems(
                          this.tokenDiffJSON.updated[name],
                        )}
                      </div>
                    </div>
                  `;
                }
              })}
            </div>
          </div>
        </sp-theme>
      </div>
    `;
  }
}
