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

// this class provides a set of methods for performing model mutations upon a graph
// and handles the callbacks neccesary to emit state changes when appropriate

import GraphLayoutWorker from "../workers/graph-layout?worker";

import { GraphModel, GraphState, GraphNodeId } from "../models/graph-model";

import { AppModel, AppState } from "../models/app-model";

import { GraphDataSource } from "./graph-data-source";

import { StringMatchDictionaryItem } from "../workers/string-match";

export type NewGraphStateCallbackFn = (
  state: GraphState,
  listOfComponents: string[],
) => void;

export type NewDictionaryCallbackFn = (
  dictionary: StringMatchDictionaryItem[],
) => void;

// type GraphTraversalNodeTuple = [id:GraphNodeId,distance:number];

type KeyValueObject = { [key: string]: any };

interface RawJsonSets {
  [setEnumVal: string]: RawJsonItem;
}

// type FoundSetsTraversalItem = {
//   path: string[],
//   sets: RawJsonSets
// };

// type FoundValuesItem = {
//   path: string[],
//   value: string
// };

interface RawJsonItem {
  component?: string;
  value?: string;
  sets?: RawJsonSets;
}

// interface RawJsonData {
//   [tokenIdentifier: string] : RawJsonItem
// };

// import {
//   GRAPH_ROW_MARGIN,
//   GRAPH_COLUMN_WIDTH,
//   GRAPH_NODE_VALUE_HEIGHT,
//   GRAPH_NODE_VALUE_MARGIN,
//   GRAPH_NODE_VALUES_PADDING
// } from '../layout-consts'

export class GraphController {
  graphDataSource: GraphDataSource;

  completeGraphModel: GraphModel;

  displayGraphModel: GraphModel;

  baseDisplayGraphModel: GraphModel;

  appState: AppState;

  newGraphStateCallbacks: NewGraphStateCallbackFn[] = [];

  newDictionaryCallbacks: NewDictionaryCallbackFn[] = [];

  selectedComponent: string = "slider";

  listOfComponents: string[] = [];

  listOfOrphanNodes: string[] = [];

  graphLayoutWorker: Worker;

  constructor() {
    this.graphDataSource = new GraphDataSource();
    this.graphLayoutWorker = new GraphLayoutWorker();
    this.graphLayoutWorker.onmessage = this.recieveNewGraphLayout.bind(this);
    this.completeGraphModel = new GraphModel();
    this.displayGraphModel = new GraphModel();
    this.baseDisplayGraphModel = new GraphModel();
    this.appState = JSON.parse(JSON.stringify(AppModel.DEFAULT_STATE));
  }

  getNodeType(id: GraphNodeId) {
    const { type } = this.completeGraphModel._state.nodes[id];
    return type;
  }

  getDownstreamGraphFrom(...nodes: GraphNodeId[]): GraphModel {
    const results = new GraphModel();

    const nodesToAdd: string[] = [...nodes];

    const completeGraph = this.completeGraphModel.state;

    while (nodesToAdd.length > 0) {
      const id = nodesToAdd.shift() as string;
      const node = completeGraph.nodes[id];
      if (!node) {
        continue;
      }
      const adjacencies = completeGraph.adjacencyList[id] || [];
      nodesToAdd.push(...adjacencies);
      results._state.nodes[id] = node;
      if (adjacencies.length > 0) {
        results._state.adjacencyList[id] = adjacencies;
      }
    }

    return results;
  }

  getUpstreamGraphFrom(
    nodes: GraphNodeId[],
    sourceGraph: GraphModel = this.completeGraphModel,
  ): GraphModel {
    const results = new GraphModel();
    const nodesToAdd: string[] = [...nodes];
    const sourceState = sourceGraph.state;

    while (nodesToAdd.length > 0) {
      const id = nodesToAdd.shift() as string;
      const node = sourceState.nodes[id];
      if (!node) {
        continue;
      }
      results._state.nodes[id] = node;
      // step through ALL adjacencies looking for parents
      // adding them to the result nodes the FIRST time we find
      // them and adding the unique adjacency EACH time we
      // find them
      for (const fromId in sourceState.adjacencyList) {
        const toIds = sourceState.adjacencyList[fromId];
        if (toIds.indexOf(id) >= 0) {
          if (!results.hasNode(fromId)) {
            nodesToAdd.push(fromId);
          }
          results.createAdjacency(fromId, id);
        }
      }
    }

    results.dirtyState();

    return results;
  }

  getAncestorNodes(...nodeIds: string[]) {
    const graphModel = this.getUpstreamGraphFrom(nodeIds);
    return Object.keys(graphModel._state.nodes);
  }

  getDescendentNodes(...nodeIds: string[]) {
    const graphModel = this.getDownstreamGraphFrom(...nodeIds);
    return Object.keys(graphModel._state.nodes);
  }

  getDescendentIntersectNodes(...nodeIds: string[]): string[] {
    const arrayOfArraysOfNodeids = nodeIds.map((id) =>
      Object.keys(this.getDownstreamGraphFrom(id)._state.nodes),
    );
    if (arrayOfArraysOfNodeids.length <= 1) {
      return [];
    }
    const result = arrayOfArraysOfNodeids.reduce((a, b) =>
      a.filter((c) => b.includes(c)),
    );
    return result;
  }

  // Following the functional signature of the
  // JS native Object.assign(target, ...sources)
  //
  // Here we assign all the nodes and adjacencies
  // of the source graphs onto the target
  //
  assignGraphs(target: GraphModel, ...sources: GraphModel[]): GraphModel {
    sources.forEach((sourceGraph) => {
      Object.assign(target._state.nodes, sourceGraph._state.nodes);
      Object.entries(sourceGraph._state.adjacencyList).forEach(
        ([fromId, sourceAdjacencies]) => {
          const targetAdjacencies = target._state.adjacencyList[fromId];
          if (!targetAdjacencies) {
            target._state.adjacencyList[fromId] = sourceAdjacencies;
          } else {
            // const union = [...new Set([...array1, ...array2])]
            target._state.adjacencyList[fromId] = [
              ...new Set([...targetAdjacencies, ...sourceAdjacencies]),
            ];
          }
        },
      );
    });

    target.dirtyState();

    return target;
  }

  async hydrateFromJson() {
    const filters = this.appState.setFilters;

    this.completeGraphModel =
      await this.graphDataSource.getFilteredGraphModel(filters);

    this.listOfComponents = await this.graphDataSource.getAllComponentNames();

    // console.info(this.completeGraphModel.orphanNodes());

    // what is the subgraph that should ALWAYS be displayed?
    // ie.. the default state of the displayed graph when nothing is selected
    this.baseDisplayGraphModel = this.completeGraphModel.filter((node) => {
      const isComponent = node.type === "component";
      const isOrphanCategory = node.type === "orphan-category";
      return isComponent || isOrphanCategory;
    });

    this.updateDisplayGraph();
    this.emitNewDictionary();
    this.requestGraphLayout(this.displayGraphModel);
  }

  emitNewGraphState() {
    const newState = this.displayGraphModel.state;
    this.newGraphStateCallbacks.forEach((cb) =>
      cb(newState, [...this.listOfComponents]),
    );
  }

  emitNewDictionary() {
    const allIds = Object.keys(this.completeGraphModel._state.nodes);
    const newDictionary = allIds.map((id) => {
      const node = this.completeGraphModel._state.nodes[id];
      return {
        value: id,
        type: node.type,
        metadata: node.value || "",
      };
    });
    this.newDictionaryCallbacks.forEach((cb) => cb(newDictionary));
  }

  // used to subscribe to new graph states...
  onNewGraphState(cb: NewGraphStateCallbackFn) {
    this.newGraphStateCallbacks.push(cb);
  }

  // used to subscribe to new dictionary states...
  onDictionaryAvailable(cb: NewDictionaryCallbackFn) {
    this.newDictionaryCallbacks.push(cb);
  }

  async doSomeMutation() {
    // edit the model as much as we like...
    // then
    this.emitNewGraphState();
  }

  updateDisplayGraph() {
    const encodedComponents = this.appState.selectedComponents.join(",");
    const componentIds =
      encodedComponents === "ALL"
        ? [...this.listOfComponents]
        : this.appState.selectedComponents;

    const selectedTokens = this.appState.selectedTokens;
    const componentsDescendents = this.getDownstreamGraphFrom(...componentIds);
    const tokenAncestors = this.getUpstreamGraphFrom(selectedTokens);
    const tokenDescendents = this.getDownstreamGraphFrom(...selectedTokens);

    this.displayGraphModel = this.assignGraphs(
      componentsDescendents,
      tokenAncestors,
      tokenDescendents,
      this.baseDisplayGraphModel,
    );
  }

  async setAppState(newAppState: AppState) {
    let refreshDisplayGraph = false;
    let refreshSetFilters = false;

    const priorSetFilters = this.appState.setFilters.join(",");
    const newSetFilters = newAppState.setFilters.join(",");
    const priorEncodedComponents = this.appState.selectedComponents.join(",");
    const newEncodedComponents = newAppState.selectedComponents.join(",");
    const priorEncodedTokens = this.appState.selectedTokens.join(",");
    const newEncodedTokens = newAppState.selectedTokens.join(",");

    if (
      priorEncodedComponents !== newEncodedComponents ||
      priorEncodedTokens !== newEncodedTokens
    ) {
      refreshDisplayGraph = true;
    }

    if (priorSetFilters !== newSetFilters) {
      refreshSetFilters = true;
    }

    this.appState = newAppState;

    if (refreshSetFilters) {
      await this.hydrateFromJson();
    } else if (refreshDisplayGraph) {
      this.updateDisplayGraph();
      this.requestGraphLayout(this.displayGraphModel);
    }
  }

  recieveNewGraphLayout(event: any) {
    this.displayGraphModel.state = event.data;
    this.emitNewGraphState();
  }

  requestGraphLayout(graphModel: GraphModel) {
    this.graphLayoutWorker.postMessage(graphModel._state);
  }

  handleEvent(eventName: string, eventDetail: KeyValueObject) {
    switch (eventName) {
      case "node-dragmove":
        const zoom = this.appState.zoom;
        const node = this.displayGraphModel._state.nodes[eventDetail.id];
        const { deltaX, deltaY } = eventDetail.data;
        node.x = node.x + deltaX / zoom;
        node.y = node.y + deltaY / zoom;
        this.displayGraphModel._state.nodes[eventDetail.id] = node;
        this.displayGraphModel.dirtyState();
        break;
      default:
        break;
    }

    this.emitNewGraphState();
  }
}

export default GraphController;
