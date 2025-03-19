/*
Copyright 2023 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { LitElement, html, css } from "lit";
import { property } from "lit/decorators.js";

import "@spectrum-web-components/switch/sp-switch.js";
import "@spectrum-web-components/button/sp-button.js";
import "@spectrum-web-components/button-group/sp-button-group.js";
import "@spectrum-web-components/link/sp-link.js";
import "@spectrum-web-components/overlay/overlay-trigger.js";
import "@spectrum-web-components/popover/sp-popover.js";

import { Switch } from "@spectrum-web-components/switch";

import "./stvt-filters-menu";

import "./stvt-search";

import "./stvt-tabs";

import { dispatchCustomEvent } from "../utilities/index";

import { SIDEBAR_WIDTH } from "../layout-consts";

import { StringMatchDictionaryItem } from "../workers/string-match";

// import { GraphModel, GraphState } from '../models/graph-model'

export class StvtSidebar extends LitElement {
  @property({ type: Object }) dictionary = [] as StringMatchDictionaryItem[];

  @property({ type: Object }) filters = [] as string[];

  @property({ type: Object }) listOfComponents = [] as string[];

  @property({ type: Object }) selectedTokens = [] as string[];

  @property({ type: Object }) selectedComponents = ["slider"] as string[];

  @property({ type: String }) spectrumColorTheme = "darkest";

  // @property({ type: Object }) completeGraphState = GraphModel.DEFAULT_STATE as GraphState;

  static styles = css`
    :host {
      position: absolute;
      display: flex;
      flex-direction: column;
      height: 100%;
      width: ${SIDEBAR_WIDTH}px;
      background: var(--spectrum-gray-100);
      justify-content: space-between;
      box-shadow: 2px 0 0 0 var(--spectrum-gray-50);
      color: var(--spectrum-gray-900);
    }

    section {
      position: relative;
      display: block;
      padding: 0 10px;
    }

    .top {
      padding-top: 20px;
      z-index: 1;
    }

    .middle {
      flex-grow: 1;
      overflow: scroll;
      flex-shrink: 1;
      z-index: 0;
    }

    .bottom {
      bottom: 0;
      padding: 0;
      border-top: 1px var(--spectrum-gray-200) solid;
    }

    .branding {
      display: flex;
      align-items: center;
      gap: 15px;
      padding-bottom: 20px;
    }

    stvt-search {
      z-index: 1;
    }

    footer {
      background: var(--spectrum-gray-100);
      padding: 20px;
    }

    footer ul {
      position: relative;

      list-style: none;
      margin: 0;
      padding: 0;
      padding-bottom: 20px;
      font-size: 11px;
      margin-left: 85px;
    }

    footer ul i {
      color: var(--spectrum-gray-500);
      margin-right: 10px;
      font-style: normal;
      position: absolute;
      right: 100%;
      text-align: right;
      white-space: nowrap;
    }

    footer ul i span {
      font-family: Arial, Helvetica, sans-serif;
    }

    footer section {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    h1 {
      margin: 0;
      padding: 0;
      font-size: 18px;
      font-style: normal;
      font-family: var(
        --spectrum-alias-body-text-font-family,
        var(--spectrum-global-font-family-base)
      );
      font-weight: normal;
      line-height: 24px;
    }

    h2 {
      margin: 0;
      padding: 0;
      font-size: 11px;
      font-style: normal;
      font-family: var(
        --spectrum-alias-body-text-font-family,
        var(--spectrum-global-font-family-base)
      );
      font-weight: normal;
      line-height: 18px;
      text-transform: uppercase;
    }
  `;

  handleSwitchValueChange() {
    const inputEl = this.shadowRoot?.getElementById(
      "spectrum-color-theme-switch",
    ) as Switch;
    const newTheme = inputEl.checked ? "light" : "darkest";
    dispatchCustomEvent(this, "set-spectrum-color-theme", {
      value: newTheme,
    });
  }

  toggleAbout() {}

  render() {
    const isLightsOn = this.spectrumColorTheme === "light";
    return html`
      <section class="top">
        <div class="branding">
          <img width="30" height="26" src="./adobe.svg" />
          <div>
            <h1>Spectrum (S1 Legacy)</h1>
            <h2>Token Visualization Tool</h2>
          </div>
        </div>
        <stvt-search
          id="stvt-search"
          .dictionary=${this.dictionary}
        ></stvt-search>
      </section>
      <section class="middle">
        <stvt-filters-menu .filters=${this.filters}></stvt-filters-menu>
      </section>
      <section class="bottom">
        <footer>
          <ul>
            <li>
              <i><span>⌘</span> F</i> Search Tokens
            </li>
            <li>
              <i><span>⌘</span> drag</i> Pan / Move Token
            </li>
            <li><i>← ↑ ↓ →</i> Pan</li>
            <li>
              <i><span>⌘</span> scroll</i> Zoom In / Out
            </li>
            <li><i>Z / Shift Z</i> Zoom In / Out</li>
            <li><i>BACK</i> Undo Selection</li>
            <li><i>FORWARD</i> Redo Selection</li>
          </ul>
          <section>
            <overlay-trigger id="trigger" placement="bottom" offset="6">
              <sp-button size="s" variant="accent" slot="trigger"
                >About</sp-button
              >
              <sp-popover
                dialog
                slot="click-content"
                direction="bottom"
                style="max-width: 500px;"
              >
                <div style="color: var(--spectrum-global-color-gray-800);">
                  <p>
                    Design tokens are all the values needed to construct and
                    maintain a design system — spacing, color, typography,
                    object styles, animation, etc. — represented as data. These
                    can represent anything defined by design: a color as a RGB
                    value, an opacity as a number, an animation ease as Bezier
                    coordinates. They’re used in place of hard-coded values in
                    order to ensure flexibility and unity across all product
                    experiences.
                  </p>
                  <p>
                    Design tokens are directly integrated into our component
                    libraries, UI kits, and the Spectrum XD plugin. They cover
                    the various options of platform scales, color themes,
                    component states, and more. We also offer teams a variety of
                    token types to use directly within their products if they
                    are not using a Spectrum component library.
                  </p>
                  <p>
                    This tool allows you to organically explore the relationship
                    between these tokens by directly selecting tokens to expand
                    their connections, filtering displayed values and
                    connections by scale and theme, and by directly searching
                    for token names or values.
                  </p>
                  <sp-link
                    target="_new"
                    href="https://github.com/adobe/spectrum-tokens"
                    variant="secondary"
                    >Spectrum Tokens on GitHub</sp-link
                  >
                  <br />
                  <sp-link
                    target="_new"
                    href="https://git.corp.adobe.com/aportill/stvt/"
                    variant="secondary"
                    >This Tool on GitHub</sp-link
                  >
                </div>
              </sp-popover>
            </overlay-trigger>
            <sp-switch
              ?checked=${isLightsOn}
              id="spectrum-color-theme-switch"
              @change=${this.handleSwitchValueChange}
            >
              Lights on
            </sp-switch>
          </section>
        </footer>
      </section>
    `;
  }
}

customElements.define("stvt-sidebar", StvtSidebar);
