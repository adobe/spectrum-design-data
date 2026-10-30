// Copyright 2026 Adobe. All rights reserved.
import type { TaxonomyCategory, TaxonomyTerm } from "../taxonomy/model";

export const STRUCTURE_CATEGORY_IDS = {
  property: "0bb57816-c2eb-4d6c-bfb1-ac5d7520e88a",
  position: "b07988e3-0510-4bf5-a531-86ea718b1000",
  constraint: "b07988e3-0510-4bf5-a531-86ea718b1001",
  axis: "b07988e3-0510-4bf5-a531-86ea718b1002",
} as const;

export const STRUCTURE_TERM_IDS = {
  width: "b07988e3-0510-4bf5-a531-86ea718b1100",
  height: "b07988e3-0510-4bf5-a531-86ea718b1101",
  gap: "b07988e3-0510-4bf5-a531-86ea718b1102",
  padding: "b07988e3-0510-4bf5-a531-86ea718b1103",
  position: "b07988e3-0510-4bf5-a531-86ea718b1104",
  direction: "b07988e3-0510-4bf5-a531-86ea718b1105",
  radius: "e809f072-65ad-4189-927c-5348330fc56c",
  elevation: "39b46d90-7157-4a98-9902-723d72646617",
  left: "b07988e3-0510-4bf5-a531-86ea718b1200",
  center: "b07988e3-0510-4bf5-a531-86ea718b1201",
  right: "b07988e3-0510-4bf5-a531-86ea718b1202",
  top: "b07988e3-0510-4bf5-a531-86ea718b1203",
  middle: "b07988e3-0510-4bf5-a531-86ea718b1204",
  bottom: "b07988e3-0510-4bf5-a531-86ea718b1205",
  topLeft: "b07988e3-0510-4bf5-a531-86ea718b1206",
  topRight: "b07988e3-0510-4bf5-a531-86ea718b1207",
  bottomRight: "b07988e3-0510-4bf5-a531-86ea718b1208",
  bottomLeft: "b07988e3-0510-4bf5-a531-86ea718b1209",
  minimum: "b07988e3-0510-4bf5-a531-86ea718b1300",
  maximum: "b07988e3-0510-4bf5-a531-86ea718b1301",
  horizontal: "b07988e3-0510-4bf5-a531-86ea718b1400",
  vertical: "b07988e3-0510-4bf5-a531-86ea718b1401",
} as const;

export const STRUCTURE_CATEGORIES: TaxonomyCategory[] = [
  { id: STRUCTURE_CATEGORY_IDS.position, key: "position", name: "Position" },
  {
    id: STRUCTURE_CATEGORY_IDS.constraint,
    key: "constraint",
    name: "Constraint",
  },
  { id: STRUCTURE_CATEGORY_IDS.axis, key: "axis", name: "Axis" },
].map((category) => ({
  ...category,
  description: "",
  valueType: "string",
  cardinality: "one",
  scopes: ["structures"],
  required: false,
  includeInProjections: true,
}));

const terms = (
  categoryId: string,
  entries: [string, string][],
): TaxonomyTerm[] =>
  entries.map(([id, value]) => ({
    id,
    categoryId,
    value: value.toLowerCase(),
    description: "",
  }));

export const STRUCTURE_TERMS = [
  ...terms(STRUCTURE_CATEGORY_IDS.property, [
    [STRUCTURE_TERM_IDS.width, "width"],
    [STRUCTURE_TERM_IDS.height, "height"],
    [STRUCTURE_TERM_IDS.gap, "gap"],
    [STRUCTURE_TERM_IDS.padding, "padding"],
    [STRUCTURE_TERM_IDS.position, "position"],
    [STRUCTURE_TERM_IDS.direction, "direction"],
  ]),
  ...terms(STRUCTURE_CATEGORY_IDS.position, [
    [STRUCTURE_TERM_IDS.left, "Left"],
    [STRUCTURE_TERM_IDS.center, "Center"],
    [STRUCTURE_TERM_IDS.right, "Right"],
    [STRUCTURE_TERM_IDS.top, "Top"],
    [STRUCTURE_TERM_IDS.middle, "Middle"],
    [STRUCTURE_TERM_IDS.bottom, "Bottom"],
    [STRUCTURE_TERM_IDS.topLeft, "Top left"],
    [STRUCTURE_TERM_IDS.topRight, "Top right"],
    [STRUCTURE_TERM_IDS.bottomRight, "Bottom right"],
    [STRUCTURE_TERM_IDS.bottomLeft, "Bottom left"],
  ]),
  ...terms(STRUCTURE_CATEGORY_IDS.constraint, [
    [STRUCTURE_TERM_IDS.minimum, "Minimum"],
    [STRUCTURE_TERM_IDS.maximum, "Maximum"],
  ]),
  ...terms(STRUCTURE_CATEGORY_IDS.axis, [
    [STRUCTURE_TERM_IDS.horizontal, "Horizontal"],
    [STRUCTURE_TERM_IDS.vertical, "Vertical"],
  ]),
];
