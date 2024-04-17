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

// https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers

// let dictionary: string[] = [];

import {
  GraphState,
  GraphModel,
  GraphNodeId,
  ValuesListSplitter,
} from "../models/graph-model";

import {
  GRAPH_ROW_MARGIN,
  GRAPH_COLUMN_WIDTH,
  GRAPH_NODE_VALUE_HEIGHT,
  GRAPH_NODE_VALUE_MARGIN,
  GRAPH_NODE_VALUES_PADDING,
} from "../layout-consts";

type GraphTraversalNodeTuple = [id: GraphNodeId, distance: number];

function graphLayout(graphState: GraphState) {
  const graphModel = new GraphModel();
  graphModel.state = graphState;

  // const minX = 0;
  // const maxX = 0;
  // const minY = 0;
  // const maxY = 0;

  // for each node, what is the longest length
  // upstream adjacency path to an orphan node
  // to determine column assignment of the node
  // if the orphan is a component, ADD 1

  // const orphanNodes = graphModel.orphanNodes().sort();
  const orphanNodes = graphModel.orphanNodes().sort((a, b) => {
    const nodeA = graphState.nodes[a];
    const nodeB = graphState.nodes[b];

    if (nodeA.type === nodeB.type) {
      if (a === b) {
        return 0;
      }
      return a > b ? 1 : -1;
    } else {
      return nodeA.type === "component" ? -1 : 1;
    }

    // const d1 = a[1];
    // const d2 = b[1];
    // if (d1 === d2) { return 0; }
    // return d1 > d2 ? 1 : -1;
  });

  const nodesToLayout = orphanNodes.map((orphanId) => {
    // const node = graphModel._state.nodes[orphanId];
    // const initialColumn = node.type === 'component' || node.type === 'orphan-category' ? 0 : 1;
    return [orphanId, 0] as GraphTraversalNodeTuple;
  });

  // Sort our initial nodes in order of string ID comparison
  // nodesToLayout.sort((a, b) => {
  //   return a[0] > b[0] ? -1 : 1;
  // });

  // ensure our starting nodes for the layout loop
  // are in order of DEPTH, so that orphan nodes of depth 1
  // are considered after we have looked at all depth 0 nodes
  nodesToLayout.sort((a, b) => {
    const d1 = a[1];
    const d2 = b[1];
    if (d1 === d2) {
      return 0;
    }
    return d1 > d2 ? 1 : -1;
  });

  // return;
  const columnNodeAssignments: string[][] = [];
  const columnInsertionPoints: number[] = [];
  const mapOfValidInsertionPoints: { [nodeId: string]: number[] } = {};

  // which nodes in the graph have downstream adjacencies?
  // const nodesWithDownstream = Object.keys(graphModel._state.adjacencyList);

  let maxWidth = 0;
  let maxHeight = 0;

  while (nodesToLayout.length > 0) {
    const [id, depth] = nodesToLayout.shift() as GraphTraversalNodeTuple;

    const node = graphModel._state.nodes[id];
    const nodeValue = node.value || "";
    const nodeRowCount = nodeValue.split(ValuesListSplitter).length;
    const adjacencies = graphModel._state.adjacencyList[id] || [];
    adjacencies.sort(); // ensure downstream adjacencies are alpha sorted...
    const nextDepth = depth + 1;
    const adjacencyTuples: GraphTraversalNodeTuple[] = adjacencies.map(
      (nextId) => [nextId, nextDepth],
    );

    nodesToLayout.push(...adjacencyTuples);

    if (typeof columnInsertionPoints[depth] !== "number") {
      columnInsertionPoints[depth] = 0;
      columnNodeAssignments[depth] = [];
    }

    node.x = depth * GRAPH_COLUMN_WIDTH;
    node.y = columnInsertionPoints[depth];

    columnInsertionPoints[depth] +=
      GRAPH_ROW_MARGIN +
      nodeRowCount * GRAPH_NODE_VALUE_HEIGHT +
      (GRAPH_NODE_VALUE_MARGIN * nodeRowCount - 1) +
      GRAPH_NODE_VALUES_PADDING * 2;

    // set the x parameter of the node based on the DEPTH
    // set the y parameter of the node based on the columnInsertionPoint for this DEPTH
    // only mutate the first instance of the node in our traversal
    if (columnNodeAssignments[depth].indexOf(id) === -1) {
      columnNodeAssignments[depth].push(id);
      // remove node from prior columns...
      for (let index = 0; index < depth; index++) {
        const earlierColumnAssignments = columnNodeAssignments[index];
        const placedIndex = earlierColumnAssignments.indexOf(id);
        if (placedIndex >= 0) {
          earlierColumnAssignments.splice(placedIndex, 1);
        }
      }

      // clear prior map of valid insertion points...
      mapOfValidInsertionPoints[id] = [];
    }

    if (!mapOfValidInsertionPoints[id]) {
      mapOfValidInsertionPoints[id] = [];
    }

    mapOfValidInsertionPoints[id].push(node.y);

    maxWidth = Math.max(maxWidth, node.x);
    maxHeight = Math.max(maxHeight, node.y);
  }

  for (const [nodeId, listOfInsertionPoints] of Object.entries(
    mapOfValidInsertionPoints,
  )) {
    if (listOfInsertionPoints.length > 2) {
      const middleIndex = Math.floor(listOfInsertionPoints.length / 2);
      const insertionPoint = listOfInsertionPoints[middleIndex];
      graphModel._state.nodes[nodeId].y = insertionPoint;
    }
  }

  const columnOffsets: number[] = [];

  for (let index = 0; index <= columnInsertionPoints.length - 1; index++) {
    // console.info(index);
    const columnHeight = columnInsertionPoints[index];
    columnOffsets[index] = (maxHeight - columnHeight) / 2;
  }

  let priorColumnAncestorYValues = [0];

  columnNodeAssignments.forEach((assignments, colIndex) => {
    const averageAncestorY =
      priorColumnAncestorYValues.reduce((a, b) => a + b, 0) /
      priorColumnAncestorYValues.length;
    priorColumnAncestorYValues = [];
    const columnHeight = columnInsertionPoints[colIndex];
    const offset = colIndex === 0 ? 0 : averageAncestorY - columnHeight / 2;
    // console.info(colIndex,columnHeight);

    assignments.forEach((nodeId) => {
      const { y } = graphModel._state.nodes[nodeId];

      // const offset = columnOffsets[colIndex] || 0;
      const newY = y + offset;
      graphModel._state.nodes[nodeId].y = newY;
      maxHeight = Math.max(maxHeight, newY);

      if (graphModel._state.adjacencyList[nodeId]) {
        // this node has descendents.. so it's Y placement is
        // relevant to the yOffset calculation for the NEXT
        // column...
        priorColumnAncestorYValues.push(newY);
      }
    });
  });

  graphModel.setSize(maxWidth, maxHeight);

  self.postMessage(graphModel.state);
}

self.addEventListener("message", (event) => graphLayout(event.data));
