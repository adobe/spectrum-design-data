// Copyright 2026 Adobe. All rights reserved.
import { Button } from "@react-spectrum/s2";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { RULE_DEFAULTS } from "../../features/logic/defaults";
import { createRule, type RoundingRule } from "../../features/logic/model";
import { RuleEditorDialog } from "./RuleEditorDialog";

const spacingRule = RULE_DEFAULTS.find(
  (rule) => rule.id === "rule-spacing-rounding",
) as RoundingRule;

const meta = {
  title: "Components/Rule editor dialog",
  component: RuleEditorDialog,
  parameters: { layout: "padded" },
  args: {
    trigger: <Button variant="secondary">Edit rounding rule</Button>,
    title: "Edit rounding rule",
    createDraft: () => structuredClone(spacingRule),
    onSave: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof RuleEditorDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SpacingLadder: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Edit rounding rule" }),
    );
    const dialog = within(canvasElement.ownerDocument.body);
    await waitFor(async () => {
      await expect(dialog.getByRole("dialog")).toBeVisible();
      await expect(
        dialog.getByText("Spacing › Global: no values change"),
      ).toBeVisible();
    });
  },
};

export const DeferredUntilOpen: Story = {
  name: "Builds the draft only when opened",
  args: { createDraft: fn(() => structuredClone(spacingRule)) },
  play: async ({ args, canvasElement }) => {
    await expect(args.createDraft).not.toHaveBeenCalled();
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Edit rounding rule" }),
    );
    await waitFor(() =>
      expect(
        within(canvasElement.ownerDocument.body).getByRole("dialog"),
      ).toBeVisible(),
    );
    await expect(args.createDraft).toHaveBeenCalled();
  },
};

export const DepthOneHundred: Story = {
  args: {
    createDraft: () => ({
      ...createRule("rounding"),
      name: "Hundredth precision",
      depth: 100,
    }),
    onDelete: undefined,
  },
};

export const NoRounding: Story = {
  args: {
    createDraft: () => ({
      ...createRule("rounding"),
      name: "No rounding",
      defaultOutcome: { factor: 0 },
    }),
    onDelete: undefined,
  },
};
