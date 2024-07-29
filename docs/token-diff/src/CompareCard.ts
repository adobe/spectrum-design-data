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
import { html, css, LitElement, TemplateResult, PropertyValueMap } from 'lit';
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
import { githubAPIKey } from '../github-api-key.js';

interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

interface Tag {
  commit: {
    sha: string;
    url: string;
  };
  name: string;
  node_id: string;
  tarball_url: string;
  zipball_url: string;
}

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

  constructor(
    heading: string,
    branchOrTag: string,
    schema: string,
    toggle: string,
    branchOptions: string[],
    tagOptions: string[],
    branchSchemaOptions: string[],
    tagSchemaOptions: string[],
  ) {
    super();
    this.heading = heading;
    this.branchOrTag = branchOrTag;
    this.schema = schema;
    this.toggle = toggle;
    this.branchOptions = branchOptions;
    this.tagOptions = tagOptions;
    this.branchSchemaOptions = branchSchemaOptions;
    this.tagSchemaOptions = tagSchemaOptions;
  }

  __setGithubBranchToggle() {
    this.toggle = 'Github branch';
    this.__handleSelection(this.branchOptions[0]);
    this.__handleSelection(this.branchSchemaOptions[0]);
  }

  __setReleaseToggle() {
    this.toggle = 'Package release';
    this.__handleSelection(this.tagOptions[0]);
    this.__handleSelection(this.tagSchemaOptions[0]);
  }

  __updateOptions(
    jsonObject: Branch | Tag,
    branchOrTagArr: string[],
    oldBranchTagOptions: string[],
  ) {
    Object.values(jsonObject).forEach((entry: Branch | Tag) => {
      const { name } = entry;
      branchOrTagArr.push(name);
    });
    this.requestUpdate('branchOrTagArr', oldBranchTagOptions);
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
    console.log('dispatching: ', option);
    this.dispatchEvent(new CustomEvent('selection', options));
  }

  firstUpdated() {
    if (this.toggle === 'Github branch') {
      const branchToggle = this.shadowRoot?.getElementById('branch-toggle');
      if (branchToggle) {
        branchToggle.setAttribute('selected', '');
        this.__setGithubBranchToggle();
      }
    } else {
      const tagToggle = this.shadowRoot?.getElementById('tag-toggle');
      if (tagToggle) {
        tagToggle.setAttribute('selected', '');
        this.__setReleaseToggle();
      }
    }
  }

  @property({ type: String }) heading = '';

  @property({ type: String }) toggle = '';

  @property({ type: Array }) branchOptions: string[] = [];

  @property({ type: Array }) tagOptions: string[] = [];

  @property({ type: Array }) branchSchemaOptions: string[] = [];

  @property({ type: Array }) tagSchemaOptions: string[] = [];

  @property({ type: String }) branchOrTag = '';

  @property({ type: String }) schema = '';

  @property({ type: String }) branchOrTagKey = '';

  protected override render(): TemplateResult {
    return html`
      <div class="card">
        <div class="container">
          <div class="label section">${this.heading}</div>
          <sp-theme scale="medium" color="light">
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
              label=${this.branchOrTag}
              value=${this.branchOrTag}
            >
              ${this.toggle === 'Github branch'
                ? this.__createMenuItem(this.branchOptions, true)
                : this.__createMenuItem(this.tagOptions, true)}
            </sp-picker>
            <sp-field-label for="schemaSelection" size="m"
              >Schema</sp-field-label
            >
            <sp-picker class="picker" label=${this.schema} value=${this.schema}>
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
