// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { ActionButton } from "@react-spectrum/s2";
import Delete from "@react-spectrum/s2/icons/Delete";
import { expect, fn, userEvent, within } from "@storybook/test";
import { PreviewListItem } from "./PreviewListItem";
import { NumericScaleRamp } from "./ScaleEditor";

const remove = fn();
const meta = {
  title: "Components/Preview list item",
  component: PreviewListItem,
  args: { label: "Button" },
  decorators: [
    (Story) => (
      <div style={{ width: 300, maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PreviewListItem>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Structure: Story = {
  args: {
    preview: (
      <span
        role="img"
        aria-label="Structure preview"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: 8,
          width: 100,
          background: "var(--spectrum-fuchsia-100)",
          border: "1px solid var(--spectrum-fuchsia-600)",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            background: "var(--spectrum-fuchsia-700)",
          }}
        />
        <span
          style={{
            width: 40,
            height: 5,
            background: "var(--spectrum-fuchsia-800)",
          }}
        />
      </span>
    ),
    actions: (
      <ActionButton
        size="S"
        isQuiet
        aria-label="Delete structure Button"
        onPress={remove}
      >
        <Delete />
      </ActionButton>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("img", { name: "Structure preview" }),
    ).toBeVisible();
    await userEvent.tab();
    await expect(
      canvas.getByRole("button", { name: "Delete structure Button" }),
    ).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(remove).toHaveBeenCalled();
    canvasElement.dataset.playComplete = "true";
  },
};
export const SizingScale: Story = {
  args: {
    label: "Size",
    preview: (
      <span style={{ display: "block", width: 100, height: 32 }}>
        <NumericScaleRamp values={[8, 12, 16, 20, 24]} />
      </span>
    ),
  },
};
export const ColorScale: Story = {
  args: {
    label: "Fuchsia",
    preview: (
      <span
        role="img"
        aria-label="Color scale preview"
        style={{
          width: 100,
          height: 32,
          background:
            "linear-gradient(to right, var(--spectrum-fuchsia-100), var(--spectrum-fuchsia-900))",
        }}
      />
    ),
  },
};
export const Dark: Story = { ...Structure, globals: { colorScheme: "dark" } };
