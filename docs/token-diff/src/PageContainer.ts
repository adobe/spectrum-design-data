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
import { Router } from '@vaadin/router';
import './token-diff.js';
import './getting-started.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-show-menu.js';
import '@spectrum-web-components/theme/sp-theme.js';
import '@spectrum-web-components/theme/src/themes.js';
import '@spectrum-web-components/overlay/sp-overlay.js';
import '@spectrum-web-components/popover/sp-popover.js';
import '@spectrum-web-components/divider/sp-divider.js';

export class PageContainer extends LitElement {
  static styles = css`
    .page {
      display: flex;
      max-width: 100vw;
    }
    .right {
      padding-left: 100px;
      padding-right: 100px;
      background-color: white;
      display: flex;
      flex-wrap: wrap;
      width: 100%;
      box-sizing: border-box;
    }
    #outlet {
      overflow-y: scroll;
      background-color: white;
      display: flex;
      overflow-x: hidden;
      flex-wrap: wrap;
      width: inherit;
    }
    .navigation {
      padding: 12px;
      border-bottom: 1px solid var(--spectrum-gray-200);
      background-color: white;
      display: none;
      background-color: white;
      overflow: hidden;
      position: fixed;
      width: 100%;
      z-index: 9999;
    }
    .mobile-nav-bar {
      height: 100vh;
      overflow-y: hidden;
      border-style: none;
    }
    footer {
      display: flex;
      align-items: center;
      width: 100%;
      overflow-y: hidden;
    }
    .footer-group {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      width: 100%;
      flex-wrap: wrap;
    }
    ul {
      display: inline-block;
      justify-content: center;
    }
    a {
      text-decoration: none;
      color: #222;
    }
    .footer-text {
      font-size: 11px;
      font-style: normal;
      font-weight: 400;
      line-height: 11px; /* 100% */
      padding-left: 0;
    }
    .adchoice-icon {
      display: block;
      line-height: 1.4;
      width: 25px;
      height: 25px;
      text-align: center;
      padding-right: 5px;
    }
    .adchoice-span {
      align-items: center;
      display: flex;
      width: fit-content;
      overflow-y: hidden;
      flex-wrap: wrap;
    }
    .separator {
      margin: 0 8px;
      color: #4b4b4b;
      font-size: 11px;
    }
    .divider {
      margin-top: 20px;
    }
    @media only screen and (max-width: 1100px) {
      .navigation {
        display: inline-block;
        background-color: white;
      }
      .nav-bar {
        display: none;
      }
      .right {
        padding-left: 25px;
        padding-right: 25px;
      }
    }
    @media only screen and (min-width: 1100px) {
      .navigation {
        display: none;
        background-color: white;
      }
      .nav-bar {
        display: block;
      }
    }
  `;

  firstUpdated() {
    const router = new Router(this.shadowRoot!.querySelector('#outlet'));
    router.setRoutes([
      { path: `/demo/:object?`, component: 'token-diff' },
      { path: '/getting-started', component: 'getting-started' },
    ]);
  }

  protected override render(): TemplateResult {
    return html`
      <div>
        <header>
          <sp-theme
            class="header"
            system="spectrum"
            color="light"
            scale="medium"
          >
            <div class="navigation">
              <sp-action-button
                quiet
                id="trigger"
              >
                <sp-icon-show-menu slot="icon"></sp-icon-show-menu>
              </sp-action-button>
            </div>
          </sp-theme>
        </header>
        </div>
        <sp-theme
            system="spectrum"
            color="light"
            scale="medium"
          >
          <div class="page">
          <nav-bar class="nav-bar"></nav-bar>
          <sp-overlay trigger="trigger@click" type="modal">
            <sp-popover class="mobile-nav-bar" placement="left" open>
                <nav-bar></nav-bar>
            </sp-popover>
          </sp-overlay>
          <div class="right">
            <div id="outlet"></div>
            <sp-divider class="divider" size="m"></sp-divider>
            <footer>
              <ul class="footer-group">
                <span class="adchoice-span">
                <ul class="footer-text">
                    Copyright © 2024 Adobe. All rights reserved.
                  <span class="separator">/</span>
                </ul>
                <ul class="footer-text">
                  <a href="https://www.adobe.com/privacy.html">
                    Privacy
                  </a>
                  <span class="separator">/</span>
                </ul>
                <ul class="footer-text">
                  <a href="https://www.adobe.com/legal/terms.html">
                    Terms of Use
                  </a>
                  <span class="separator">/</span>
                </ul>
                <!-- <ul class="footer-text">
                  Cookie Preferences
                  <span class="separator">/</span>
                </ul> -->
                <ul class="footer-text">
                  <a href="https://www.adobe.com/privacy/us-rights.html">
                    Do not sell or share my personal information
                  </a>
                  <span class="separator">/</span>
                </ul>
                <ul class="footer-text">
                  <a class="adchoice-span" href="https://www.adobe.com/privacy/opt-out.html#interest-based-ads">
                    <span>
                    <img alt="adchoices" class="adchoice-icon" src="https://www.adobe.com/content/dam/cc/icons/adchoices-small.svg">
                    </span>
                    <span>
                    AdChoices
                    </span>
                  </a>
                </ul>
                </span>
            </ul>
            </footer>
          </div>
          </div>
          </sp-theme>
      </div>
    `;
  }
}
