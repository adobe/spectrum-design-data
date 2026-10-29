// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { DataVisExamples } from "./DataVisExamples";
import {
  storyDiverging,
  storySequential,
  storySurface,
  storySwatches,
} from "./storyFixtures";

const meta = {
  title: "Views/Data vis examples",
  component: DataVisExamples,
  args: {
    name: "Story sequence",
    colors: [],
    evaluate: storySequential.evaluate,
  },
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div
        data-data-vis-story
        className={storySurface}
        style={{ width: "100%", maxWidth: 680, minWidth: 0 }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DataVisExamples>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Sequential: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas
        .getByRole("img", { name: "Story sequence heatmap example" })
        .querySelectorAll("rect"),
    ).toHaveLength(48);
    const values = canvas.getByRole("button", { name: "Sample values" });
    values.focus();
    await userEvent.keyboard("{Enter}");
    await expect(
      canvas.getByRole("grid", { name: "Story sequence sample values" }),
    ).toBeVisible();
    await expect(
      canvas.getByText("Row 1, column 1", { exact: true }),
    ).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Diverging: Story = {
  args: {
    name: "Story divergence",
    diverging: true,
    evaluate: storyDiverging.evaluate,
  },
};
export const Categorical: Story = {
  args: {
    name: "Story categories",
    evaluate: undefined,
    colors: storySwatches.map((color) => color.value),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas
        .getByRole("img", { name: "Story categories category example" })
        .querySelectorAll("text"),
    ).toHaveLength(3);
    await userEvent.click(
      canvas.getByRole("button", { name: "Sample values" }),
    );
    await expect(
      canvas.getByRole("grid", { name: "Story categories sample values" }),
    ).toBeVisible();
    await expect(canvas.getByText("87", { exact: true })).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Empty: Story = {
  args: { name: "Empty categories", evaluate: undefined },
};
export const ManyCategories: Story = {
  name: "Many categories",
  args: {
    name: "Many categories",
    evaluate: undefined,
    colors: Array.from(
      { length: 25 },
      (_, index) => storySwatches[index % 3].value,
    ),
  },
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
