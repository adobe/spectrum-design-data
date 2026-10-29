// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { TokenNameTag } from "./TokenNameTag";

const meta = {
  title: "Components/Token name tag",
  component: TokenNameTag,
  args: { name: "spacing-global-100" },
  decorators: [
    (Story) => (
      <div style={{ width: 240, maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TokenNameTag>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Dark: Story = {
  name: "Dark appearance",
  globals: { colorScheme: "dark" },
};
export const LongName: Story = {
  name: "Narrow long name",
  args: { name: "spacing-compact-layout-for-small-screens-100" },
  decorators: [
    (Story) => (
      <div style={{ width: 140 }}>
        <Story />
      </div>
    ),
  ],
};
