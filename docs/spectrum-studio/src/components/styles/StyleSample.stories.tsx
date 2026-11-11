// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { StyleSample } from "./StyleSample";
import type { StyleRow } from "../../features/styles/generation";
import type { StyleRecipe } from "../../features/styles/model";

const recipe: StyleRecipe = {
  id: "c1b6d74f-841e-4e27-8e03-87891f6f7a41",
  kind: "text",
  name: {
    categoryId: "59ce17fc-1fd0-431a-92e9-36bc98f51d3e",
    termId: "f428d4cd-a22b-4ce0-84bb-d7577995ab65",
  },
  classification: {},
  appearance: { color: { kind: "single", binding: { value: "#ffffff" } } },
  options: [],
  differences: {},
  applications: [],
};
const rows: StyleRow[] = (
  [
    ["color", "#ffffff"],
    ["fontFamily", "sans-serif"],
    ["fontWeight", 600],
    ["lineHeight", 1.5],
    ["borderWidth", 3],
  ] as const
).map(([property, value]) => ({
  conceptId: `fixture-${property}`,
  recipeId: recipe.id,
  key: property,
  name: `sample-${property}`,
  classification: {},
  property,
  value,
  unit: property === "borderWidth" ? "px" : "",
  optionIds: [],
  context: {},
  modeKey: "[]",
  token: { uuid: `fixture-row-${property}`, name: { property }, value },
}));
const meta = {
  title: "Styles/Sample",
  component: StyleSample,
  args: {
    recipe,
    rows,
    surface: "#202020",
    gamut: "srgb",
    label: "Style sample",
    large: true,
  },
  decorators: [
    (Story, context) => (
      <div style={{ padding: 32, background: context.args.surface }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StyleSample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Text: Story = {};
export const Icon: Story = {
  args: { recipe: { ...recipe, kind: "icon" }, icon: "Star" },
};
export const LightBackground: Story = {
  args: { recipe: { ...recipe, kind: "background" }, surface: "#ffffff" },
};
export const Border: Story = {
  args: { recipe: { ...recipe, kind: "border" } },
};
export const MissingColor: Story = { args: { rows: [] } };
export const DarkBackground: Story = {
  globals: { colorScheme: "dark" },
  args: {
    recipe: { ...recipe, kind: "background" },
    rows: rows.map((row) =>
      row.property === "color" ? { ...row, value: "#202020" } : row,
    ),
  },
};
