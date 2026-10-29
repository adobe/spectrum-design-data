// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { TextValuePreview } from "./TextValuePreview";

const meta = {
  title: "Components/Text value preview",
  component: TextValuePreview,
  args: { fontSize: 16, fontWeight: 400, fontStyle: "normal" },
  argTypes: {
    fontStyle: { control: "select", options: ["normal", "italic", "oblique"] },
    fontFamily: { control: "text" },
  },
} satisfies Meta<typeof TextValuePreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Ag")).toHaveStyle({
      fontSize: "16px",
      fontWeight: "400",
      width: "24px",
      height: "24px",
    });
    canvasElement.dataset.playComplete = "true";
  },
};
export const Customized: Story = {
  args: {
    fontSize: 20,
    fontWeight: 600,
    fontStyle: "italic",
    fontFamily: "serif",
  },
};
