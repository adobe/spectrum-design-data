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

import { fetchJsonAsync } from "../utilities/index.js";

import {
  GraphModel,
  GraphState,
  ValuePathSplitter,
  ValuesListSplitter,
} from "../models/graph-model";

export type NewGraphStateCallbackFn = (
  state: GraphState,
  listOfComponents: string[],
) => void;

export type NewDictionaryCallbackFn = (dictionary: string[]) => void;

interface RawJsonSets {
  [setEnumVal: string]: RawJsonItem;
}

type FoundSetsTraversalItem = {
  path: string[];
  sets: RawJsonSets;
};

type FoundValuesItem = {
  path: string[];
  value: string;
};

interface RawJsonItem {
  component?: string;
  value?: string;
  sets?: RawJsonSets;
}

interface RawSpectrumTokenJson {
  [tokenIdentifier: string]: RawJsonItem;
}

const SOURCE_PATH =
  "https://raw.githubusercontent.com/adobe/spectrum-tokens/beta/packages/tokens/";

const MANIFEST_JSON = "manifest.json";

export class GraphDataSource {
  listOfComponents: string[] = [];

  listOfOrphanTokens: string[] = [];

  _completeSpectrumTokenJson: RawSpectrumTokenJson = {};

  //
  // A promise for the complete spectrum token json
  // - if we don't have it yet, we go and get it
  // - otherwise, we just return the previously fetched data
  //
  async getCompleteSpectrumTokenJson(): Promise<RawSpectrumTokenJson> {
    if (Object.keys(this._completeSpectrumTokenJson).length > 0) {
      return this._completeSpectrumTokenJson;
    }

    const listOfSourceFiles = await fetchJsonAsync(SOURCE_PATH + MANIFEST_JSON);

    const results: RawSpectrumTokenJson = {};

    for (let index = 0; index < listOfSourceFiles.length; index++) {
      const data = (await fetchJsonAsync(
        SOURCE_PATH + listOfSourceFiles[index],
      )) as RawSpectrumTokenJson;
      Object.assign(results, data);
    }

    return results;
  }

  async getAllComponentNames(): Promise<string[]> {
    if (this.listOfComponents.length > 0) {
      return this.listOfComponents;
    }

    const allTokens = await this.getCompleteSpectrumTokenJson();
    const allTokenIds = Object.keys(allTokens);
    const results = allTokenIds.reduce((accumulator, currentItem) => {
      const component = allTokens[currentItem].component;
      if (component && accumulator.indexOf(component) === -1) {
        accumulator.push(component);
      }
      return accumulator;
    }, [] as string[]);

    return results;
  }

  //
  // @TODO: cache layer for filtered results?
  //
  async getFilteredGraphModel(filters: string[]): Promise<GraphModel> {
    const results = new GraphModel();
    const allTokens = await this.getCompleteSpectrumTokenJson();
    const nodeIds = Object.keys(allTokens);

    for (let index = 0; index < nodeIds.length; index++) {
      const nodeId = nodeIds[index];
      const nodeData = allTokens[nodeId];
      const foundValues: FoundValuesItem[] = [];
      const foundSets: FoundSetsTraversalItem[] = [];

      if (nodeData.value) {
        foundValues.push({
          path: [],
          value: nodeData.value,
        });
      }

      if (nodeData.sets) {
        foundSets.push({
          path: [],
          sets: nodeData.sets,
        });
      }

      // if this node belongs to a spectrum component
      // register the component itself as a node
      // and add an adjacency from that component
      // to this node
      if (nodeData.component) {
        // add the component node only if it does not yet exist
        if (results.hasNode(nodeData.component) === false) {
          results.createNode({
            type: "component",
            id: nodeData.component,
            x: 0,
            y: 0,
          });
          this.listOfComponents.push(nodeData.component);
        }

        // add the adjacency between the component and this node
        results.createAdjacency(nodeData.component, nodeId);
      }

      // use a data structure here to keep track
      // of the SET access path used to access the mapped
      // values that are ultimately found for this
      // token...

      while (foundSets.length > 0) {
        const foundSetsTraversalItem =
          foundSets.pop() as FoundSetsTraversalItem;
        const foundSet = foundSetsTraversalItem.sets;
        const foundPath = foundSetsTraversalItem.path;

        filters.forEach((filterValue) => {
          const filteredItem = foundSet[filterValue] as RawJsonItem | undefined;
          const thisPath = [...foundPath, filterValue];
          if (filteredItem) {
            if (filteredItem.value) {
              foundValues.push({
                path: thisPath,
                value: filteredItem.value,
              });
              // foundValues.push(`${filteredItem.value} (${thisPath.join(',')})`);
            }
            if (filteredItem.sets) {
              foundSets.push({
                path: thisPath,
                sets: filteredItem.sets,
              });
            }
          }
        });
      }

      if (foundValues.length === 0) {
        // console.warn('FAILED TO FIND VALUE FOR', nodeId, nodeData);
      }

      // First, we add this BARE NODE to the graph
      // with no value or downstream adjaciencies...
      //
      // This means the graph will ALWAYS have ALL NODES
      //
      results.createNode({
        type: "token",
        id: nodeId,
        x: 0,
        y: 0,
      });

      // depending on the filter selections,
      // a given node may have more than one
      // value or downstream adjacency
      // so here we add all appropriate nodes
      // and adjacencies to the graph...
      const rawValues: string[] = [];
      foundValues.forEach((foundValueItem) => {
        const valuePath = foundValueItem.path;
        let foundValue = foundValueItem.value.toString();
        // is this found value a downstream adjacency?
        // if so, add it to the graph...
        if (
          foundValue.charAt(0) + foundValue.charAt(foundValue.length - 1) ===
          "{}"
        ) {
          const referencedNodeId = foundValue.substring(
            1,
            foundValue.length - 1,
          );
          // add the adjacency
          // DOES this adjacency ALREADY exist?  If so, merge the valuePath arrays so that
          // we can display the full list of unique values...
          const currentSourceNode = results._state.nodes[nodeId];
          const adjacencyLabels = currentSourceNode.adjacencyLabels
            ? currentSourceNode.adjacencyLabels
            : {};
          const currentLabel = adjacencyLabels[referencedNodeId] || "";
          const currentLabelValues =
            currentLabel.length > 0 ? currentLabel.split(",") : [];
          const newUniqeValues = [
            ...new Set([...currentLabelValues, ...valuePath]),
          ];
          results.createAdjacency(
            nodeId,
            referencedNodeId,
            newUniqeValues.join(","),
          );
          // ELSE, it is an actual value...
        } else {
          if (valuePath.length > 0) {
            foundValue += `${ValuePathSplitter}${valuePath.join(",")}`;
          }
          rawValues.push(foundValue);
        }
      });

      if (rawValues.length > 0) {
        results.updateNode(nodeId, {
          value: rawValues.join(ValuesListSplitter),
        });
      }
    }

    let orphanNodes = results.orphanNodes();
    orphanNodes = orphanNodes.filter(
      (nodeId) => results._state.nodes[nodeId].type !== "component",
    );
    const orphanCategories: string[] = [];

    orphanNodes.forEach((id) => {
      const parts = id.split("-");
      const orphanCategory = parts[0];
      if (!orphanCategories.includes(orphanCategory)) {
        orphanCategories.push(orphanCategory);
        results.createNode({
          type: "orphan-category",
          id: `${orphanCategory}-*`,
          x: 0,
          y: 0,
        });
      }
    });

    // THIS IS NOT EFFICIENT...
    // CONSIDER PUSHING THIS ENTIRE METHOD TO A WORKER
    orphanCategories.forEach((orphanCategory) => {
      const prefix = `${orphanCategory}-`;
      nodeIds.forEach((nodeId) => {
        if (nodeId.indexOf(prefix) === 0) {
          // THIS NODE IS IN THIS CATEGORY
          results.createAdjacency(`${orphanCategory}-*`, nodeId);
        }
      });
    });

    return results;
  }
}

export default GraphDataSource;
