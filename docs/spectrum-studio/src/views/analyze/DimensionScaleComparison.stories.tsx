// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { dimensionExampleInput } from "../../../tests/fixtures/dimension-foundations";
import { DimensionScaleComparison } from "./DimensionScaleComparison";

const meta = {
  title: "Views/Dimension scale analysis",
  component: DimensionScaleComparison,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ width: "100%", maxWidth: 840 }}>
        <Story />
      </div>
    ),
  ],
  args: { noun: "spacing", input: dimensionExampleInput() },
} satisfies Meta<typeof DimensionScaleComparison>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Static: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("radio", { name: "By token" }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Show values" }));
    await expect(canvas.getByRole("table")).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Adaptive: Story = {
  args: { input: dimensionExampleInput(true) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: "By token" }));
    await expect(canvas.getByRole("img", { name: /by token$/ })).toBeVisible();
    await expect(
      canvasElement.querySelectorAll("g[data-series-id]"),
    ).toHaveLength(5);
    await expect(
      canvasElement.querySelector('g[data-series-id="100"]'),
    ).toHaveAttribute("data-baseline", "true");
    canvasElement.dataset.playComplete = "true";
  },
};
export const MultipleConnections: Story = {
  name: "Multiple connections",
  args: { input: dimensionExampleInput(true, true) },
};
export const NoNamedModes: Story = {
  name: "No named modes",
  args: { input: { ...dimensionExampleInput(true), modeSets: [] } },
};
export const Error: Story = {
  args: { input: { ...dimensionExampleInput(), rules: [] } },
};
export const Narrow: Story = {
  args: { input: dimensionExampleInput(true) },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
};
