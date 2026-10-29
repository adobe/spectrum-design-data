// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import type { PaletteColor } from "../../features/color-system/model";
import {
  PaletteSwatchPicker,
  type PaletteSwatchPickerProps,
} from "./PaletteSwatchPicker";

const palette: PaletteColor[] = [
  { id: "brand", name: "Brand color", lightness: 0.55, hue: 260, chroma: 70 },
  { id: "black", name: "Black", lightness: 0, hue: 0, chroma: 0 },
  { id: "white", name: "White", lightness: 1, hue: 0, chroma: 0 },
];

function ControlledPicker({
  initialLinkedId,
  onLink,
  onUnlink,
  ...args
}: PaletteSwatchPickerProps & { initialLinkedId?: string }) {
  const [linkedId, setLinkedId] = useState(initialLinkedId);
  return (
    <PaletteSwatchPicker
      {...args}
      linkedId={linkedId}
      onLink={(id) => {
        setLinkedId(id);
        onLink(id);
      }}
      onUnlink={() => {
        setLinkedId(undefined);
        onUnlink();
      }}
    />
  );
}

const meta = {
  title: "Components/Palette swatch picker",
  component: PaletteSwatchPicker,
  parameters: { layout: "padded" },
  args: { palette, outputGamut: "srgb", onLink: fn(), onUnlink: fn() },
  render: (args) => <ControlledPicker {...args} />,
} satisfies Meta<typeof PaletteSwatchPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unlinked: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const swatches = canvas.getByRole("listbox", { name: "Palette colors" });
    await expect(within(swatches).getAllByRole("option")).toHaveLength(3);
    await expect(canvas.queryByText(/Linked to/)).toBeNull();
    await userEvent.click(within(swatches).getAllByRole("option")[0]);
    await expect(args.onLink).toHaveBeenCalledWith("brand");
    await expect(canvas.getByText("Linked to Brand color")).toBeVisible();
  },
};

export const LinkedAndUnlink: Story = {
  render: (args) => <ControlledPicker {...args} initialLinkedId="black" />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Linked to Black")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Unlink" }));
    await expect(args.onUnlink).toHaveBeenCalled();
    await expect(canvas.queryByText(/Linked to/)).toBeNull();
  },
};

export const KeyboardSelection: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const swatches = canvas.getByRole("listbox", { name: "Palette colors" });
    within(swatches).getAllByRole("option")[0].focus();
    await userEvent.keyboard("{ArrowRight}{Enter}");
    await expect(args.onLink).toHaveBeenCalledWith("black");
  },
};

export const SameColorLeftOut: Story = {
  args: {
    palette: [
      ...palette,
      { id: "twin", name: "Pure white", lightness: 1, hue: 0, chroma: 0 },
    ],
  },
  play: async ({ canvasElement }) => {
    const swatches = within(canvasElement).getByRole("listbox", {
      name: "Palette colors",
    });
    await expect(within(swatches).getAllByRole("option")).toHaveLength(3);
  },
};

export const DisplayP3Output: Story = { args: { outputGamut: "display-p3" } };

export const ReadOnlyLinked: Story = {
  render: (args) => (
    <ControlledPicker {...args} initialLinkedId="brand" isReadOnly />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Linked to Brand color")).toBeVisible();
    await expect(canvas.queryByRole("listbox")).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Unlink" })).toBeNull();
  },
};

export const ReadOnlyUnlinked: Story = {
  args: { isReadOnly: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("listbox")).toBeNull();
  },
};

export const EmptyPalette: Story = {
  args: { palette: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("listbox")).toBeNull();
  },
};

export const Dark: Story = {
  globals: { colorScheme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  render: (args) => <ControlledPicker {...args} initialLinkedId="white" />,
};
