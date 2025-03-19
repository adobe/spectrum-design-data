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

export const GRAPH_COLUMN_WIDTH = 650;
export const GRAPH_ROW_HEIGHT = 20;
export const GRAPH_NODE_WIDTH = 450;
export const GRAPH_NODE_HEIGHT = 20;
export const GRAPH_NODE_VALUE_HEIGHT = 16;
export const GRAPH_NODE_VALUE_MARGIN = 2;
export const GRAPH_NODE_VALUES_PADDING = 3;
export const GRAPH_ROW_MARGIN = 4;
export const MINIMUM_CANVAS_RENDER_SCALE = 0.1;
export const MAXIMUM_CANVAS_RENDER_SCALE = 2;
export const HEADER_HEIGHT = 55;
export const SIDEBAR_WIDTH = 250;

export const ORDERED_TOKEN_FILTER_CATEGORIES: string[] = [
  "theme",
  "color",
  "scale",
];

export const CATEGORIZED_TOKEN_FILTERS: { [category: string]: string[] } = {
  theme: ["spectrum", "express"],
  color: ["light", "dark", "darkest", "wireframe"],
  scale: ["desktop", "mobile"],
};

export const CATEGORIZED_TOKEN_FILTER_LABELS: { [category: string]: string } = {
  theme: "Theme",
  color: "Color Theme",
  scale: "Scale",
};
