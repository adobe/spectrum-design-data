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
      <div role="list" className="spacingScaleList">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SpacingBar>;

export default meta;
type Story = StoryObj<typeof meta>;

function bars(canvasElement: HTMLElement) {
  return canvasElement.querySelectorAll<HTMLElement>(
    "[data-testid='spacing-bar']",
  );
}

async function barHeight(canvasElement: HTMLElement, index = 0) {
  return bars(canvasElement)[index].getBoundingClientRect().height;
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const index = canvas.getByText("500");
    const value = canvas.getByText("8px");
    await expect(index).toBeVisible();
    await expect(value).toBeVisible();
    await expect(await barHeight(canvasElement)).toBe(8);
    // Index sits above the value, both under the bar, in the shared 12px label style.
    const bar = bars(canvasElement)[0].getBoundingClientRect();
    const indexBox = index.getBoundingClientRect();
    await expect(indexBox.top).toBeGreaterThanOrEqual(bar.bottom);
    await expect(value.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      indexBox.bottom,
    );
    await expect(getComputedStyle(value).fontSize).toBe("12px");
  },
};

export const Smallest: Story = {
  args: { step: 100, value: 1 },
  play: async ({ canvasElement }) => {
    await expect(await barHeight(canvasElement)).toBe(1);
  },
};

export const Largest: Story = {
  args: { step: 1800, value: 144 },
  play: async ({ canvasElement }) => {
    await expect(await barHeight(canvasElement)).toBe(144);
  },
};

export const NegativeValueRendersEmpty: Story = {
  args: { step: 100, value: -3 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("-3px")).toBeVisible();
    await expect(await barHeight(canvasElement)).toBe(0);
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
      await expect(await barHeight(canvasElement, index)).toBe(value.value);
    }
    // Columns run left to right and share a bottom baseline.
    const boxes = [...bars(canvasElement)].map((bar) =>
      bar.getBoundingClientRect(),
    );
    for (let index = 1; index < boxes.length; index += 1) {
      await expect(boxes[index].left).toBeGreaterThan(boxes[index - 1].left);
      await expect(boxes[index].bottom).toBe(boxes[0].bottom);
    }
  },
};

export const Narrow: Story = {
  ...GlobalScale,
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
