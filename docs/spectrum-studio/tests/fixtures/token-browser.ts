// Copyright 2026 Adobe. All rights reserved.
import {
  resolveBrowserTokens,
  type BrowserToken,
  type BrowserTokenSource,
} from "../../src/features/tokens/browserModel";

const sources: BrowserTokenSource[] = [
  {
    id: "red-100",
    type: "colors",
    groupId: "red",
    groupLabel: "Red",
    name: "red-color-100",
    value: "#ffcccc",
    generatedName: "red-color-100",
    generatedValue: "#ffcccc",
    unit: "",
  },
  {
    id: "red-200",
    type: "colors",
    groupId: "red",
    groupLabel: "Red",
    name: "red-color-200",
    value: "#ff7777",
    generatedName: "red-color-200",
    generatedValue: "#ff7777",
    unit: "",
  },
  {
    id: "spacing-100",
    type: "spacing",
    groupId: "global",
    groupLabel: "Global",
    name: "spacing-100",
    value: 0,
    generatedName: "spacing-100",
    generatedValue: 0,
    unit: "px",
  },
  {
    id: "spacing-200",
    type: "spacing",
    groupId: "global",
    groupLabel: "Global",
    name: "spacing-200",
    value: 8,
    generatedName: "spacing-200",
    generatedValue: 8,
    unit: "px",
  },
  {
    id: "spacing-300",
    type: "spacing",
    groupId: "global",
    groupLabel: "Global",
    name: "spacing-container-with-an-unusually-long-name-300",
    value: 2048,
    generatedName: "spacing-container-with-an-unusually-long-name-300",
    generatedValue: 2048,
    unit: "px",
  },
  {
    id: "font-100",
    type: "typography",
    groupId: "font-size",
    groupLabel: "Font size",
    name: "text-size-100",
    value: 16,
    generatedName: "text-size-100",
    generatedValue: 16,
    unit: "px",
  },
];

function project(
  token: BrowserToken,
  terms: [string, string, string | number][],
): BrowserToken {
  return {
    ...token,
    projection: {
      classification: {},
      flat: {},
      name: token.name,
      issues: [],
      segments: terms.map(([categoryId, categoryName, value]) => ({
        categoryId,
        categoryName,
        key: categoryId,
        termIds: [`${categoryId}:${value}`],
        values: [value],
      })),
    },
  };
}

export const browserStoryTokens = resolveBrowserTokens(sources, {}, "[]").map(
  (token) =>
    project(
      {
        ...token,
        ...(token.id === "red-200"
          ? {
              status: "deprecated" as const,
              description: "Previous brand color",
            }
          : {}),
      },
      token.type === "colors"
        ? [
            ["color", "Color name", "Red"],
            ["property", "Property", "color"],
            ["index", "Scale index", token.id === "red-100" ? 100 : 200],
          ]
        : token.type === "spacing"
          ? [
              ["category", "Token category", "Spacing"],
              ...(token.id === "spacing-300"
                ? [
                    [
                      "structure",
                      "Structure",
                      "Container with an unusually long name",
                    ] satisfies [string, string, string],
                  ]
                : []),
              [
                "index",
                "Scale index",
                token.id === "spacing-100"
                  ? 100
                  : token.id === "spacing-200"
                    ? 200
                    : 300,
              ],
            ]
          : [
              ["element", "Element", "Text"],
              ["property", "Property", "size"],
              ["index", "Scale index", 100],
            ],
    ),
);

export const singletonStoryTokens = [
  project(
    {
      ...browserStoryTokens[0],
      id: "orange",
      name: "illustrator-orange-color",
      generatedName: "illustrator-orange-color",
      value: "#ff9900",
      generatedValue: "#ff9900",
    },
    [
      ["color", "Color name", "Illustrator orange"],
      ["property", "Property", "color"],
    ],
  ),
];
export const hierarchyStoryTokens = [
  ...browserStoryTokens.slice(0, 2),
  ...singletonStoryTokens,
];
export const prefixStoryTokens = [
  project(
    {
      ...browserStoryTokens[0],
      id: "red",
      name: "red-color",
      generatedName: "red-color",
    },
    [
      ["color", "Color name", "Red"],
      ["property", "Property", "color"],
    ],
  ),
  ...browserStoryTokens.slice(0, 2),
];
export const aliasStoryTokens: BrowserToken[] = [
  ...hierarchyStoryTokens,
  {
    ...browserStoryTokens[0],
    id: "alias",
    name: "old-red",
    generatedName: "old-red",
    alias: {
      id: "alias",
      name: "old-red",
      $ref: "red-100",
      contexts: ["[]"],
      targetName: "red-color-100",
    },
  },
];
