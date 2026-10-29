// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import type { MethodInterpolation } from "../../features/scales/interpolationDefinition";
import { InterpolationPreview } from "./InterpolationPreview";

const lineHeight: MethodInterpolation = {
  id: "interpolation-line-height",
  name: "Line height",
  description: "",
  kind: "method",
  method: "linear",
};

const meta = {
  title: "Components/Interpolation preview",
  component: InterpolationPreview,
  parameters: { layout: "padded" },
  args: { interpolation: lineHeight },
} satisfies Meta<typeof InterpolationPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LinearIsSquare: Story = {
  play: async ({ canvasElement }) => {
    const plot = within(canvasElement).getByTestId("interpolation-preview");
    const box = plot.getBoundingClientRect();
    await expect(box.width).toBe(box.height);
    await expect(
      within(canvasElement).getByRole("img", {
        name: "Line height shape from 0 to 1",
      }),
    ).toBeVisible();
  },
};

export const Cosine: Story = {
  args: { interpolation: { ...lineHeight, method: "cosine" } },
};

export const Exponential: Story = {
  args: { interpolation: { ...lineHeight, method: "exponential" } },
};

export const CustomExpressionFitted: Story = {
  args: {
    interpolation: {
      id: "interpolation-curve",
      name: "Squared",
      description: "",
      kind: "expression",
      parameters: [],
      expression: "x * x",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("x from 0 to 1")).toBeVisible();
    await expect(
      canvas.getByRole("img", { name: "Squared, plotted for x from 0 to 1" }),
    ).toBeVisible();
  },
};

export const InvalidExpressionIsEmpty: Story = {
  args: {
    interpolation: {
      id: "interpolation-bad",
      name: "Broken",
      description: "",
      kind: "expression",
      parameters: [],
      expression: "x +",
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement)
        .getByTestId("interpolation-preview")
        .querySelector("path"),
    ).toBeNull();
  },
};

export const Dark: Story = {
  globals: { colorScheme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
};
