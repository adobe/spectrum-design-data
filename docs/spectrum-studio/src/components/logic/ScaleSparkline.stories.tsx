// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import {
  createScaleType,
  SCALE_TYPE_DEFAULTS,
} from "../../features/scales/scaleType";
import { ScaleSparkline } from "./ScaleSparkline";

const meta = {
  title: "Components/Scale sparkline",
  component: ScaleSparkline,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
  args: { scaleType: SCALE_TYPE_DEFAULTS[0] },
} satisfies Meta<typeof ScaleSparkline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Geometric: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("img", {
        name: "Type scale values for indices -4 to 8",
      }),
    ).toBeVisible();
    await expect(
      canvas.getByText("Indices -4 to 8 from a base of 14"),
    ).toBeVisible();
  },
};

export const Linear: Story = { args: { scaleType: SCALE_TYPE_DEFAULTS[2] } };

export const CustomExpression: Story = {
  args: {
    scaleType: {
      ...createScaleType(),
      name: "Doubling",
      expression: "base * pow(2, i / 2)",
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("img", {
        name: "Doubling values for indices -4 to 8",
      }),
    ).toBeVisible();
  },
};

export const GapsWhereUndefined: Story = {
  args: {
    scaleType: {
      ...createScaleType(),
      name: "Square root",
      expression: "base + sqrt(i)",
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("img")).toBeVisible();
  },
};

export const InvalidExpression: Story = {
  args: {
    scaleType: { ...createScaleType(), name: "Broken", expression: "base +" },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent(
      "No preview available.",
    );
  },
};

export const Dark: Story = {
  globals: { colorScheme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
};
