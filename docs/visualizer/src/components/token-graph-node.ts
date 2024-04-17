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

import "@spectrum-web-components/action-button/sp-action-button.js";

import {
  GRAPH_NODE_WIDTH,
  GRAPH_NODE_VALUE_HEIGHT,
  GRAPH_NODE_VALUE_MARGIN,
  GRAPH_NODE_VALUES_PADDING,
} from "../layout-consts";

import { Gesture, GestureEvent, dispatchCustomEvent } from "../utilities/index";
import { ValuePathSplitter, ValuesListSplitter } from "../models/graph-model";

type ValueTuple = [value: string, path: string];

export class TokenGraphNode extends LitElement {
  @property({ type: String }) id = "";

  @property({ type: String }) value = "";

  @property({ type: String }) type = "token";

  @property({ type: Boolean }) isFaded = false;

  @property({ type: Boolean }) isIntersect = false;

  @property({ type: Boolean }) selected = false;

  @property({ type: Boolean }) selectionAncestor = false;

  @property({ type: Boolean }) selectionDescendent = false;

  @property({ type: Boolean }) hasDownstream = false;

  @property({ type: Boolean }) hoverUpstream = false;

  gesture?: Gesture;

  isValidDrag: boolean = false;

  decomposedValues: ValueTuple[] = [];

  rowCount: number = 1;

  pointerOverDepth: number = 0;

  isInteractingWithButton: boolean = false;

  fillColor = "#000000";

  textColor = "#FFFFFF";

  static styles = css`
    div {
      position: absolute;
      width: ${GRAPH_NODE_WIDTH}px;
      display: flex;
      align-items: center;
      justify-content: left;
      text-align: left;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      border-radius: 3px;
    }

    h3 {
      font-size: 12px;
      padding: 0;
      margin: 0;
      text-align: left;
      padding-left: 26px;
      pointer-events: none;
    }

    ol {
      list-style: none;
      font-size: 12px;
      position: absolute;
      margin: 0;
      padding: 0;
      display: block;
      right: ${GRAPH_NODE_VALUES_PADDING}px;
      white-space: nowrap;
      text-align: right;
      pointer-events: none;
    }

    ol li {
      margin-bottom: ${GRAPH_NODE_VALUE_MARGIN}px;
      position: relative;
      display: block;
      height: ${GRAPH_NODE_VALUE_HEIGHT}px;
    }

    ol b,
    ol i {
      padding: 0 5px;
      height: 100%;
      position: relative;
      display: inline-block;
      line-height: ${GRAPH_NODE_VALUE_HEIGHT}px;
      font-weight: normal;
      font-style: normal;
    }

    ol b {
      color: var(--spectrum-gray-800);
      background-color: var(--spectrum-gray-100);
      border-radius: 2px 0 0 2px;
    }

    ol i {
      color: var(--spectrum-gray-100);
      background-color: var(--spectrum-gray-900);
      border-radius: 0 2px 2px 0;
    }

    .faded ol b {
      color: var(--spectrum-gray-600);
      background-color: var(--spectrum-gray-200);
    }

    .faded ol i {
      color: var(--spectrum-gray-200);
      background-color: var(--spectrum-gray-600);
    }

    .selected ol b {
      color: var(--spectrum-yellow-800);
      background-color: var(--spectrum-yellow-100);
    }

    .selected ol i {
      color: var(--spectrum-yellow-100);
      background-color: var(--spectrum-yellow-1300);
    }

    .copyIcon {
      position: absolute;
      display: none;
      cursor: pointer;
      top: 0;
      left: 0;
      height: 100%;
      width: 28px;
      -webkit-mask-image: url("./Smock_Copy_18_N.svg");
      mask-image: url("./Smock_Copy_18_N.svg");
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-position: center center;
      mask-position: center center;
      -webkit-mask-size: 18px;
      mask-size: 18px;
      opacity: 0.7;
      background-color: #ffffff;
    }

    .copyIcon:hover {
      opacity: 0.8;
    }

    .copyIcon:active {
      opacity: 1;
    }

    div:hover .copyIcon {
      display: block;
    }
  `;

  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("value")) {
      const values = this.value.split(ValuesListSplitter);
      if (values.length === 1 && values[0] === "") {
        this.decomposedValues = [];
      } else {
        this.decomposedValues = values.map((value) => {
          const parts = value.split(ValuePathSplitter);
          return [parts[0], parts[1] || ""];
        });
      }
      this.rowCount = Math.max(this.decomposedValues.length, 1);
    }

    // determine colors
    // https://spectrum.adobe.com/page/color-palette/
    if (this.selected) {
      this.fillColor = "--spectrum-yellow-visual-color";
      this.textColor = "--spectrum-yellow-100";
    } else {
      // debug color - should NOT see any celery
      let hue = "celery";
      let fillValue = 200;
      let textValue = 900;
      // token colors...
      if (this.type === "token") {
        // upstream tokens are different than downstream
        hue = this.selectionDescendent ? "fuchsia" : "purple";
        // overlaps/intersections are highlighted
        if (
          this.isIntersect ||
          (this.selectionDescendent && this.selectionAncestor)
        ) {
          hue = "orange";
          fillValue = 600;
          textValue = 1300;
        }
        // component colors...
      } else if (this.type === "component") {
        hue = "gray";
        // highlighted if has downstream graph
        if (this.hasDownstream) {
          fillValue = 300;
        }
        // orphan category colors...
      } else if (this.type === "orphan-category") {
        hue = "cyan";
        // highlighted if has downstream graph
        if (this.hasDownstream) {
          fillValue = 300;
        }
      }
      // DARKEN the values if the node
      // is 'faded' relative to the
      // currently configured value...
      if (this.isFaded) {
        fillValue -= 100;
        textValue -= 400;
      }

      if (this.hoverUpstream) {
        textValue = Math.min(1300, textValue + 400);
      }

      this.fillColor = `--spectrum-${hue}-${fillValue}`;
      this.textColor = `--spectrum-${hue}-${textValue}`;
    }
  }

  preventDefault(e: any) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    return false;
  }

  handlePointerDownOnIcon() {
    this.isInteractingWithButton = true;
  }

  handlePointerUpOnIcon() {
    this.isInteractingWithButton = false;
  }

  handlePointerDown(e: PointerEvent) {
    if ((this.gesture && this.gesture.active) || this.isInteractingWithButton) {
      return;
    }

    const el = this.shadowRoot?.getElementById("gesture-target");

    if (el) {
      dispatchCustomEvent(this, "node-pointerdown", {
        id: this.id,
        data: e.detail,
      });

      this.gesture = new Gesture(e, el);

      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) {
        this.isValidDrag = true;
        // e.stopPropagation();
        this.preventDefault(e);
      }
    }
  }

  handlePointerOver() {
    this.pointerOverDepth++;
    dispatchCustomEvent(this, "node-pointerover", { id: this.id });
  }

  handlePointerOut() {
    setTimeout(() => {
      this.pointerOverDepth--;
      if (this.pointerOverDepth === 0) {
        dispatchCustomEvent(this, "node-pointerout", { id: this.id });
      }
    }, 1);
  }

  handleDragMove(e: GestureEvent) {
    if (!this.gesture || !this.isValidDrag) {
      return;
    }
    dispatchCustomEvent(this, "node-dragmove", {
      id: this.id,
      data: e.detail,
    });
  }

  handleDragStart(e: GestureEvent) {
    if (!this.gesture) {
      return;
    }
    if (
      e.detail.ctrlKey ||
      e.detail.altKey ||
      e.detail.metaKey ||
      e.detail.shiftKey
    ) {
      this.isValidDrag = true;
    }
    dispatchCustomEvent(this, "node-dragstart", {
      id: this.id,
      data: e.detail,
    });
  }

  handleDragEnd(e: GestureEvent) {
    if (!this.gesture) {
      return;
    }
    this.isValidDrag = false;
    dispatchCustomEvent(this, "node-dragend", {
      id: this.id,
      data: e.detail,
    });
  }

  handleClick(e: GestureEvent) {
    dispatchCustomEvent(this, "node-click", {
      id: this.id,
      shiftKey: e.detail.shiftKey,
      ctrlKey: e.detail.ctrlKey,
      metaKey: e.detail.metaKey,
      altKey: e.detail.altKey,
    });
  }

  handleSingleClick(e: GestureEvent) {
    dispatchCustomEvent(this, "node-singleclick", {
      id: this.id,
      shiftKey: e.detail.shiftKey,
      ctrlKey: e.detail.ctrlKey,
      metaKey: e.detail.metaKey,
      altKey: e.detail.altKey,
    });
  }

  handleDoubleClick(e: GestureEvent) {
    dispatchCustomEvent(this, "node-doubleclick", {
      id: this.id,
      shiftKey: e.detail.shiftKey,
      ctrlKey: e.detail.ctrlKey,
      metaKey: e.detail.metaKey,
      altKey: e.detail.altKey,
    });
  }

  copyToClipboard(e: PointerEvent) {
    navigator.clipboard.writeText(this.id).then(
      () => {
        dispatchCustomEvent(this, "copied-to-clipboard", {
          id: this.id,
        });
      },
      () => {
        console.info("FAILED TO COPY TO CLIPBOARD");
      },
    );
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  get valueHtml() {
    if (this.decomposedValues.length === 0) {
      return html``;
    }

    return html`
      <ol>
        ${this.decomposedValues.map(
          (v) => html`<li><b>${v[1] || `*`}</b><i>${v[0]}</i></li>`,
        )}
      </ol>
    `;
  }

  render() {
    return html`
      <div
        class="${this.selected ? "selected" : ""} ${this.isFaded
          ? "faded"
          : ""}"
        id="gesture-target"
        @pointerdown=${this.handlePointerDown}
        @gesture-click=${this.handleClick}
        @gesture-singleclick=${this.handleSingleClick}
        @gesture-doubleclick=${this.handleDoubleClick}
        @gesture-drag-end=${this.handleDragEnd}
        @gesture-drag-start=${this.handleDragStart}
        @gesture-drag-move=${this.handleDragMove}
        @mouseout=${this.handlePointerOut}
        @mouseover=${this.handlePointerOver}
        style="background-color:var(${this.fillColor});color:var(${this
          .textColor});height:${this.rowCount * GRAPH_NODE_VALUE_HEIGHT +
        (this.rowCount - 1) * GRAPH_NODE_VALUE_MARGIN +
        GRAPH_NODE_VALUES_PADDING * 2}px;"
      >
        <h3>${this.id}</h3>
        <i
          @pointerdown=${this.handlePointerDownOnIcon}
          @pointerup=${this.handlePointerUpOnIcon}
          @click=${this.copyToClipboard}
          class="copyIcon"
          slot="icon"
          style="background-color:var(${this.textColor});"
        ></i>
        ${this.valueHtml}
      </div>
    `;
  }
}

customElements.define("token-graph-node", TokenGraphNode);
