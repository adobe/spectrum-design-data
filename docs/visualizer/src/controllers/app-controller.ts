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

// import StringMatchWorker from '../workers/string-match.js?worker'

import { AppModel, AppState } from "../models/app-model";
import { GraphController } from "./graph-controller";

import {
  GRAPH_NODE_WIDTH,
  MINIMUM_CANVAS_RENDER_SCALE,
  MAXIMUM_CANVAS_RENDER_SCALE,
  GRAPH_NODE_HEIGHT,
  HEADER_HEIGHT,
  SIDEBAR_WIDTH,
} from "../layout-consts";

export type NewAppStateCallbackFn = (state: AppState) => void;

type KeyValueObject = { [key: string]: any };

// interface Point {
//   x: number;
//   y: number;
// }

export class AppController {
  graphController: GraphController;

  appModel: AppModel;

  newAppStateCallbacks: NewAppStateCallbackFn[] = [];

  _priorAppState: AppState;

  _priorTopologyKey: string = "";

  constructor({
    graphController,
    selectedComponents,
    selectedTokens,
    setFilters,
  }: {
    graphController: GraphController;
    selectedComponents: string[];
    selectedTokens: string[];
    setFilters: string[];
  }) {
    this._priorAppState = JSON.parse(JSON.stringify(AppModel.DEFAULT_STATE));
    this.graphController = graphController;
    this.appModel = new AppModel();

    this.initialize({
      selectedComponents,
      selectedTokens,
      setFilters,
    });
  }

  async initialize({
    selectedComponents,
    selectedTokens,
    setFilters,
  }: {
    selectedComponents: string[];
    selectedTokens: string[];
    setFilters: string[];
  }) {
    this.graphController.setAppState(this.appModel.state);

    this.graphController.onNewGraphState(this.handleNewGraphState.bind(this));

    await this.graphController.hydrateFromJson();

    this.appModel.setListOfComponents(this.graphController.listOfComponents);

    const encodedSelectedComponents = selectedComponents.join(",");

    const selectedComponentIds =
      encodedSelectedComponents === "ALL"
        ? [...this.graphController.listOfComponents]
        : selectedComponents;

    this.appModel.setSelectedComponents(selectedComponentIds);
    this.appModel.setSelectedTokens(selectedTokens);
    this.appModel.setSetFilters(setFilters);

    this.emitNewAppState();
  }

  emitNewAppState() {
    const newState = this.appModel.state;
    this._priorAppState = newState;
    this.newAppStateCallbacks.forEach((cb) => cb(newState));
    this.graphController.setAppState(newState);
  }

  onNewAppState(cb: NewAppStateCallbackFn) {
    this.newAppStateCallbacks.push(cb);
  }

  handleNewGraphState() {
    const isFullscreenMode = this.appModel._state.fullscreenMode;

    const newTopologyKey =
      this.graphController.displayGraphModel._state.topologyKey +
      isFullscreenMode;

    // ONLY proceed if topology has changed...
    if (this._priorTopologyKey === newTopologyKey) {
      return;
    }

    this._priorTopologyKey = newTopologyKey;

    const selectedTokens = this.appModel._state.selectedTokens;
    const selectedComponents = this.appModel._state.selectedComponents;
    const ancestors = this.graphController.getAncestorNodes(...selectedTokens);
    const descendents = this.graphController.getDescendentNodes(
      ...selectedTokens,
      ...selectedComponents,
    );
    const descendentIntersect =
      this.graphController.getDescendentIntersectNodes(
        ...selectedTokens,
        ...selectedComponents,
      );

    this.appModel.setSelectionAncestorNodes(ancestors);
    this.appModel.setSelectionDescendentNodes(descendents);
    this.appModel.setSelectionDescendentIntersectNodes(descendentIntersect);

    // Are all selections in the view?
    // adjust zoom AND pan to ensure that all selected nodes are within
    // the viewport...
    const allSelections = [
      ...selectedTokens,
      ...selectedComponents,
      ...descendents,
      ...ancestors,
    ];

    // const focusPoints: Point[] = [];

    let foundMinX: number | undefined;
    let foundMinY: number | undefined;
    let foundMaxX: number | undefined;
    let foundMaxY: number | undefined;

    const zoom = this.appModel._state.zoom;

    allSelections.forEach((id) => {
      const node = this.graphController.displayGraphModel._state.nodes[id];
      if (node) {
        foundMinX = Math.min(foundMinX || node.x, node.x - 50);
        foundMinY = Math.min(foundMinY || node.y, node.y - 50);
        foundMaxX = Math.max(
          foundMaxX || node.x,
          node.x + 50 + GRAPH_NODE_WIDTH,
        );
        foundMaxY = Math.max(
          foundMaxY || node.y,
          node.y + 50 + GRAPH_NODE_HEIGHT,
        );
      }
    });

    const minX = foundMinX || 0;
    const maxX = foundMaxX || 0;
    const minY = foundMinY || 0;
    const maxY = foundMaxY || 0;

    if (allSelections.length >= 1) {
      const leftSafeArea = isFullscreenMode ? 0 : SIDEBAR_WIDTH;
      const topSafeArea = isFullscreenMode ? 0 : HEADER_HEIGHT;

      // what is the viewport size?
      const windowWidth = window.innerWidth - leftSafeArea;
      const windowHeight = window.innerHeight - topSafeArea;

      const contentFrameWidth = maxX - minX;
      const contentFrameHeight = maxY - minY;

      // console.info(panX,panY,zoom);

      const contentFrameRelativeScale = Math.max(
        (contentFrameWidth * zoom) / windowWidth,
        (contentFrameHeight * zoom) / windowHeight,
      );

      const zoomDelta = 1 / contentFrameRelativeScale;

      let newZoom = zoom * zoomDelta;

      newZoom = Math.min(
        MAXIMUM_CANVAS_RENDER_SCALE,
        Math.max(MINIMUM_CANVAS_RENDER_SCALE, newZoom),
      );

      const scaledContentFrameWidth = contentFrameWidth * newZoom;
      const scaledContentFrameHeight = contentFrameHeight * newZoom;

      const scaledMinX = minX * newZoom - leftSafeArea;
      const scaledMinY = minY * newZoom - topSafeArea;

      const widthDiff = windowWidth - scaledContentFrameWidth;
      const xOffset = widthDiff / 2;

      const heightDiff = windowHeight - scaledContentFrameHeight;
      const yOffset = heightDiff / 2;

      // console.info(windowHeight, scaledContentFrameHeight);

      this.appModel.setZoom(newZoom);

      this.appModel.setPan(-scaledMinX + xOffset, -scaledMinY + yOffset);
      // console.info(1/contentFrameRelativeScale);

      // what is the zoom level?

      // console.info(windowWidth,windowHeight,zoom);
      // what is the rendered graph size scaled to viewport coordinates?
      // what is the heuristic used for determining an illegal pan position?
      // how is this heuristic integrated with zoom gestures?
    }

    this.emitNewAppState();
  }

  handleHoverOver(nodeId: string) {
    // check that we're not already hovered over this id...
    if (this.appModel._state.hoverNodeId === nodeId) {
      return;
    }
    const ancestors = this.graphController.getAncestorNodes(nodeId);
    const currentSelectionAncestors =
      this.appModel._state.selectionAncestorNodes;
    const currentSelectionDescendents =
      this.appModel._state.selectionDescendentNodes;
    const displayedGraphNodes = currentSelectionAncestors.concat(
      currentSelectionDescendents,
    );
    const result = ancestors.filter((graphNodeId) =>
      displayedGraphNodes.includes(graphNodeId),
    );
    this.appModel.setHoverId(nodeId);
    this.appModel.setHoverUpstreamNodes(result);
  }

  handleHoverOut(nodeId: string) {
    // check that we're leaving the node we think we came in on
    if (this.appModel._state.hoverNodeId === nodeId) {
      this.appModel.setHoverId("");
      this.appModel.setHoverUpstreamNodes([]);
    }
  }

  toggleGraphNodeSelection(graphNodeId: string, modifierKey: boolean = false) {
    const node =
      this.graphController.completeGraphModel._state.nodes[graphNodeId];
    const isComponent = node ? node.type === "component" : false;
    let selectedComponents = this.appModel.getSelectedComponents();
    let selectedTokens = this.appModel.getSelectedTokens();
    const deselectingThisId =
      selectedComponents.indexOf(graphNodeId) >= 0 ||
      selectedTokens.indexOf(graphNodeId) >= 0;

    // REMOVE selection is it is already in the set
    if (deselectingThisId) {
      if (isComponent) {
        selectedComponents.splice(selectedComponents.indexOf(graphNodeId), 1);
      } else {
        selectedTokens.splice(selectedTokens.indexOf(graphNodeId), 1);
      }
      // ADD selection if modifier if pressed
    } else if (modifierKey) {
      if (isComponent) {
        selectedComponents.push(graphNodeId);
      } else {
        selectedTokens.push(graphNodeId);
      }

      // REPLACE selection if clicking without modifier
    } else {
      if (isComponent) {
        selectedComponents = graphNodeId ? [graphNodeId] : [];
        selectedTokens = [];
      } else {
        selectedComponents = [];
        selectedTokens = graphNodeId ? [graphNodeId] : [];
      }
    }

    const allSelections = [...selectedComponents, ...selectedTokens];

    const ancestors = this.graphController.getAncestorNodes(...allSelections);
    const descendents = this.graphController.getDescendentNodes(
      ...allSelections,
    );
    const descendentIntersect =
      this.graphController.getDescendentIntersectNodes(...allSelections);

    if (deselectingThisId) {
      this.appModel.setHoverId("");
      this.appModel.setHoverUpstreamNodes([]);
    }

    this.appModel.setSelectedComponents(selectedComponents);
    this.appModel.setSelectedTokens(selectedTokens);
    this.appModel.setSelectionAncestorNodes(ancestors);
    this.appModel.setSelectionDescendentNodes(descendents);
    this.appModel.setSelectionDescendentIntersectNodes(descendentIntersect);

    // NOTE: at this point, we do NOT YET KNOW where selected nodes
    //       are going to be placed in the resulting layout...
    //       if we want to adjust pan or zoom position, we must
    //       wait for the results of the graph-layout operation
    //       that is run async on a web-worker...
  }

  setZoomCenteredOnCanvas(newZoom: number) {
    newZoom = Math.min(
      MAXIMUM_CANVAS_RENDER_SCALE,
      Math.max(MINIMUM_CANVAS_RENDER_SCALE, newZoom),
    );
    const zoomDiff = newZoom / this.appModel._state.zoom;
    const centerX = SIDEBAR_WIDTH + (window.innerWidth - SIDEBAR_WIDTH) / 2;
    const centerY = HEADER_HEIGHT + (window.innerHeight - HEADER_HEIGHT) / 2;
    const offsetX = this.appModel._state.panX - centerX;
    const offsetY = this.appModel._state.panY - centerY;
    const newPanX = centerX + offsetX * zoomDiff;
    const newPanY = centerY + offsetY * zoomDiff;
    this.appModel.setPan(newPanX, newPanY);
    this.appModel.setZoom(newZoom);
  }

  // setNewPanPosition(x:number,y:number) {
  //   // @TODO: method for validating a new pan position
  //   // what is the viewport size?
  //   // what is the zoom level?
  //   // what is the rendered graph size scaled to viewport coordinates?
  //   // what is the heuristic used for determining an illegal pan position?
  //   // how is this heuristic integrated with zoom gestures?
  //   this.appModel.setPan(x,y);
  // }

  handleEvent(eventName: string, eventDetail: KeyValueObject) {
    switch (eventName) {
      case "node-pointerover":
        this.handleHoverOver(eventDetail.id);
        break;
      case "node-pointerout":
        this.handleHoverOut(eventDetail.id);
        break;
      case "generic-gesture-start":
      case "node-dragstart":
        this.appModel.setIsDragging(true);
        break;
      case "generic-gesture-end":
      case "node-dragend":
        this.appModel.setIsDragging(false);
        break;
      case "filters-selected":
        // console.info(eventDetail.value);
        this.appModel.setSetFilters(eventDetail.value as string[]);
        break;
      case "set-fullscreen-mode":
        this.appModel.setFullscreenMode(eventDetail.value);
        this.handleNewGraphState();
        break;
      case "set-zoom":
        this.appModel.setZoom(eventDetail.value);
        break;
      case "set-zoom-centered-on-canvas":
        this.setZoomCenteredOnCanvas(eventDetail.value);
        break;
      case "select-id":
        this.toggleGraphNodeSelection(eventDetail.id, true);
        break;
      case "panning-input-delta":
        const newX = this.appModel._state.panX + eventDetail.x;
        const newY = this.appModel._state.panY + eventDetail.y;
        this.appModel.setPan(newX, newY);
        break;
      case "set-panning-position":
        this.appModel.setPan(eventDetail.x, eventDetail.y);
        break;
      case "close-tab":
        this.toggleGraphNodeSelection(eventDetail.value, true);
        break;
      case "close-all-tabs":
        this.toggleGraphNodeSelection("", false);
        break;
      case "node-click":
        this.toggleGraphNodeSelection(eventDetail.id, true);
        break;
      // case 'node-doubleclick':
      //   this.toggleGraphNodeSelection(eventDetail.id, eventDetail.shiftKey || eventDetail.ctrlKey || eventDetail.metaKey);
      //   break;
      // case 'node-expand':
      //   this.toggleTokenSuperSelection(eventDetail.id);
      //   break;
      // case 'toolbar-select-component':
      //   this.handleToolbarSelectComponent(eventDetail.value);
      //   break;
      // case 'theme-selected':
      //   this.appModel.setSelectedTheme(eventDetail.value);
      //   break;
      case "set-spectrum-color-theme":
        this.appModel.setSpectrumColorTheme(eventDetail.value);
        break;
      // case 'scale-selected':
      //   this.appModel.setSelectedScale(eventDetail.value);
      //   break;
      default:
        break;
    }

    this.emitNewAppState();
  }

  // setSelectedComponent(selectedComponent: string) {
  //   this.selectedComponent = selectedComponent;
  //   this.updateDisplayGraphModel();
  //   this.emitNewGraphState();
  // }

  async doSomeMutation() {
    // edit the model as much as we like...
    // then
    this.emitNewAppState();
  }
}

export default AppController;
