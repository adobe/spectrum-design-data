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
import '@spectrum-web-components/action-group/sp-action-group.js';
import '@spectrum-web-components/action-button/sp-action-button.js';
import '@spectrum-web-components/picker/sp-picker.js';
import '@spectrum-web-components/menu/sp-menu-item.js';
import '@spectrum-web-components/field-label/sp-field-label.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-branch-circle.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-box.js';
import '@spectrum-web-components/theme/sp-theme.js';
import '@spectrum-web-components/theme/src/themes.js';
import { property } from 'lit/decorators.js';
import {
  fetchBranchTagOptions,
  fetchSchemaOptions,
} from './fetchFromGithub.js';

export class CompareCard extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 25px;
      color: var(--token-diff-text-color, #000);
    }
    .card {
      display: inline-block;
      width: 391px;
      flex-direction: column;
      align-items: flex-start;
      border-radius: 4px;
      border: 1px solid var(--Palette-gray-200, #e6e6e6);
      background: var(--Alias-background-app-frame-layer-2, #fff);
    }
    .label {
      color: var(
        --Alias-content-typography-heading,
        var(--Alias-content-typography-heading, #000)
      );
      font-size: 14px;
      font-style: normal;
      font-weight: 700;
      line-height: 18px; /* 128.571% */
    }
    .container {
      padding: 24px;
    }
    .section {
      margin-bottom: 15px;
    }
    .picker-item {
      display: flex;
      height: fit-content;
      margin: 0;
    }
    img {
      vertical-align: middle;
      margin-right: 5px;
    }
    .picker {
      width: 341px;
    }
    @media only screen and (max-width: 480px) {
      .card {
        width: 280px;
      }
      .picker {
        width: 218px;
      }
      :host {
        padding-left: 0;
        padding-right: 0;
      }
    }
  `;

  static properties = {
    heading: { type: String },
    toggle: { type: String },
    icon: { type: String },
    branchTagOptions: { type: Array },
    schemaOptions: { type: Array },
    branchOrTag: { type: String },
    schema: { type: String },
  };

  constructor(heading: string) {
    super();
    this.heading = heading;
  }

  async firstUpdated() {
    this.branchOptions = await fetchBranchTagOptions('branch');
    this.tagOptions = await fetchBranchTagOptions('tag');
    const currentUrl = window.location.href;
    const firstQuestionMark = currentUrl.indexOf('?');
    if (firstQuestionMark > 0) {
      const parameters = currentUrl.substring(firstQuestionMark + 1);
      const paramSplit = parameters.split('&');
      if (this.heading === 'Version A') {
        this.branchOrTag = paramSplit[0]
          .substring(paramSplit[0].indexOf('=') + 1)
          .replaceAll('%20', ' ')
          .replaceAll('%40', '@');
        this.schema = paramSplit[2]
          .substring(paramSplit[2].indexOf('=') + 1)
          .replaceAll('%20', ' ')
          .replaceAll('%40', '@');
      } else {
        this.branchOrTag = paramSplit[1]
          .substring(paramSplit[1].indexOf('=') + 1)
          .replaceAll('%20', ' ')
          .replaceAll('%40', '@');
        this.schema = paramSplit[3]
          .substring(paramSplit[3].indexOf('=') + 1)
          .replaceAll('%20', ' ')
          .replaceAll('%40', '@');
      }
      this.toggle = this.branchOptions.includes(this.branchOrTag)
        ? 'Github branch'
        : 'Package release';
    }
    if (this.toggle === 'Github branch') {
      this.toggle = 'Github branch';
      this.branchSchemaOptions = await fetchSchemaOptions(
        'branch',
        this.branchOrTag,
      );
      this.tagSchemaOptions = await fetchSchemaOptions(
        'tag',
        this.tagOptions[0],
      );
      const branchToggle = this.shadowRoot?.getElementById('branch-toggle');
      if (branchToggle) {
        branchToggle.setAttribute('selected', '');
      }
    } else {
      this.toggle = 'Package release';
      this.branchSchemaOptions = await fetchSchemaOptions(
        'branch',
        this.branchOptions[0],
      );
      this.tagSchemaOptions = await fetchSchemaOptions('tag', this.branchOrTag);
      const tagToggle = this.shadowRoot?.getElementById('tag-toggle');
      if (tagToggle) {
        tagToggle.setAttribute('selected', '');
      }
    }
  }

  __setGithubBranchToggle() {
    this.toggle = 'Github branch';
    this.branchOrTag = this.branchOptions[0];
    this.__handleSelection(this.branchOptions[0]);
    this.__handleSelection(this.branchSchemaOptions[0]);
  }

  __setReleaseToggle() {
    this.toggle = 'Package release';
    this.branchOrTag = this.tagOptions[0];
    this.__handleSelection(this.tagOptions[0]);
    this.__handleSelection(this.tagSchemaOptions[0]);
  }

  __createMenuItem(options: string[], showIcons: boolean) {
    return options.map(
      option => html`
        <sp-menu-item
          value=${option}
          @click=${() => {
            if (showIcons) {
              this.branchOrTag = option;
              this.__handleSelection(this.branchOrTag);
            } else {
              this.schema = option;
              this.__handleSelection(this.schema);
            }
          }}
        >
          ${this.__addIcon(option, showIcons)}
        </sp-menu-item>
      `,
    );
  }

  __addIcon(option: string, showIcons: boolean) {
    if (showIcons && this.toggle === 'Github branch') {
      return html`<sp-icon-branch-circle slot="icon"></sp-icon-branch-circle>
        ${option}`;
    } else if (showIcons && this.toggle === 'Package release') {
      return html`<sp-icon-box slot="icon"></sp-icon-box> ${option}`;
    }
    return html`${option}`;
  }

  async __handleSelection(option: string) {
    let detailObj = {};
    if (
      this.toggle === 'Github branch' &&
      !this.branchSchemaOptions.includes(option)
    ) {
      detailObj = { branch: option };
    } else if (
      this.toggle === 'Package release' &&
      !this.tagSchemaOptions.includes(option)
    ) {
      detailObj = { tag: option };
    } else {
      detailObj = { schema: option };
    }
    let options = {
      detail: detailObj,
      bubbles: true,
      composed: true,
    };
    this.dispatchEvent(new CustomEvent('selection', options));
  }

  @property({ type: String }) heading = 'Version A';

  @property({ type: String }) toggle = 'Github branch';

  @property({ type: Array }) branchOptions: string[] = [];

  @property({ type: Array }) tagOptions: string[] = [];

  @property({ type: Array }) branchSchemaOptions: string[] = [];

  @property({ type: Array }) tagSchemaOptions: string[] = [];

  @property({ type: String }) branchOrTag = 'beta';

  @property({ type: String }) schema = 'all';

  protected override render(): TemplateResult {
    return html`
      <div class="card">
        <div class="container">
          <div class="label section">${this.heading}</div>
          <sp-theme system="spectrum" scale="medium" color="light">
            <sp-action-group compact selects="single" class="section">
              <sp-action-button
                toggles
                @click=${this.__setGithubBranchToggle}
                id="branch-toggle"
              >
                Github branch
              </sp-action-button>
              <sp-action-button
                toggles
                @click=${this.__setReleaseToggle}
                id="tag-toggle"
              >
                Package release
              </sp-action-button>
            </sp-action-group>
            <sp-picker
              class="picker section"
              label=${this.toggle === 'Github branch'
                ? this.branchOptions[
                    this.branchOptions.indexOf(this.branchOrTag)
                  ]
                : this.tagOptions[this.tagOptions.indexOf(this.branchOrTag)]}
              value=${this.toggle === 'Github branch'
                ? this.branchOptions[
                    this.branchOptions.indexOf(this.branchOrTag)
                  ]
                : this.tagOptions[this.tagOptions.indexOf(this.branchOrTag)]}
            >
              ${this.toggle === 'Github branch'
                ? this.__createMenuItem(this.branchOptions, true)
                : this.__createMenuItem(this.tagOptions, true)}
            </sp-picker>
            <sp-field-label for="schemaSelection" size="m"
              >Token File</sp-field-label
            >
            <sp-picker
              class="picker"
              label=${this.toggle === 'Github branch'
                ? this.branchSchemaOptions[
                    this.branchSchemaOptions.indexOf(this.schema)
                  ]
                : this.tagSchemaOptions[
                    this.tagSchemaOptions.indexOf(this.schema)
                  ]}
              value=${this.toggle === 'Github branch'
                ? this.branchSchemaOptions[
                    this.branchSchemaOptions.indexOf(this.schema)
                  ]
                : this.tagSchemaOptions[
                    this.tagSchemaOptions.indexOf(this.schema)
                  ]}
              id="schema-picker"
            >
              ${this.toggle === 'Github branch'
                ? this.__createMenuItem(this.branchSchemaOptions, false)
                : this.__createMenuItem(this.tagSchemaOptions, false)}
            </sp-picker>
          </sp-theme>
        </div>
      </div>
    `;
  }
}
