// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { RadiusSample } from "./RadiusSample";

const meta = {
  title: "Views/Radius sample",
  component: RadiusSample,
  args: { radius: 8, label: "Radius sample" },
  parameters: { layout: "centered" },
} satisfies Meta<typeof RadiusSample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Base: Story = {};
export const Zero: Story = { args: { radius: 0 } };
export const Small: Story = { args: { radius: 4 } };
export const Large: Story = { args: { radius: 24 } };
export const SampleBoundary: Story = {
  name: "Sample boundary",
  args: { radius: 56 },
};
export const Oversized: Story = { args: { radius: 80 } };
export const Negative: Story = { args: { radius: -2 } };
export const Invalid: Story = { args: { radius: NaN } };
