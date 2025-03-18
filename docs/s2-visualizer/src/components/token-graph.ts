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
import { repeat } from "lit/directives/repeat.js";

import "./token-graph-node";
import "./token-graph-adjacency";

import { GraphNodeId, GraphState, GraphModel } from "../models/graph-model";
import { AppState, AppModel } from "../models/app-model";
import { debounce } from "../utilities/index";

import {
  GRAPH_NODE_HEIGHT,
  GRAPH_NODE_WIDTH,
  MINIMUM_CANVAS_RENDER_SCALE,
  MAXIMUM_CANVAS_RENDER_SCALE,
} from "../layout-consts";

import { Gesture, GestureEvent, dispatchCustomEvent } from "../utilities/index";

import "./graph-grid";

type AdjacencyTuplesList = [GraphNodeId, GraphNodeId][];

export class TokenGraph extends LitElement {
  @property({ type: Object }) appState = AppModel.DEFAULT_STATE as AppState;

  @property({ type: Object }) graphState =
    GraphModel.DEFAULT_STATE as GraphState;

  nodeIds: GraphNodeId[] = [];

  _priorComponentsCacheStr = "";

  _priorGraphState: GraphState = GraphModel.DEFAULT_STATE;

  _gestureStartZoom: number = 1;

  _isGestureActive: boolean = false;

  adjacencyTuples: AdjacencyTuplesList = [];

  gesture?: Gesture;

  debouncedAfterWheel: () => void = () => {};

  static styles = css`
    #panning-drag-surface {
      position: absolute;
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--spectrum-gray-50);
      color: var(--spectrum-gray-900);
    }

    graph-grid {
      position: absolute;
    }

    div.contents {
      position: absolute;
      transform-origin: 0 0;
    }

    .not-dragging div.contents {
      transition: transform 0.2s;
    }

    token-graph-adjacency {
      position: absolute;
      display: block;
      top: 0;
      left: 0;
      pointer-events: none;
    }

    token-graph-adjacency[isHighlighted="true"] {
      z-index: 2;
    }

    token-graph-node {
      position: absolute;
      display: block;
    }

    /* .focus-mode token-graph-node {
      opacity: 0.5;
    } */

    /* .focus-mode token-graph-node[isSelected=true],
    .focus-mode token-graph-node[isFocused=true] {
      opacity: 1;
    }

    .focus-mode token-graph-adjacency {
      opacity: 0.5;
    }

    .focus-mode token-graph-adjacency[isFocused=true] {
      opacity: 1;
    } */
  `;

  constructor() {
    super();
    this.debouncedAfterWheel = debounce(
      this._debouncedAfterWheel.bind(this),
      150,
    );
  }

  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("graphState")) {
      const { nodes, adjacencyList } = this.graphState;

      // const priorPinnedNode = this._priorGraphState.nodes[this.appState.pinnedGraphNode];
      // const newPinnedNode = this.graphState.nodes[this.appState.pinnedGraphNode];
      // if (priorPinnedNode && newPinnedNode) {
      //   const priorXOffset = this.appState.panX + priorPinnedNode.x + this._graphOffsetX;
      //   const priorYOffset = this.appState.panY + priorPinnedNode.y + this._graphOffsetY;
      //   const newXOffset = this.appState.panX + newPinnedNode.x;
      //   const newYOffset = this.appState.panY + newPinnedNode.y;
      //   this._graphOffsetX = priorXOffset - newXOffset;
      //   this._graphOffsetY = priorYOffset - newYOffset;
      // }

      const tuples: AdjacencyTuplesList = [];
      for (const fromId in adjacencyList) {
        const listOfToIds = adjacencyList[fromId];
        for (let index = 0; index < listOfToIds.length; index++) {
          const toId = listOfToIds[index];
          tuples.push([fromId, toId]);
        }
      }

      this.nodeIds = Object.keys(nodes);
      this.adjacencyTuples = tuples;
      this._priorGraphState = this.graphState;
    }
  }

  handleZoomGestureEnd(e: any) {
    this._gestureStartZoom = 1;
    this._isGestureActive = false;
    e.preventDefault();

    dispatchCustomEvent(this, "generic-gesture-end", {
      id: this.id,
      data: e.detail,
    });
  }

  handleZoomGestureStart(e: any) {
    // @TODO: set this to the current renderscale
    this._gestureStartZoom = this.appState.zoom;
    this._isGestureActive = true;
    e.preventDefault();

    dispatchCustomEvent(this, "generic-gesture-start", {
      id: this.id,
      data: e.detail,
    });
  }

  handleZoomGesture(e: any) {
    let newZoom = 0;

    // HANDLE WHEEL DATA ( chrome )
    if (e.deltaY && !this._isGestureActive) {
      const oldZoom = this.appState.zoom;
      const zoomDelta = -e.deltaY * 0.0075 * oldZoom;
      newZoom = oldZoom + zoomDelta;

      // HANDLE ACTUAL GESTURE DATA ( safari )
    } else if (e.scale) {
      newZoom = this._gestureStartZoom * e.scale;
    }

    if (newZoom) {
      newZoom = Math.min(
        MAXIMUM_CANVAS_RENDER_SCALE,
        Math.max(MINIMUM_CANVAS_RENDER_SCALE, newZoom),
      );

      const zoomDiff = newZoom / this.appState.zoom;
      const offsetX = this.appState.panX - e.pageX;
      const offsetY = this.appState.panY - e.pageY;
      const newPanX = e.pageX + offsetX * zoomDiff;
      const newPanY = e.pageY + offsetY * zoomDiff;

      dispatchCustomEvent(this, "set-panning-position", {
        x: newPanX,
        y: newPanY,
      });

      dispatchCustomEvent(this, "set-zoom", {
        value: newZoom,
      });
    }

    e.preventDefault();
  }

  _debouncedAfterWheel() {
    dispatchCustomEvent(this, "generic-gesture-end", {
      id: this.id,
    });
  }

  handleWheelEvents(e: any) {
    dispatchCustomEvent(this, "generic-gesture-start", {
      id: this.id,
    });

    this.debouncedAfterWheel();
    // debounce((this.debouncedAfterWheel.bind(this)),150);

    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) {
      return this.handleZoomGesture(e);
    }

    dispatchCustomEvent(this, "panning-input-delta", {
      x: -e.deltaX * 2,
      y: -e.deltaY * 2,
    });
    e.preventDefault();

    // use debounced
  }

  handlePointerDown(e: PointerEvent) {
    if (this.gesture && this.gesture.active) {
      return;
    }
    const el = this.shadowRoot?.getElementById("panning-drag-surface");
    if (el) {
      this.gesture = new Gesture(e, el);
      e.preventDefault();
      e.stopPropagation();
    }
  }

  handleDragStart(e: GestureEvent) {
    dispatchCustomEvent(this, "generic-gesture-start", {
      id: this.id,
      data: e.detail,
    });
  }

  handleDragEnd(e: GestureEvent) {
    dispatchCustomEvent(this, "generic-gesture-end", {
      id: this.id,
      data: e.detail,
    });
  }

  handleDragMove(e: GestureEvent) {
    if (!this.gesture) {
      return;
    }

    if (this.gesture.id !== e.detail.gestureId) {
      return;
    }

    dispatchCustomEvent(this, "panning-input-delta", {
      x: e.detail.deltaX,
      y: e.detail.deltaY,
    });

    // if (!this.gesture || this.gesture.id !== e.detail.gestureId) { return; }
    // console.info(e.detail.gestureId);
  }

  render() {
    const {
      isDragging,
      zoom,
      panX,
      panY,
      selectedTokens,
      selectedComponents,
      selectionDescendentIntersectNodes,
      selectionAncestorNodes,
      selectionDescendentNodes,
      hoverUpstreamNodes,
      spectrumColorTheme,
    } = this.appState;

    // items in BOTH arrays
    let focusItems = selectionAncestorNodes.filter((value) =>
      selectionDescendentNodes.includes(value),
    );
    const allSelections = [...selectedComponents, ...selectedTokens];
    // focusItems = focusItems.filter(value => selectionDescendentIntersectNodes.includes(value));
    focusItems = [...focusItems, ...selectionDescendentIntersectNodes];
    focusItems = focusItems.filter((value) => !allSelections.includes(value));
    // console.info('focusItems',focusItems);
    // console.info('selectionDescendentIntersectNodes',selectionDescendentIntersectNodes);

    const isFocusMode = focusItems.length > 0;

    const focusedOrSelected = [...focusItems, ...allSelections];

    // console.info('focusItems', focusItems);

    const transform = [
      zoom.toFixed(3),
      0,
      0,
      zoom.toFixed(3),
      panX.toFixed(0),
      panY.toFixed(0),
    ];

    const renderedHoverUpstream = isDragging ? [] : hoverUpstreamNodes;

    return html`
      <div
        id="panning-drag-surface"
        class=${isDragging ? "is-dragging" : "not-dragging"}
        @wheel=${this.handleWheelEvents}
        @gesturechange=${this.handleZoomGesture}
        @gesturestart=${this.handleZoomGestureStart}
        @gestureend=${this.handleZoomGestureEnd}
        @pointerdown=${this.handlePointerDown}
        @gesture-drag-start=${this.handleDragStart}
        @gesture-drag-end=${this.handleDragEnd}
        @gesture-drag-move=${this.handleDragMove}
      >
        <graph-grid
          .scale=${zoom}
          .posx=${panX}
          .posy=${panY}
          .theme=${spectrumColorTheme}
        >
        </graph-grid>
        <div
          class="contents ${isFocusMode ? "focus-mode" : ""}"
          style="transform: matrix(${transform.join(",")});"
        >
          ${repeat(
            this.adjacencyTuples,
            (tuple) => tuple.join(":"),
            (tuple) => {
              const [fromId, toId] = tuple;
              const fromNode = this.graphState.nodes[fromId];
              const toNode = this.graphState.nodes[toId];
              if (!fromNode || !toNode) {
                return html``;
              }
              const label = fromNode.adjacencyLabels
                ? fromNode.adjacencyLabels[toNode.id]
                : "";
              const fromX = fromNode.x + GRAPH_NODE_WIDTH;
              const fromY = fromNode.y + GRAPH_NODE_HEIGHT / 2;
              const toX = toNode.x;
              const toY = toNode.y + GRAPH_NODE_HEIGHT / 2;
              const isOnAncestorPath =
                selectionAncestorNodes.indexOf(fromNode.id) >= 0 &&
                selectionAncestorNodes.indexOf(toNode.id) >= 0;
              const isOnDescendentPath =
                selectionDescendentNodes.indexOf(fromNode.id) >= 0 &&
                selectionDescendentNodes.indexOf(toNode.id) >= 0;
              const isInHoverUpstream =
                renderedHoverUpstream.indexOf(fromNode.id) >= 0 &&
                renderedHoverUpstream.indexOf(toNode.id) >= 0;

              const isFocused =
                focusedOrSelected.indexOf(fromId) >= 0 &&
                focusedOrSelected.indexOf(toId) >= 0;
              const isFaded = isFocusMode && !isFocused;

              // const pathColor =
              //   isInHoverUpstream ? "#FFD2FF" : // white
              //   isOnAncestorPath && isOnDescendentPath ? "#F1A239" : // orange
              //   isOnAncestorPath ? "#4A9DF8" : // blue
              //   isOnDescendentPath ? "#A866F7" : // purple
              //   "#A866F7"; // DEBUG, we should not see red

              // const pathColor =
              //   isInHoverUpstream ? "#FFFFFF" : // white
              //   isOnAncestorPath && isOnDescendentPath ? "#F7D804" : // orange
              //   isOnAncestorPath ? "#6E73F6" : // blue
              //   isOnDescendentPath ? "#D341D5" : // purple
              //   "#D341D5"; // may momentarily have this color on defocus before the next render pass

              const role =
                isOnAncestorPath && isOnDescendentPath
                  ? "selectionConnection"
                  : // orange
                    isOnAncestorPath
                    ? "ancestorPath"
                    : // blue
                      isOnDescendentPath
                      ? "descendentPath"
                      : // purple
                        "descendentPath"; // may momentarily have this color on defocus before the next render pass

              // const labelColor = isInHoverUpstream ? "#D341D5" : "#FFFFFF";
              // const labelColor = "#000000";

              const isHighlighted =
                isInHoverUpstream || (isOnAncestorPath && isOnDescendentPath);

              return html`
                <token-graph-adjacency
                  isHighlighted=${isHighlighted}
                  .isHighlighted=${isHighlighted}
                  .role=${role}
                  .isFaded=${isFaded}
                  .label=${label}
                  .fromX=${fromX}
                  .fromY=${fromY}
                  .toX=${toX}
                  .toY=${toY}
                ></token-graph-adjacency>
              `;
            },
          )}
          ${repeat(
            this.nodeIds,
            (id) => id,
            (id) => {
              const { type, value = "", x, y } = this.graphState.nodes[id];
              const hasDownstream = this.graphState.adjacencyList[id]
                ? true
                : false;
              const isSelected =
                selectedTokens.indexOf(id) >= 0 ||
                selectedComponents.indexOf(id) >= 0;
              const isFocused = focusItems.indexOf(id) >= 0;
              const isFaded = isFocusMode && !isFocused;
              return html`
                <token-graph-node
                  style="transform: matrix(1,0,0,1,${x},${y});"
                  isFocused=${isFocused}
                  .isFaded=${isFaded}
                  isSelected=${isSelected}
                  type=${type}
                  ?isIntersect=${selectionDescendentIntersectNodes.indexOf(
                    id,
                  ) >= 0}
                  ?selected=${isSelected}
                  ?selectionAncestor=${selectionAncestorNodes.indexOf(id) >= 0}
                  ?selectionDescendent=${selectionDescendentNodes.indexOf(id) >=
                  0}
                  ?hasDownstream=${hasDownstream}
                  ?hoverUpstream=${renderedHoverUpstream.indexOf(id) >= 0}
                  id=${id}
                  value=${value}
                ></token-graph-node>
              `;
            },
          )}
        </div>
      </div>
    `;
  }
}

customElements.define("token-graph", TokenGraph);
