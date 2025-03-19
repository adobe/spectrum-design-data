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

import { randomId } from "../utilities/index.js";

export type GraphNodeId = string;

export const ValuePathSplitter = ":^;";
export const ValuesListSplitter = ":*;";

export interface GraphNode {
  type: "token" | "component" | "orphan-category";
  id: GraphNodeId;
  x: number;
  y: number;
  value?: string;
  adjacencyLabels?: { [targetId: string]: string };
}

export interface MutableGraphNodeProperties {
  x?: number;
  y?: number;
  value?: string;
  adjacencyLabels?: { [targetId: string]: string };
}

export interface GraphState {
  width: number;
  height: number;
  topologyKey: string;
  nodes: { [uniquenessKey: string]: GraphNode };
  adjacencyList: { [GraphNodeId: string]: GraphNodeId[] };
}

// export const DEFAULT_GRAPH_STATE = {

// };

export class GraphModel {
  static readonly DEFAULT_STATE: GraphState = {
    width: 0,
    height: 0,
    topologyKey: "",
    nodes: {},
    adjacencyList: {},
  };

  _state: GraphState;

  // our cached state representation,  get's
  // re-generated on next state-read any time
  // a mutation calls dirtyState so that
  // we can call dirtyState MANY times
  // syncronously without needing to
  // regenerate our stringified state for
  // output...
  _stringifiedState: string;

  _dirtyTopology: boolean = true;

  constructor() {
    this._state = JSON.parse(JSON.stringify(GraphModel.DEFAULT_STATE));
    this._stringifiedState = "";
  }

  filter(fn: (node: GraphNode) => boolean): GraphModel {
    const result = new GraphModel();
    const nodeIds = Object.keys(this._state.nodes);
    const adjacencyKeys = Object.keys(this._state.adjacencyList);
    nodeIds.forEach((id) => {
      if (fn(this._state.nodes[id])) {
        result.createNode(JSON.parse(JSON.stringify(this._state.nodes[id])));
      }
    });
    adjacencyKeys.forEach((id) => {
      if (result._state.nodes[id]) {
        const adjacencyTargets = this._state.adjacencyList[id];
        adjacencyTargets.forEach((targetId) => {
          if (result._state.nodes[targetId]) {
            result.createAdjacency(id, targetId);
          }
        });
      }
    });
    return result;
  }

  dirtyState() {
    this._stringifiedState = "";
  }

  get stringifiedState() {
    if (!this._stringifiedState) {
      if (this._dirtyTopology === true) {
        this._state.topologyKey = randomId();
        this._dirtyTopology = false;
      }
      this._stringifiedState = JSON.stringify(this._state);
    }
    return this._stringifiedState;
  }

  orphanNodes(): string[] {
    let result = Object.keys(this._state.nodes);
    const adjacencies = Object.values(this._state.adjacencyList);
    // update the results object with a filtered array
    adjacencies.forEach(
      (adjacencyList) =>
        (result = result.filter((x) => !adjacencyList.includes(x))),
    );
    return result;
  }

  hasNode(nodeId: string): boolean {
    return this._state.nodes[nodeId] ? true : false;
  }

  createNode(node: GraphNode) {
    this._state.nodes[node.id] = node;
    this.dirtyState();
  }

  updateNode(id: GraphNodeId, updatedProperties: MutableGraphNodeProperties) {
    const target = this._state.nodes[id];
    if (!target) {
      return;
    }
    Object.assign(target, updatedProperties);
    this.dirtyState();
  }

  deleteNode(id: GraphNodeId) {
    // remove node record
    delete this._state.nodes[id];
    // remove downstream adjacency connections
    delete this._state.adjacencyList[id];
    // remove upstream adjacency connections
    // @NOTE: this could be done more efficiently
    //        if we kept a seperate datastore
    //        of upstream connections keyed to target but
    //        that would inflate the model structure
    //        dramatically for large data sets
    for (const fromNodeId in this._state.adjacencyList) {
      const toIndex = this._state.adjacencyList[fromNodeId].indexOf(id);
      if (toIndex >= 0) {
        this._state.adjacencyList[fromNodeId].splice(toIndex, 1);
      }
    }
    this._dirtyTopology = true;
    this.dirtyState();
  }

  createAdjacency(from: GraphNodeId, to: GraphNodeId, label?: string) {
    const list: GraphNodeId[] = this._state.adjacencyList[from] || [];

    if (list.indexOf(to) === -1) {
      list.push(to);
      this._state.adjacencyList[from] = list;
    }

    if (label) {
      const hostNode = this._state.nodes[from];
      if (hostNode) {
        const adjacencyLabels = hostNode.adjacencyLabels || {};
        adjacencyLabels[to] = label;
        Object.assign(hostNode, { adjacencyLabels });
      }
    }

    this._dirtyTopology = true;
    this.dirtyState();
  }

  deleteAdjacency(from: GraphNodeId, to: GraphNodeId) {
    const list: GraphNodeId[] = this._state.adjacencyList[from] || [];
    const currentIndex = list.indexOf(to);
    if (currentIndex >= 0) {
      list.splice(currentIndex, 1);
      this._state.adjacencyList[from] = list;
    }
    this._dirtyTopology = true;
    this.dirtyState();
  }

  setSize(w: number, h: number) {
    this._state.width = w;
    this._state.height = h;
    this.dirtyState();
  }

  reset() {
    this._state = JSON.parse(JSON.stringify(GraphModel.DEFAULT_STATE));
    this._dirtyTopology = true;
    this.dirtyState();
  }

  get state() {
    return JSON.parse(this.stringifiedState);
  }

  set state(newState: GraphState) {
    this._state = newState;
    this.dirtyState();
  }
}

export default GraphModel;
