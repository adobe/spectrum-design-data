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
import '@spectrum-web-components/sidenav/sp-sidenav.js';
import '@spectrum-web-components/sidenav/sp-sidenav-item.js';
import '@spectrum-web-components/theme/sp-theme.js';
import '@spectrum-web-components/theme/src/themes.js';

export class NavBar extends LitElement {
  static styles = css`
    :host {
      padding: 25px;
      color: var(--token-diff-text-color, #000);
      min-width: fit-content;
    }
    .logo-text {
      display: flex;
      color: #000;
      font-size: 20px;
      font-style: normal;
      font-weight: 700;
      line-height: 111%; /* 22.2px */
      float: right;
      padding-left: 10px;
      padding-top: 15px;
    }
    .logo-section {
      display: flex;
      align-items: center;
      padding-bottom: 15px;
      margin: auto;
      /* justify-content: center; */
    }
    .entire-bar {
      background-color: '#F8F8F8';
      width: fit-content;
    }
    img {
      align-content: center;
      vertical-align: middle;
      padding-left: 14px;
    }
    a {
      text-decoration: none;
    }
    @media only screen and (max-width: 1100px) {
      :host {
        padding: auto;
      }
    }
  `;

  async __handleSelection() {
    this.dispatchEvent(
      new Event('close', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  protected override render(): TemplateResult {
    return html`
      <div class="entire-bar">
        <a class="logo-section" href="/demo">
          <img class="logo" src="/src/assets/adobe_logo.svg" alt="adobe logo" />
          <div class="logo-text">
            <sp-theme system="spectrum" color="light" scale="medium">
              <h2
                class="spectrum-Typography spectrum-Heading--sizeXXL logo-section"
              >
                Spectrum <br />
                Tokens
              </h2>
            </sp-theme>
          </div>
        </a>
        <sp-theme scale="medium" color="light">
          <sp-sidenav defaultValue="Token diff generator" variant="multilevel">
            <sp-sidenav-item
              value="Token diff generator"
              href="/demo"
              label="Token diff generator"
              @click=${this.__handleSelection}
            ></sp-sidenav-item>
            <sp-sidenav-item
              value="Getting started"
              href="/getting-started"
              label="Getting started"
              @click=${this.__handleSelection}
            ></sp-sidenav-item>
          </sp-sidenav>
        </sp-theme>
      </div>
    `;
  }
}
