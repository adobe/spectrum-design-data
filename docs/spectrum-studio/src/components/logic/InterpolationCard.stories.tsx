// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { type MethodInterpolation } from "../../features/scales/interpolationDefinition";
import { DeletionToastProvider } from "../DeletionToastProvider";
import { InterpolationCard } from "./InterpolationCard";

const bodyLineHeight: MethodInterpolation = {
  id: "interpolation-body-line-height",
  name: "Body line height",
  description: "Line height percentage by font size.",
  kind: "method",
  method: "linear",
};

const meta = {
  title: "Components/Interpolation card",
  component: InterpolationCard,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <DeletionToastProvider>
        <div style={{ maxWidth: 440 }}>
          <Story />
        </div>
      </DeletionToastProvider>
    ),
  ],
  args: { interpolation: bodyLineHeight },
} satisfies Meta<typeof InterpolationCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LinearMethod: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("article", { name: "Body line height" }),
    ).toBeVisible();
    await expect(canvas.getByText("Linear")).toBeVisible();
    await expect(
      canvas.getByRole("img", { name: "Body line height shape from 0 to 1" }),
    ).toBeVisible();
    await expect(
      canvas.queryByText("Line height percentage by font size."),
    ).toBeNull();
  },
};

export const CosineMethod: Story = {
  args: {
    interpolation: {
      ...bodyLineHeight,
      id: "interpolation-cosine",
      name: "Eased",
      method: "cosine",
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Cosine")).toBeVisible();
  },
};

export const CustomExpression: Story = {
  args: {
    interpolation: {
      id: "interpolation-square",
      name: "Squared",
      description: "",
      kind: "expression",
      parameters: [],
      expression: "x * x",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Custom")).toBeVisible();
    await expect(canvas.getByText("x from 0 to 1")).toBeVisible();
  },
};

export const BuiltIn: Story = {
  args: {
    interpolation: {
      ...bodyLineHeight,
      name: "Shipped interpolation",
      locked: true,
    },
  },
};

export const Dark: Story = {
  globals: { colorScheme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
};
