/*
Copyright 2025 Adobe. All rights reserved.
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
import { dispatchCustomEvent } from "../utilities/index";
import { SIDEBAR_WIDTH } from "../layout-consts";
import { StringMatchDictionaryItem } from "../workers/string-match";

import "@spectrum-web-components/action-button/sp-action-button.js";

// https://spectrum.adobe.com/page/color-palette/
const COLOR_ORPHAN_CATEGORY_NODE = css`rgb(0, 140, 186)`; // cyan 700
const COLOR_COMPONENT_NODE = css`rgb(208, 208, 208)`; // gray 700
const COLOR_TOKEN_NODE = css`rgb(211, 65, 213)`; // fuchsia 700
// const COLOR_SELECTED_NODE = css`rgb(247, 216, 4)`; // yellow 1200

export class StvtTabs extends LitElement {
  @property({ type: Object }) dictionary = [] as StringMatchDictionaryItem[];

  @property({ type: Object }) selectedTokens = [] as string[];

  @property({ type: Object }) selectedComponents = ["slider"] as string[];

  tabItems: string[] = [];

  graphNodeTypeLookup: { [nodeId: string]: string } = {};

  static styles = css`
    :host {
      position: relative;
      display: block;
    }

    .tabs {
      position: absolute;
      display: block;
      top: 0;
      left: ${SIDEBAR_WIDTH}px;
      right: 0;
      height: 55px;
      background: var(--spectrum-gray-100);
      z-index: 0;
      box-shadow: 0px -3px 8px var(--spectrum-gray-50);
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: thin;
      scrollbar-color: #404040 #303030;
      display: flex;
      align-items: center;
      gap: 20px;
      color: var(--spectrum-gray-900);
    }

    .tabs label {
      padding-left: 30px;
    }

    .tabs span {
      color: var(--spectrum-gray-600);
      font-style: italic;
    }

    .tabs ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      gap: 10px;
      /* background-color: red; */
      /* min-width: 100%; */
      user-select: none;
    }

    .tabs::-webkit-scrollbar {
      height: 1px;
      background: var(--spectrum-gray-100);
    }

    .tabs::-webkit-scrollbar-track {
      background-color: transparent;
    }

    .tabs::-webkit-scrollbar-thumb {
      /* background-color: #4B4B4B; */
      background-color: var(--spectrum-gray-400);
      outline: 0px;
    }

    .tabs li {
      margin: 0;
      padding: 0 34px 0 26px;
      position: relative;
      display: inline-block;
      background: var(--spectrum-gray-50);
      border-radius: 3px;
      /* box-shadow: 0 0 0 1px #D0D0D0; */
      box-shadow: 0 0 0 1px var(--spectrum-gray-200);
      height: 24px;
      color: var(--spectrum-gray-600);
      font-size: 12px;
      line-height: 24px;
      white-space: nowrap;
    }

    .tabs li > i {
      position: absolute;
      display: block;
      top: 3px;
      left: 4px;
      width: 18px;
      height: 18px;
      -webkit-mask-size: 75%;
      -webkit-mask-repeat: no-repeat;
      -webkit-mask-position: center center;
      mask-size: 75%;
      mask-repeat: no-repeat;
      mask-position: center center;
      opacity: 0.6;
    }

    .tabs li.component > i {
      background-color: ${COLOR_COMPONENT_NODE};
      -webkit-mask-image: url("./Smock_Note_18_N.svg");
      mask-image: url("./Smock_Note_18_N.svg");
    }

    .tabs li.orphan-category > i {
      background-color: ${COLOR_ORPHAN_CATEGORY_NODE};
      -webkit-mask-image: url("./Smock_Selection_18_N.svg");
      mask-image: url("./Smock_Selection_18_N.svg");
    }

    .tabs li.token > i {
      background-color: ${COLOR_TOKEN_NODE};
      -webkit-mask-image: url("./Smock_Label_18_N.svg");
      mask-image: url("./Smock_Label_18_N.svg");
    }

    .tabs li button {
      position: relative;
      display: block;
      background-color: transparent;
      width: 18px;
      height: 18px;
      position: absolute;
      top: 3px;
      right: 3px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
    }

    .tabs li button i {
      position: absolute;
      display: block;
      top: 5px;
      left: 5px;
      width: 8px;
      height: 8px;
      background-color: var(--spectrum-gray-800);
      -webkit-mask-image: url("./CrossSize100.svg");
      mask-image: url("./CrossSize100.svg");
    }

    .tabs li:hover button {
      display: block;
    }

    .tabs li button:hover {
      background-color: var(--spectrum-gray-100);
    }

    .tabs li button:active {
      background-color: var(--spectrum-gray-200);
    }

    .tabs-endcap {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 10px;
    }
  `;

  willUpdate(changedProperties: Map<string, unknown>) {
    if (
      changedProperties.has("selectedTokens") ||
      changedProperties.has("selectedComponents")
    ) {
      this.tabItems = this.selectedComponents.concat(this.selectedTokens);
    }

    if (changedProperties.has("dictionary")) {
      this.dictionary.forEach(
        (item) => (this.graphNodeTypeLookup[item.value] = item.type),
      );
    }
  }

  handleWheelEvents(e: any) {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      const tabs = this.shadowRoot?.getElementById(
        "tab-scroller",
      ) as HTMLElement;
      tabs.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }

  handleCloseTabClick(label: string) {
    dispatchCustomEvent(this, "close-tab", {
      value: label,
    });
  }

  handleDeselectAll() {
    dispatchCustomEvent(this, "close-all-tabs");
  }

  tabsItemHtml(itemId: string) {
    // const isComponent = this.selectedComponents.indexOf(itemId) >= 0;

    return html`<li class=${this.graphNodeTypeLookup[itemId]}>
      <i></i>${itemId}<button @click=${() => this.handleCloseTabClick(itemId)}>
        <i></i>
      </button>
    </li>`;
  }

  render() {
    const tabCount = this.tabItems.length;

    // if (tabCount === 0) {
    //   return html``;
    // }

    return html`
      <div id="tab-scroller" class="tabs" @wheel=${this.handleWheelEvents}>
        <label>Selected:</label>
        ${tabCount === 0 ? html`<span>none</span>` : ""}
        <ul>
          ${this.selectedComponents.map(this.tabsItemHtml.bind(this))}
          ${this.selectedTokens.map(this.tabsItemHtml.bind(this))}
          ${tabCount <= 3
            ? html``
            : html`
                <div class="tabs-endcap">
                  <sp-action-button
                    @click=${this.handleDeselectAll}
                    size="xs"
                    quiet
                    >Deselect All</sp-action-button
                  >
                </div>
              `}
        </ul>
      </div>
    `;
  }
}

customElements.define("stvt-tabs", StvtTabs);
