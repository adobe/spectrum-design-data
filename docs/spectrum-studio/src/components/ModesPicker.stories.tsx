// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { useState, type ComponentProps } from "react";
import { MODE_SET_DEFAULTS } from "../features/modes/model";
import { ModesPicker } from "./ModesPicker";

const modeSets = structuredClone([...MODE_SET_DEFAULTS]);
const defaults = Object.fromEntries(
  modeSets.map((modeSet) => [modeSet.key, modeSet.defaultModeId]),
);

function ControlledModesPicker(props: ComponentProps<typeof ModesPicker>) {
  const [selected, setSelected] = useState(props.displayedModeIds);
  return (
    <ModesPicker
      {...props}
      displayedModeIds={selected}
      onSelectionChange={(selection) => {
        props.onSelectionChange(selection);
        setSelected((previous) => ({
          ...previous,
          [selection.modeSetKey]: selection.modeId,
        }));
      }}
    />
  );
}

const meta = {
  title: "Components/Modes picker",
  component: ModesPicker,
  parameters: { layout: "padded" },
  args: { modeSets, displayedModeIds: defaults, onSelectionChange: fn() },
  render: (args) => <ControlledModesPicker {...args} />,
} satisfies Meta<typeof ModesPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: /^Modes/ });
    await userEvent.click(trigger);
    await waitFor(() =>
      expect(
        within(body.getByRole("group", { name: "Color scheme" })).getByText(
          "Color scheme",
          { exact: true },
        ),
      ).toBeVisible(),
    );
    await userEvent.click(body.getByRole("option", { name: "Dark" }));
    await expect(body.getByRole("option", { name: "Dark" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(body.getByRole("option", { name: "Light" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    await expect(body.getByRole("option", { name: "Regular" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(args.onSelectionChange).toHaveBeenCalledWith({
      modeSetKey: "colorScheme",
      modeId: "mode-dark",
    });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(body.getByRole("listbox")).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    canvasElement.dataset.playComplete = "true";
  },
};

export const Custom: Story = {
  name: "Custom values",
  args: { displayedModeIds: {} },
};

export const Empty: Story = {
  name: "No selectable modes",
  args: { modeSets: [] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: /^Modes/ }),
    ).toBeDisabled();
  },
};

export const DarkTheme: Story = {
  name: "Dark theme",
  globals: { colorScheme: "dark" },
};

export const Narrow: Story = {
  name: "Narrow viewport",
  parameters: { viewport: { defaultViewport: "narrow" } },
};
