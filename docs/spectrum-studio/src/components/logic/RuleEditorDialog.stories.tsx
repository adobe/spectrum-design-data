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
