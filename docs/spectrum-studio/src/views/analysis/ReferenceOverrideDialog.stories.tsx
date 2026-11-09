// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { DialogContainer } from "@react-spectrum/s2";
import { ReferenceOverrideDialog } from "./ReferenceOverrideDialog";
import "./AnalysisView.css";

const meta = {
  title: "Analysis/Reference override dialog",
  component: ReferenceOverrideDialog,
  args: { count: 3, onApply: fn(), onClose: fn() },
  decorators: [
    (Story) => (
      <DialogContainer onDismiss={() => {}}>
        <Story />
      </DialogContainer>
    ),
  ],
} satisfies Meta<typeof ReferenceOverrideDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(
      body.getByRole("checkbox", {
        name: "Apply design-data value as override",
      }),
    ).not.toBeChecked();
    await expect(
      body.getByRole("button", { name: "Apply overrides" }),
    ).toBeDisabled();
    await expect(body.getAllByRole("checkbox")).toHaveLength(1);
    canvasElement.dataset.playComplete = "true";
  },
};
export const Apply: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      body.getByRole("checkbox", {
        name: "Apply design-data value as override",
      }),
    );
    await expect(
      body.getByRole("button", { name: "Apply overrides" }),
    ).toBeEnabled();
    await userEvent.click(
      body.getByRole("button", { name: "Apply overrides" }),
    );
    await expect(args.onApply).toHaveBeenCalledOnce();
    await expect(args.onClose).toHaveBeenCalledOnce();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Stale: Story = {
  name: "Changed source preserves the dialog",
  args: {
    onApply: fn(() => {
      throw new Error(
        "Source data changed. Reopen Bulk edit before applying overrides.",
      );
    }),
  },
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      body.getByRole("checkbox", {
        name: "Apply design-data value as override",
      }),
    );
    await userEvent.click(
      body.getByRole("button", { name: "Apply overrides" }),
    );
    await expect(body.getByRole("alert")).toHaveTextContent(
      "Source data changed.",
    );
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(body.getByRole("button", { name: "Cancel" })).toBeEnabled();
    canvasElement.dataset.playComplete = "true";
  },
};
export const Dark: Story = {
  globals: { colorScheme: "dark" },
  play: Unchecked.play,
};
