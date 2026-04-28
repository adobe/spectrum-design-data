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

// type KeyValueObject = {[key: string]: any};

type SpectrumColorThemeValue = "" | "light" | "dark";

export interface AppState {
  panX: number;
  panY: number;
  zoom: number;
  spectrumColorTheme: SpectrumColorThemeValue;
  isDragging: boolean;
  fullscreenMode: boolean;
  hoverNodeId: string;
  setFilters: string[];
  listOfComponents: string[]; // what are the spectrum component names?
  selectedTokens: string[]; // which tokens in the graph are 'selected'?
  selectionAncestorNodes: string[]; // what nodes are ancestors of 'selected' nodes?
  selectionDescendentNodes: string[]; // what nodes are descendents of 'selected' nodes?
  selectionDescendentIntersectNodes: string[]; // what nodes are descendents of 'selected' nodes?
  componentDescendentNodes: string[]; // what nodes are descendents of the the selected 'component' nodes?
  selectedComponents: string[]; // what are the selected component nodes?
  hoverUpstreamNodes: string[]; // what selectionDescendentNodes OR selectionAncestorNodes nodes are in the hovered nodes upstream tree?
}

export class AppModel {
  static readonly DEFAULT_STATE: AppState = {
    panX: 380,
    panY: 130,
    zoom: 0.7,
    spectrumColorTheme: "dark",
    isDragging: false,
    fullscreenMode: false,
    hoverNodeId: "",
    setFilters: ["spectrum", "light", "desktop"],
    listOfComponents: [],
    selectedTokens: [],
    selectionAncestorNodes: [],
    selectionDescendentNodes: [],
    selectionDescendentIntersectNodes: [],
    componentDescendentNodes: [],
    selectedComponents: [],
    hoverUpstreamNodes: [],
  };

  _state: AppState;

  // our cached state representation,  get's
  // re-generated on next state-read any time
  // a mutation calls dirtyState so that
  // we can call dirtyState MANY times
  // syncronously without needing to
  // regenerate our stringified state for
  // output...
  _stringifiedState: string;

  constructor() {
    this._state = JSON.parse(JSON.stringify(AppModel.DEFAULT_STATE));
    this._stringifiedState = "";
  }

  dirtyState() {
    this._stringifiedState = "";
  }

  get stringifiedState() {
    if (!this._stringifiedState) {
      this._stringifiedState = JSON.stringify(this._state);
    }
    return this._stringifiedState;
  }

  // setStringValue(key:string,value:string) {
  //   this._state[key] = value;
  //   this.dirtyState();
  // }

  setFullscreenMode(b: boolean) {
    this._state.fullscreenMode = b;
    this.dirtyState();
  }

  setIsDragging(b: boolean) {
    this._state.isDragging = b;
    this.dirtyState();
  }

  setPan(x: number, y: number) {
    this._state.panX = x;
    this._state.panY = y;
    this.dirtyState();
  }

  setZoom(z: number) {
    this._state.zoom = z;
    this.dirtyState();
  }

  setHoverId(id: string) {
    if (id !== this._state.hoverNodeId) {
      this._state.hoverNodeId = id;
      this.dirtyState();
    }
  }

  getSetFilters() {
    return JSON.parse(JSON.stringify(this._state.setFilters));
  }

  setSetFilters(value: string[]) {
    this._state.setFilters = value;
    this.dirtyState();
  }

  getSelectedComponents() {
    return JSON.parse(JSON.stringify(this._state.selectedComponents));
  }

  setSelectedComponents(value: string[]) {
    this._state.selectedComponents = value;
    this.dirtyState();
  }

  setSpectrumColorTheme(value: SpectrumColorThemeValue) {
    this._state.spectrumColorTheme = value;
    this.dirtyState();
  }

  getSelectedTokens() {
    return JSON.parse(JSON.stringify(this._state.selectedTokens));
  }

  setSelectedTokens(value: string[]) {
    this._state.selectedTokens = value;
    this.dirtyState();
  }

  setSelectionAncestorNodes(value: string[]) {
    this._state.selectionAncestorNodes = value;
    this.dirtyState();
  }

  setSelectionDescendentNodes(value: string[]) {
    this._state.selectionDescendentNodes = value;
    this.dirtyState();
  }

  setSelectionDescendentIntersectNodes(value: string[]) {
    this._state.selectionDescendentIntersectNodes = value;
    this.dirtyState();
  }

  setListOfComponents(value: string[]) {
    this._state.listOfComponents = value;
    this.dirtyState();
  }

  setComponentDescendentNodes(value: string[]) {
    this._state.componentDescendentNodes = value;
    this.dirtyState();
  }

  setHoverUpstreamNodes(value: string[]) {
    this._state.hoverUpstreamNodes = value;
    this.dirtyState();
  }

  reset() {
    this._state = JSON.parse(JSON.stringify(AppModel.DEFAULT_STATE));
    this.dirtyState();
  }

  get state() {
    return JSON.parse(this.stringifiedState);
  }

  set state(newState: AppState) {
    this._state = JSON.parse(JSON.stringify(newState));
    this.dirtyState();
  }
}

export default AppModel;
