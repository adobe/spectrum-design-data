// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { generateSpacingScale } from "../../features/spacing/generate";
import { SPACING_DEFAULTS } from "../../features/spacing/defaults";
import { SpacingBar } from "./SpacingBar";

const meta = {
  title: "Views/Spacing bar",
  component: SpacingBar,
  parameters: { layout: "padded" },
  args: { step: 500, value: 8 },
  decorators: [
    (Story) => (
      <div role="list">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SpacingBar>;

export default meta;
type Story = StoryObj<typeof meta>;

async function barWidth(canvasElement: HTMLElement, index = 0) {
  return canvasElement
    .querySelectorAll<HTMLElement>("[data-testid='spacing-bar']")
    [index].getBoundingClientRect().width;
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("500")).toBeVisible();
    await expect(canvas.getByText("8px")).toBeVisible();
    await expect(await barWidth(canvasElement)).toBe(8);
  },
};

export const Smallest: Story = {
  args: { step: 100, value: 1 },
  play: async ({ canvasElement }) => {
    await expect(await barWidth(canvasElement)).toBe(1);
  },
};

export const Largest: Story = {
  args: { step: 1800, value: 144 },
  play: async ({ canvasElement }) => {
    await expect(await barWidth(canvasElement)).toBe(144);
  },
};

export const NegativeValueRendersEmpty: Story = {
  args: { step: 100, value: -3 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("-3px")).toBeVisible();
    await expect(await barWidth(canvasElement)).toBe(0);
  },
};

export const GlobalScale: Story = {
  render: () => (
    <>
      {generateSpacingScale(SPACING_DEFAULTS.scales[0]).map((value) => (
        <SpacingBar key={value.step} step={value.step} value={value.value} />
      ))}
    </>
  ),
  play: async ({ canvasElement }) => {
    const values = generateSpacingScale(SPACING_DEFAULTS.scales[0]);
    await expect(
      canvasElement.querySelectorAll("[role='listitem']"),
    ).toHaveLength(values.length);
    for (const [index, value] of values.entries()) {
      await expect(await barWidth(canvasElement, index)).toBe(value.value);
    }
  },
};

export const Narrow: Story = {
  ...GlobalScale,
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
