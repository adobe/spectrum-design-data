// Copyright 2026 Adobe. All rights reserved.
import { ActionButton } from "@react-spectrum/s2";
import OpenIn from "@react-spectrum/s2/icons/OpenIn";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import { browserStoryTokens } from "../../../tests/fixtures/token-browser";
import {
  TokenDetailsDialog,
  type TokenDetailsDialogProps,
} from "./TokenDetailsDialog";

function ControlledDialog(args: TokenDetailsDialogProps) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <ActionButton
        aria-label="Open token details"
        onPress={() => setOpen(true)}
      >
        <OpenIn />
      </ActionButton>
      {open && (
        <TokenDetailsDialog
          {...args}
          onClose={() => {
            setOpen(false);
            args.onClose();
          }}
        />
      )}
    </>
  );
}
const meta = {
  title: "Panels/Token details",
  component: TokenDetailsDialog,
  render: (args) => <ControlledDialog {...args} />,
  args: {
    tokens: [browserStoryTokens[2]],
    bulk: false,
    isEditing: false,
    modeLabel: "Color scheme: Light / Text size: Default",
    savedIds: new Set(browserStoryTokens.map((token) => token.id)),
    onSave: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof TokenDetailsDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ReadOnly: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(body.getByRole("dialog")).toBeVisible());
    await expect(body.getByRole("textbox", { name: "Name" })).toHaveAttribute(
      "readonly",
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(body.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const Editing: Story = { args: { isEditing: true } };
export const InvalidValue: Story = {
  args: { isEditing: true },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const value = await body.findByRole("textbox", { name: "Value" });
    await userEvent.clear(value);
    await userEvent.type(value, "-1");
    await userEvent.click(
      body.getByRole("dialog").querySelector("button:last-child") ??
        body.getByRole("button", { name: "Save" }),
    );
    await waitFor(() =>
      expect(body.getByRole("alert")).toHaveTextContent("non-negative"),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
export const Bulk: Story = {
  args: {
    isEditing: true,
    bulk: true,
    tokens: browserStoryTokens.filter((token) => token.type === "spacing"),
  },
};
export const MixedTypes: Story = {
  args: { isEditing: true, bulk: true, tokens: browserStoryTokens },
};
export const Deprecation: Story = {
  args: {
    isEditing: true,
    bulk: true,
    tokens: browserStoryTokens.filter((token) => token.type === "spacing"),
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await body.findByRole("button", { name: /Status/ }));
    await userEvent.click(
      await body.findByRole("option", { name: "Deprecated" }),
    );
    await userEvent.click(body.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(body.getByRole("dialog")).toHaveTextContent(
        "3 of 6 saved tokens (50.0%)",
      ),
    );
    canvasElement.dataset.playComplete = "true";
  },
};
