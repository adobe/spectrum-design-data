// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "@storybook/test";
import Checkmark from "@react-spectrum/s2/icons/Checkmark";
import { IconValuePreview } from "./IconValuePreview";

const meta = {
  title: "Components/Icon value preview",
  component: IconValuePreview,
  argTypes: { icon: { control: false } },
} satisfies Meta<typeof IconValuePreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector(".valuePreviewIcon")).toHaveStyle({
      width: "16px",
      height: "16px",
    });
    await expect(canvasElement.querySelector("svg")).toBeVisible();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Customized: Story = {
  args: {
    icon: <Checkmark />,
    style: { width: 24, height: 24, color: "#c40000" },
  },
};
