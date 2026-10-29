// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { MarkerRamp } from "./MarkerRamp";
import { transparencyRampBackground } from "../../components/transparencyBackground";

const meta = {
  title: "Views/Shared marker ramp",
  component: MarkerRamp,
  parameters: { layout: "padded" },
  args: {
    label: "Opacity ramp",
    background: transparencyRampBackground("black"),
    markers: [
      { id: "low", position: 0.94 },
      { id: "middle", position: 0.5 },
      { id: "high", position: 0.04 },
    ],
    focusedId: null,
  },
} satisfies Meta<typeof MarkerRamp>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Opacity: Story = {};
export const FocusedMarker: Story = { args: { focusedId: "middle" } };
export const DarkAppInk: Story = {
  args: { background: transparencyRampBackground("white") },
  globals: { colorScheme: "dark" },
};
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div className={style({ width: 96, height: 420 })}>
        <Story />
      </div>
    ),
  ],
};
