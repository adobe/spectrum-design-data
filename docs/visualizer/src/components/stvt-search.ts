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

import { LitElement, html, css } from "lit";
import { property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import "@spectrum-web-components/button/sp-button.js";
import "@spectrum-web-components/button/sp-clear-button.js";
import "@spectrum-web-components/button/sp-close-button.js";
import "@spectrum-web-components/textfield/sp-textfield.js";
import "@spectrum-web-components/search/sp-search.js";

import { GraphModel, GraphState } from "../models/graph-model";

import {
  StringMatchSearchResult,
  StringMatchDictionaryItem,
} from "../workers/string-match";

import StringMatchWorker from "../workers/string-match?worker";

import { dispatchCustomEvent } from "../utilities/index";

const COLOR_ORPHAN_CATEGORY_NODE = css`rgb(0, 140, 186)`; // cyan 700
const COLOR_COMPONENT_NODE = css`rgb(208, 208, 208)`; // gray 700
const COLOR_TOKEN_NODE = css`rgb(211, 65, 213)`; // fuchsia 700

export class StvtSearch extends LitElement {
  @property({ type: Object }) graphState =
    GraphModel.DEFAULT_STATE as GraphState;
  @property({ type: Object }) dictionary = [] as StringMatchDictionaryItem[];
  @property({ type: Object }) searchResults = [] as StringMatchSearchResult[];
  @property({ type: String }) searchQuery = "";
  @property({ type: Number }) targetIndex = 0;

  stringMatchWorker: Worker;

  static styles = css`
    :host {
      position: relative;
      display: block;
      width: 100%;
      /* max-width: 400px; */
    }

    sp-search {
      width: 100%;
    }

    .list {
      display: none;
      position: absolute;
      left: 0px;
      top: 110%;
      width: 400px;
      margin-top: 1px;
      max-height: 300px;
      background: var(--spectrum-gray-50);
      overflow: auto;
      box-shadow:
        inset 0 0 0 1px var(--spectrum-gray-200),
        0px 3px 6px rgba(0, 0, 0, 0.1);
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco,
        Consolas, "Liberation Mono", "Courier New", monospace;
      border-radius: 5px;
    }

    .list ul {
      padding: 10px;
      margin: 0;
      list-style: none;
    }

    .list ul li {
      position: relative;
      padding: 0;
      margin: 0;
      font-size: 12px;
      color: var(--spectrum-gray-500);
      line-height: 16px;
      cursor: pointer;
      padding: 4px 8px 4px 30px;
    }

    .list ul li[selected] {
      color: var(--spectrum-gray-900);
      background: var(--spectrum-gray-100);
      border-radius: 3px;
    }

    .list ul li:hover {
      background: var(--spectrum-gray-100);
      border-radius: 3px;
    }

    .list ul li span {
      color: var(--spectrum-yellow-visual-color);
      font-weight: bold;
    }

    .list ul li i {
      position: absolute;
      display: block;
      top: 4px;
      left: 6px;
      width: 18px;
      height: 18px;
      -webkit-mask-size: 75%;
      -webkit-mask-repeat: no-repeat;
      -webkit-mask-position: center center;
      mask-size: 75%;
      mask-repeat: no-repeat;
      mask-position: center center;
    }

    .list ul li i.component {
      background-color: ${COLOR_COMPONENT_NODE};
      -webkit-mask-image: url("./Smock_Note_18_N.svg");
      mask-image: url("./Smock_Note_18_N.svg");
    }

    .list ul li i.orphan-category {
      background-color: ${COLOR_ORPHAN_CATEGORY_NODE};
      -webkit-mask-image: url("./Smock_Selection_18_N.svg");
      mask-image: url("./Smock_Selection_18_N.svg");
    }

    .list ul li i.token {
      background-color: ${COLOR_TOKEN_NODE};
      -webkit-mask-image: url("./Smock_Label_18_N.svg");
      mask-image: url("./Smock_Label_18_N.svg");
    }

    #search:focus + .list {
      display: block;
    }
  `;

  constructor() {
    super();
    this.stringMatchWorker = new StringMatchWorker();
    this.stringMatchWorker.onmessage =
      this.handleStringMatchWorkerResponse.bind(this);
  }

  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("searchQuery")) {
      this.stringMatchWorker.postMessage({
        name: "find-matches",
        value: this.searchQuery,
      });
    }

    if (changedProperties.has("dictionary")) {
      this.stringMatchWorker.postMessage({
        name: "set-dictionary",
        value: this.dictionary,
      });
      this.stringMatchWorker.postMessage({
        name: "find-matches",
        value: this.searchQuery,
      });
    }
  }

  handleStringMatchWorkerResponse(event: any) {
    this.targetIndex = 0;
    this.searchResults = event.data as StringMatchSearchResult[];
  }

  handleChange() {
    const el = this.shadowRoot?.getElementById("search") as HTMLInputElement;
    this.searchQuery = el.value;
  }

  selectItemAtIndex(index: number) {
    const searchResult = this.searchResults[index];
    if (!searchResult) {
      return;
    }
    const el = this.shadowRoot?.getElementById("search") as HTMLInputElement;
    el.blur();
    this.searchQuery = "";
    el.value = this.searchQuery;
    dispatchCustomEvent(this, "select-id", {
      id: searchResult.value,
    });
  }

  handlePointerDown(index: number) {
    this.selectItemAtIndex(index);
  }

  setNewTargetIndex(index: number) {
    const listItem = this.shadowRoot?.getElementById(
      `search-result-${index}`,
    ) as HTMLElement;
    const listContainer = this.shadowRoot?.getElementById(
      `list-container`,
    ) as HTMLElement;
    const listItemHeight = listItem.offsetHeight;
    const containerHeight = listContainer.offsetHeight;
    const topEdge = listContainer.scrollTop;
    const bottomEdge = topEdge + containerHeight;
    const position = listItem.offsetTop;

    if (position < topEdge) {
      listContainer.scrollTop = position;
    }

    if (position > bottomEdge - listItemHeight) {
      listContainer.scrollTop = position + listItemHeight - containerHeight;
    }

    this.targetIndex = index;
  }

  handleKeydown(e: any) {
    switch (e.code) {
      case "KeyZ":
        e.stopImmediatePropagation();
        e.stopPropagation();
        break;
      case "ArrowDown": // DOWN
        let downIndex = this.targetIndex + 1;
        this.targetIndex++;
        if (this.searchResults.length <= downIndex) {
          downIndex = 0;
        }
        this.setNewTargetIndex(downIndex);
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        break;
      case "ArrowUp": // UP
        let upIndex = this.targetIndex - 1;
        if (upIndex < 0) {
          upIndex = this.searchResults.length - 1;
        }
        this.setNewTargetIndex(upIndex);
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        break;
      case "Enter": // ENTER
        this.selectItemAtIndex(this.targetIndex);
        break;
      case "Escape": // ESC
        const el = this.shadowRoot?.getElementById(
          "search",
        ) as HTMLInputElement;
        el.blur();
        this.searchQuery = "";
        el.value = this.searchQuery;
        break;
    }
  }

  render() {
    // console.info(this.graphState.nodes);
    return html`
      <div>
        <sp-search
          @change=${this.handleChange}
          @input=${this.handleChange}
          @keydown=${this.handleKeydown}
          id="search"
          placeholder="Search"
        ></sp-search>
        <div class="list" id="list-container">
          <ul>
            ${this.searchResults.map((item, index) => {
              // console.info(item);
              // const graphNode = this.graphState.nodes[item.value];
              // console.info(this.graphState.nodes[item.value]);
              return html`
                <li
                  id="search-result-${index}"
                  ?selected=${index === this.targetIndex}
                  @pointerdown=${() => this.handlePointerDown(index)}
                >
                  <i class=${item.type}></i>${unsafeHTML(item.matchMarkup)}
                </li>
              `;
            })}
            ${this.searchResults.length === 0
              ? html` <li selected>No matching results</li> `
              : html``}
          </ul>
        </div>
      </div>
    `;
  }
}

customElements.define("stvt-search", StvtSearch);
