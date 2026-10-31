// Copyright 2026 Adobe. All rights reserved.
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { RULE_DEFAULTS } from "../../features/logic/defaults";
import { createRule } from "../../features/logic/model";
import { NotificationProvider } from "../notifications/NotificationProvider";
import { RuleCard } from "./RuleCard";

const meta = {
  title: "Components/Rule card",
  component: RuleCard,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <NotificationProvider>
        <div style={{ maxWidth: 340 }}>
          <Story />
        </div>
      </NotificationProvider>
    ),
  ],
  args: { rule: RULE_DEFAULTS[0], index: 0 },
} satisfies Meta<typeof RuleCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BuiltIn: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("article", { name: args.rule.name }),
    ).toBeVisible();
    await expect(canvas.getByText("Rounding", { exact: true })).toBeVisible();
    await expect(canvas.getByText("Built-in")).toBeVisible();
    await expect(canvas.queryByText("Depth")).toBeNull();
    await expect(
      canvas.queryByRole("button", { name: /Edit rule/ }),
    ).toBeNull();
  },
};

export const CustomNotUsed: Story = {
  args: {
    rule: {
      ...createRule("rounding"),
      id: "rule-custom-story",
      name: "Custom rounding",
      description: "Hidden on the card.",
      locked: undefined,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Not used")).toBeVisible();
    await expect(canvas.queryByText("Hidden on the card.")).toBeNull();
  },
};

export const Dark: Story = {
  globals: { colorScheme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
};
