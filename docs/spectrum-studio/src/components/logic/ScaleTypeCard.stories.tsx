// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, waitFor, within } from "@storybook/test";
import {
  createScaleType,
  SCALE_TYPE_DEFAULTS,
} from "../../features/scales/scaleType";
import { DeletionToastProvider } from "../DeletionToastProvider";
import { ScaleTypeCard } from "./ScaleTypeCard";

const meta = {
  title: "Components/Scale card",
  component: ScaleTypeCard,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <DeletionToastProvider>
        <div style={{ maxWidth: 520 }}>
          <Story />
        </div>
      </DeletionToastProvider>
    ),
  ],
  args: { scaleType: SCALE_TYPE_DEFAULTS[0] },
} satisfies Meta<typeof ScaleTypeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ShippedTypeScale: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText("Built-in")).toBeNull();
    await expect(
      canvas.getByText("Geometric", { selector: "span" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "View formula Type scale" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("img", {
        name: "Type scale values for indices -4 to 8",
      }),
    ).toBeVisible();
    await waitFor(() =>
      expect(canvasElement.querySelector(".katex math")).not.toBeNull(),
    );
    await expect(
      canvas.getByText("Foundations can override: Base, Ratio, Offset"),
    ).toBeVisible();
    // Typography uses the Type scale formula, so it lists where it is used.
    await expect(canvas.getByLabelText("Used by")).toBeVisible();
    await expect(canvas.queryByText("Not used")).toBeNull();
  },
};

export const ShippedLinear: Story = {
  args: { scaleType: SCALE_TYPE_DEFAULTS[2] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Linear", { selector: "span" }),
    ).toBeVisible();
  },
};

export const NothingOverridable: Story = {
  args: { scaleType: { ...createScaleType("geometric"), name: "Fixed ratio" } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Foundations cannot override any part"),
    ).toBeVisible();
  },
};

export const CustomExpression: Story = {
  args: {
    scaleType: {
      ...createScaleType(),
      name: "Custom grid",
      expression: "base * 2 + i / 4",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Custom")).toBeVisible();
    await expect(
      canvas.queryByText("Doubles the base, then steps by index."),
    ).toBeNull();
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
