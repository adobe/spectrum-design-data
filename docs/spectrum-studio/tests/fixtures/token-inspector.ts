// Copyright 2026 Adobe. All rights reserved.
import {
  projectBrowserTokens,
  resolveBrowserTokens,
  canonicalTokenModeKey,
  type BrowserTokenEdits,
  type BrowserTokenSource,
} from "../../src/features/tokens/browserModel";
import type { CanonicalAliasRow } from "../../src/features/tokens/aliasTargets";
import type { TaxonomyDocument } from "../../src/features/taxonomy/model";
import type { ModeSet } from "../../src/features/modes/model";

const categoryId = "11111111-1111-4111-8111-111111111111";
const termIds = [
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
  "55555555-5555-4555-8555-555555555555",
  "66666666-6666-4666-8666-666666666666",
  "77777777-7777-4777-8777-777777777777",
  "88888888-8888-4888-8888-888888888888",
  "99999999-9999-4999-8999-999999999999",
];
export const inspectorTaxonomy: TaxonomyDocument = {
  schemaVersion: 1,
  order: [categoryId],
  classifications: {},
  categories: [
    {
      id: categoryId,
      key: "label",
      name: "Token",
      description: "",
      valueType: "string",
      cardinality: "one",
      scopes: ["colors", "spacing", "elevation", "opacity"],
      required: true,
      includeInProjections: true,
    },
  ],
  terms: [
    "action-background",
    "replacement-background",
    "space-medium",
    "shadow-medium",
    "alternative-background",
    "opacity-medium",
    "opacity-replacement",
    "new-alias",
  ].map((value, index) => ({
    id: termIds[index],
    categoryId,
    value,
    description: "",
  })),
};
export const inspectorModeSets: ModeSet[] = [
  {
    id: "scheme",
    key: "colorScheme",
    name: "Color scheme",
    description: "",
    defaultModeId: "light",
    authoringCapabilities: ["color.backgroundLightness"],
    modes: ["light", "dark"].map((id) => ({
      id,
      key: id,
      name: id === "light" ? "Light" : "Dark",
      description: "",
      iconId: "none",
      platformIds: [],
      foundations: id === "dark" ? { color: { backgroundLightness: 0.1 } } : {},
    })),
  },
  {
    id: "contrast",
    key: "contrast",
    name: "Contrast",
    description: "",
    defaultModeId: "regular",
    modes: ["regular", "low", "high"].map((id) => ({
      id,
      key: id,
      name: id[0].toUpperCase() + id.slice(1),
      description: "",
      iconId: "none",
      platformIds: [],
      foundations: {},
    })),
  },
];
export const inspectorModeKey = canonicalTokenModeKey({
  scheme: "light",
  contrast: "regular",
});

export function inspectorRows(
  edits: BrowserTokenEdits = {},
): CanonicalAliasRow[] {
  return inspectorModeSets[0].modes.flatMap((scheme) =>
    inspectorModeSets[1].modes.flatMap((contrast) => {
      const context = canonicalTokenModeKey({
        scheme: scheme.id,
        contrast: contrast.id,
      });
      const definitions: Omit<
        BrowserTokenSource,
        "name" | "generatedName" | "generatedValue" | "groupLabel"
      >[] = [
        {
          id: "primary",
          type: "colors",
          groupId: "colors",
          value: scheme.id === "light" ? "#1473e6" : "#7abaff",
          unit: "",
        },
        {
          id: "replacement",
          type: "colors",
          groupId: "colors",
          value: scheme.id === "light" ? "#0265dc" : "#94c5ff",
          unit: "",
        },
        {
          id: "spacing",
          type: "spacing",
          groupId: "spacing",
          value: 16,
          unit: "px",
        },
        {
          id: "shadow",
          type: "elevation",
          groupId: "shadows",
          value: "0px 2px 4px 0px rgba(0, 0, 0, 0.2)",
          unit: "",
          literalShadows: [
            {
              x: "0px",
              y: "2px",
              blur: "4px",
              spread: "0px",
              color: "rgba(0, 0, 0, 0.2)",
            },
          ],
        },
        {
          id: "alternative",
          type: "colors",
          groupId: "colors",
          value: "#1d1d1d",
          unit: "",
        },
        {
          id: "opacity",
          type: "opacity",
          groupId: "opacity",
          value: scheme.id === "light" ? 0.4 : 0.7,
          unit: "",
        },
        {
          id: "opacity-replacement",
          type: "opacity",
          groupId: "opacity",
          value: 0.6,
          unit: "",
        },
      ];
      const sources: BrowserTokenSource[] = definitions.map(
        (source, index) => ({
          ...source,
          name: String(inspectorTaxonomy.terms[index].value),
          generatedName: String(inspectorTaxonomy.terms[index].value),
          generatedValue: source.value,
          groupLabel: source.groupId,
          taxonomySource: {
            id: source.id,
            governed: { [categoryId]: termIds[index] },
          },
        }),
      );
      return projectBrowserTokens(
        resolveBrowserTokens(sources, edits, context, { includeManual: true }),
        inspectorTaxonomy,
      ).map((token) => ({
        id: token.id,
        rowId: `${token.id}-${scheme.id}-${contrast.id}`,
        context,
        name: token.name,
        token,
      }));
    }),
  );
}
