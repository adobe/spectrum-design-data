// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import type { PaletteColor } from "../../features/color-system/model";
import type { PaletteChannels } from "../../features/color-system/paletteValue";
import { PaletteColorRow } from "./PaletteColorRow";

const color: PaletteColor = {
  id: "brand",
  name: "Brand color",
  lightness: 0.55,
  hue: 260,
  chroma: 70,
};

const meta = {
  title: "Components/Palette color row",
  component: PaletteColorRow,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    color,
    outputGamut: "srgb",
    onRename: fn<(name: string) => string | null>(() => null),
    onChangeValue: fn<(channels: PaletteChannels) => string | null>(() => null),
    onDelete: fn(),
  },
} satisfies Meta<typeof PaletteColorRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const name = canvas.getByRole("textbox", { name: "Palette color name" });
    await userEvent.clear(name);
    await userEvent.type(name, "Primary{Enter}");
    await expect(args.onRename).toHaveBeenCalledWith("Primary");
    await userEvent.click(
      canvas.getByRole("button", { name: "Delete palette color Brand color" }),
    );
    await expect(args.onDelete).toHaveBeenCalled();
  },
};

export const RejectedName: Story = {
  args: {
    onRename: fn<(name: string) => string | null>(
      () => "Another palette color already uses this name.",
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = canvas.getByRole("textbox", { name: "Palette color name" });
    await userEvent.clear(name);
    await userEvent.type(name, "Black{Enter}");
    await expect(
      await canvas.findByText("Another palette color already uses this name."),
    ).toBeVisible();
    await expect(name).toHaveAttribute("aria-invalid", "true");
  },
};

export const UnchangedNameIsNotSubmitted: Story = {
  play: async ({ canvasElement, args }) => {
    const name = within(canvasElement).getByRole("textbox", {
      name: "Palette color name",
    });
    await userEvent.click(name);
    await userEvent.keyboard("{Enter}");
    await expect(args.onRename).not.toHaveBeenCalled();
  },
};

export const UsedByScaleStops: Story = {
  args: { usedByCount: 2 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText("Used by 2 color scale stops.")).toBeNull();
    await userEvent.click(
      canvas.getByRole("button", {
        name: /^Help for palette color Brand color/,
      }),
    );
    const dialog = await within(document.body).findByRole("dialog");
    await waitFor(() =>
      expect(
        within(dialog).getByText("Used by 2 color scale stops."),
      ).toBeVisible(),
    );
    await expect(within(dialog).queryByRole("heading")).toBeNull();
    await userEvent.keyboard("{Escape}");
  },
};

export const SameColorNotice: Story = {
  args: { duplicateOf: "White", usedByCount: 1 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByText(/Same color as White in the output format\./),
    ).toBeNull();
    await userEvent.click(
      canvas.getByRole("button", {
        name: /^Help for palette color Brand color/,
      }),
    );
    const dialog = await within(document.body).findByRole("dialog");
    await waitFor(() =>
      expect(
        within(dialog).getByText(
          "Same color as White in the output format. Used by 1 color scale stop.",
        ),
      ).toBeVisible(),
    );
    await userEvent.keyboard("{Escape}");
  },
};

export const OpensValuePicker: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Edit value of Brand color" }),
    );
    const dialog = await within(document.body).findByRole("dialog", {
      name: "Brand color value",
    });
    await waitFor(() => expect(dialog).toBeVisible());
  },
};

export const ReadOnly: Story = {
  args: { isReadOnly: true, duplicateOf: "White" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Brand color")).toBeVisible();
    await expect(canvas.queryByRole("textbox")).toBeNull();
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};

export const DisplayP3Dark: Story = {
  args: { outputGamut: "display-p3" },
  globals: { colorScheme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
};
