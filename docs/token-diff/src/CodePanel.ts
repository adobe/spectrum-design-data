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
import '@spectrum-web-components/tabs/sp-tabs.js';
import '@spectrum-web-components/tabs/sp-tab.js';
import '@spectrum-web-components/tabs/sp-tab-panel.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-copy.js';
import '@spectrum-web-components/toast/sp-toast.js';

export class CodePanel extends LitElement {
  static styles = css`
    :host {
      color: var(--token-diff-text-color, #000);
      top: 0;
      overflow-x: auto;
      margin-left: auto;
      margin-right: auto;
      flex-wrap: wrap;
    }
    .page {
      background-color: #f8f8f8;
      border-radius: 10px;
      padding: 10px 25px;
    }
    code {
      display: block;
      left: 0;
      text-align: left;
      flex-wrap: wrap;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    sp-toast {
      position: fixed;
      top: 1em;
      right: 1em;
    }
    pre {
      margin-bottom: 10px;
    }
    .copy-button {
      display: flex;
      float: right;
      margin-left: auto;
    }
    .theme {
      margin-left: auto;
      display: flex;
      align-items: flex-end;
    }
  `;

  constructor(codeSnippet: string, tagOptions: string[]) {
    super();
    this.codeSnippet = codeSnippet;
    this.tagOptions = tagOptions;
  }

  @property({ type: String }) codeSnippet = '';
  @property({ type: Array }) tagOptions: string[] = [];
  @property({ type: String }) copyMessage = 'Copy to clipboard';
  @property({ type: String }) curTab = '';

  firstUpdated() {
    this.codeSnippet = this.codeSnippet.trim();
    if (this.tagOptions.length > 0) {
      this.curTab = this.tagOptions[0];
    }
  }

  __addTabs() {
    return html`
      <sp-tabs id="tabs" selected=${this.tagOptions[0]} quiet>
        ${this.tagOptions.map(label => {
          return this.__newTab(label);
        })}
        ${this.tagOptions.map(label => {
          return this.__newPanel(label);
        })}
      </sp-tabs>
    `;
  }

  __newTab(label: string) {
    return html`
      <sp-tab
        label=${label}
        value=${label}
        @click=${() => (this.curTab = label)}
      ></sp-tab>
    `;
  }

  __newPanel(label: string) {
    return html`
      <sp-tab-panel value=${label}>
        ${this.__regularCodeSnippetDisplay(`${label} ${this.codeSnippet}`)}
      </sp-tab-panel>
    `;
  }

  __regularCodeSnippetDisplay(code: string) {
    return html`
      <pre><code class="spectrum-Code spectrum-Code--sizeM">${code}</code></pre>
    `;
  }

  __copySnippet() {
    if (this.tagOptions !== undefined) {
      navigator.clipboard.writeText(this.curTab + ' ' + this.codeSnippet);
    } else {
      navigator.clipboard.writeText(this.codeSnippet);
    }
  }

  protected override render(): TemplateResult {
    return html`
      <div class="page">
        <div>
          ${this.tagOptions.length > 0
            ? this.__addTabs()
            : this.__regularCodeSnippetDisplay(this.codeSnippet)}
        </div>
        <div>
          <sp-theme
            class="theme"
            system="spectrum"
            scale="medium"
            color="light"
          >
            <sp-overlay trigger="trigger@click" type="auto">
              <sp-toast open variant="info">
                The code snippet has been copied to your clipboard!
              </sp-toast>
            </sp-overlay>
            <sp-action-button
              class="copy-button"
              quiet
              @click=${this.__copySnippet}
              id="trigger"
            >
              <sp-icon-copy slot="icon"></sp-icon-copy>
              ${this.copyMessage}
            </sp-action-button>
          </sp-theme>
        </div>
      </div>
    `;
  }
}
