// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { dataVisComparisonPage } from "../../../features/color-system/data-vis/analysis";
import { DataVisComparisonTable } from "./DataVisComparisonTable";
import { storySurface, storySwatches } from "./storyFixtures";

const observations = [
  ...storySwatches,
  { id: "pale-gray", label: "Pale gray", value: "#eeeeee" },
].map((color, index) => ({
  id: color.id,
  label: color.label,
  value: color.value,
  position: index / 3,
}));
const rows = dataVisComparisonPage(observations, "#ffffff", "srgb", "normal", {
  kind: "background",
}).rows;
const meta = {
  title: "Views/Data vis comparisons",
  component: DataVisComparisonTable,
  args: { rows },
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div
        data-data-vis-story
        className={storySurface}
        style={{ width: "100%", maxWidth: 1000, minWidth: 0 }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DataVisComparisonTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Background: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const grid = canvas.getByRole("grid", {
      name: "Data vis color comparisons",
    });
    await expect(grid).toBeVisible();
    grid.scrollTo({ left: grid.scrollWidth });
    const meters = await canvas.findAllByRole("meter");
    await expect(meters).toHaveLength(4);
    for (const meter of meters)
      await expect(meter).toHaveAttribute("aria-valuemax", "100");
    await expect(canvas.getByText("Fail (3:1)")).toBeVisible();
    await expect(canvas.queryByText(/difference target/)).toBeNull();
    canvasElement.dataset.playComplete = "true";
  },
};
export const CategoricalPairs: Story = {
  name: "Categorical pairs",
  args: {
    rows: dataVisComparisonPage(observations, "#ffffff", "srgb", "normal", {
      kind: "adjacent",
    }).rows,
    deltaETarget: 11,
  },
};
export const Simulation: Story = {
  args: {
    rows: dataVisComparisonPage(
      observations,
      "#ffffff",
      "srgb",
      "deuteranopia",
      { kind: "adjacent" },
    ).rows,
    deltaETarget: 11,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText("Simulation, not a WCAG result"),
    ).toHaveLength(3);
    await expect(canvas.queryByText(/Pass \(3:1\)|Fail \(3:1\)/)).toBeNull();
    canvasElement.dataset.playComplete = "true";
  },
};
export const DisplayP3: Story = {
  name: "Display P3",
  args: {
    rows: dataVisComparisonPage(
      [
        {
          id: "p3",
          label: "Wide-gamut blue",
          value: "color(display-p3 0.2 0.4 0.8)",
          position: 0,
        },
      ],
      "#ffffff",
      "display-p3",
      "normal",
      { kind: "background" },
    ).rows,
  },
};
export const Empty: Story = { args: { rows: [] } };
export const OneColor: Story = {
  name: "One color",
  args: { rows: rows.slice(0, 1) },
};
export const Dark: Story = { globals: { colorScheme: "dark" } };
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: "min(320px, 100%)" }}>
        <Story />
      </div>
    ),
  ],
};
