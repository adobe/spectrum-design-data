// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { UsedByTags } from "./UsedByTags";

const meta = {
  title: "Components/Used by tags",
  component: UsedByTags,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
  args: { consumers: [{ id: "spacing/global", label: "Spacing › Global" }] },
} satisfies Meta<typeof UsedByTags>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleUse: Story = {
  play: async ({ canvasElement }) => {
    const tags = within(canvasElement).getByRole("grid", { name: "Used by" });
    await expect(within(tags).getAllByRole("row")).toHaveLength(1);
    await expect(tags).toHaveTextContent("Spacing › Global");
  },
};

export const SeveralUses: Story = {
  args: {
    consumers: [
      { id: "typography/text-size", label: "Typography › Text size" },
      {
        id: "typography/line-height",
        label: "Typography › Line height and spacing",
      },
      { id: "spacing/global", label: "Spacing › Global" },
      { id: "size/global", label: "Size › Global" },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(
        within(canvasElement).getByRole("grid", { name: "Used by" }),
      ).getAllByRole("row"),
    ).toHaveLength(4);
  },
};

export const NotUsed: Story = {
  args: { consumers: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Not used")).toBeVisible();
    await expect(canvas.queryByRole("grid")).toBeNull();
  },
};

export const Dark: Story = {
  globals: { colorScheme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
};
