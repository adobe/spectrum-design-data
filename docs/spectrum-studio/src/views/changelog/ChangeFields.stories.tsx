// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { Provider } from "@react-spectrum/s2";
import { ChangeFields } from "./ChangeFields";
import type { ChangeItem } from "../../features/changelog/changes";
import { createValuePreview } from "../../features/tokens/valuePreview";

const item: ChangeItem = {
  id: "space-100",
  title: "Space 100",
  topic: "tokens",
  sourceKind: "token",
  kind: "modified",
  fields: [
    {
      id: "description",
      key: "Description",
      before: "Base spacing",
      after: "Updated spacing",
      address: {
        path: ["browserTokenEdits", "space-100", "description"],
        expected: "Updated spacing",
      },
    },
    {
      id: "light",
      key: "Value",
      context: { key: "light", label: "Color scheme: Light" },
      before: "8px",
      after: "12px",
      generated: true,
      beforePreview: createValuePreview("block", 8, "px"),
      afterPreview: createValuePreview("block", 12, "px"),
    },
    {
      id: "dark",
      key: "Value",
      context: { key: "dark", label: "Color scheme: Dark" },
      before: "8px",
      after: "16px",
      generated: true,
      beforePreview: createValuePreview("block", 8, "px"),
      afterPreview: createValuePreview("block", 16, "px"),
    },
  ],
  upstream: [
    {
      title: "Global / Base",
      address: {
        path: ["spacing", "scales", { key: "id", id: "global" }, "base"],
        expected: 12,
      },
    },
  ],
};
const meta = {
  title: "Changes/Changed fields",
  component: ChangeFields,
  parameters: { layout: "padded" },
  args: { item, editing: true, onReset: fn() },
  decorators: [
    (Story) => (
      <Provider colorScheme="light">
        <div style={{ maxWidth: 520 }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
  play: async ({ canvasElement }) => {
    canvasElement.dataset.playComplete = "true";
  },
} satisfies Meta<typeof ChangeFields>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Mixed: Story = {
  name: "Mixed authored and generated values",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Value")).toHaveLength(1);
    await expect(canvas.getByText("Color scheme: Light")).toBeVisible();
    await expect(canvas.getByText("Color scheme: Dark")).toBeVisible();
    await expect(
      canvas.getAllByLabelText("Generated from Global / Base"),
    ).toHaveLength(2);
    await userEvent.click(
      canvas.getByRole("button", { name: "Reset Value, Color scheme: Dark" }),
    );
    await expect(args.onReset).toHaveBeenCalledWith(item.fields[2]);
    canvasElement.dataset.playComplete = "true";
  },
};
export const ReadOnly: Story = {
  name: "Read only reasons",
  args: { editing: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const button of canvas.getAllByRole("button"))
      await expect(button).toBeDisabled();
    await expect(
      canvas.getAllByText("Enter edit mode to reset this field."),
    ).toHaveLength(3);
    canvasElement.dataset.playComplete = "true";
  },
};
export const UnavailableAddress: Story = {
  name: "Unavailable authored reset",
  args: {
    item: {
      ...item,
      fields: [
        { id: "status", key: "Status", before: "Draft", after: "Deprecated" },
      ],
    },
  },
};
export const NarrowDark: Story = {
  name: "Narrow dark",
  decorators: [
    (Story) => (
      <Provider colorScheme="dark">
        <div style={{ width: 280 }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
};
export const NarrowLight: Story = {
  name: "Narrow light",
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
};
